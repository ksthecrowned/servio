"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentRestaurant } from "@/lib/restaurant";
import { userFacingError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type OfferActionState = { error: string | null; savedAt?: number };

const OFFER_TYPES = ["percentage", "flat", "bogo", "combo", "happy_hour"] as const;
type OfferType = (typeof OFFER_TYPES)[number];

/**
 * Types place_order can actually price. The others exist in the schema but
 * have no pricing rules yet, so new offers are limited to these two.
 */
const ORDERABLE_TYPES: readonly OfferType[] = ["percentage", "flat"];

function isOfferType(value: string): value is OfferType {
  return (OFFER_TYPES as readonly string[]).includes(value);
}

function nullableNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readOffer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  if (!name) return { ok: false, error: "Donnez un nom à l’offre." } as const;
  if (!isOfferType(type)) return { ok: false, error: "Type d’offre invalide." } as const;

  const percentageValue = type === "percentage" ? nullableNumber(formData.get("percentage_value")) : null;
  const flatValue = type === "flat" ? nullableNumber(formData.get("flat_value")) : null;
  const minOrderValue = nullableNumber(formData.get("min_order_value"));
  const maxDiscountValue = nullableNumber(formData.get("max_discount_value"));
  const startsOn = String(formData.get("starts_on") ?? "").trim() || null;
  const endsOn = String(formData.get("ends_on") ?? "").trim() || null;

  if (type === "percentage" && (percentageValue === null || percentageValue <= 0 || percentageValue > 100)) {
    return { ok: false, error: "Indiquez un pourcentage entre 0 et 100." } as const;
  }
  if (type === "flat" && (flatValue === null || flatValue <= 0)) {
    return { ok: false, error: "Indiquez un montant de réduction en FCFA." } as const;
  }
  if ((minOrderValue !== null && minOrderValue < 0) || (maxDiscountValue !== null && maxDiscountValue < 0)) {
    return { ok: false, error: "Les montants ne peuvent pas être négatifs." } as const;
  }
  if (startsOn && endsOn && endsOn < startsOn) {
    return { ok: false, error: "La date de fin doit suivre la date de début." } as const;
  }

  return {
    ok: true,
    values: {
      name,
      type,
      percentage_value: percentageValue,
      flat_value: flatValue,
      min_order_value: minOrderValue,
      max_discount_value: maxDiscountValue,
      starts_on: startsOn,
      ends_on: endsOn,
      is_active: formData.get("is_active") === "on",
    },
  } as const;
}

export async function createOffer(
  _prevState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const restaurant = await requireCurrentRestaurant();
  const parsed = readOffer(formData);
  if (!parsed.ok) return { error: parsed.error };
  if (!ORDERABLE_TYPES.includes(parsed.values.type)) {
    return { error: "Seules les réductions en pourcentage ou en montant fixe sont disponibles pour l’instant." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("offers")
    .insert({ restaurant_id: restaurant.restaurantId, ...parsed.values });

  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez.") };
  revalidatePath("/dashboard/offers");
  return { error: null, savedAt: Date.now() };
}

export async function updateOffer(
  _prevState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const restaurant = await requireCurrentRestaurant();
  const id = String(formData.get("id") ?? "");
  const parsed = readOffer(formData);
  if (!id) return { error: "Offre introuvable." };
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("offers")
    .update(parsed.values)
    .eq("id", id)
    .eq("restaurant_id", restaurant.restaurantId);

  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez.") };
  revalidatePath("/dashboard/offers");
  return { error: null, savedAt: Date.now() };
}

/** Letters, digits, - and _: easy to type on a phone keyboard. */
const COUPON_CODE = /^[A-Z0-9_-]{3,20}$/;

/**
 * Coupons are what guests type at checkout; each points at one offer.
 * Codes are stored upper-case because place_order upper-cases what the
 * guest typed.
 */
export async function createCoupon(
  offerId: string,
  _prevState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const restaurant = await requireCurrentRestaurant();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const usageLimit = nullableNumber(formData.get("usage_limit"));

  if (!COUPON_CODE.test(code)) {
    return { error: "Le code doit faire 3 à 20 caractères : lettres, chiffres, - ou _." };
  }
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
    return { error: "La limite d’utilisation doit être un nombre entier positif." };
  }

  const supabase = await createClient();
  const { data: offer } = await supabase
    .from("offers")
    .select("id")
    .eq("id", offerId)
    .eq("restaurant_id", restaurant.restaurantId)
    .maybeSingle();
  if (!offer) return { error: "Offre introuvable." };

  const { error } = await supabase.from("coupons").insert({
    restaurant_id: restaurant.restaurantId,
    offer_id: offerId,
    code,
    usage_limit: usageLimit,
  });

  if (error?.code === "23505") return { error: `Le code ${code} existe déjà.` };
  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez.") };
  revalidatePath("/dashboard/offers");
  return { error: null, savedAt: Date.now() };
}

export async function setCouponActive(couponId: string, isActive: boolean): Promise<OfferActionState> {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", couponId)
    .eq("restaurant_id", restaurant.restaurantId);

  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez.") };
  revalidatePath("/dashboard/offers");
  return { error: null };
}
