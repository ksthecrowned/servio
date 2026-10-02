"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { createAdminClient } from "@/lib/supabase/admin";

const OFFER_TYPES = ["percentage", "flat", "bogo", "combo", "happy_hour"] as const;
type OfferType = (typeof OFFER_TYPES)[number];

function isOfferType(value: string): value is OfferType {
  return (OFFER_TYPES as readonly string[]).includes(value);
}

function nullableNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createOffer(formData: FormData) {
  const restaurant = await requireCurrentRestaurant();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  if (!name || !isOfferType(type)) {
    throw new Error("Invalid offer.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("offers").insert({
    restaurant_id: restaurant.restaurantId,
    name,
    type,
    percentage_value: type === "percentage" ? nullableNumber(formData.get("percentage_value")) : null,
    flat_value: type === "flat" ? nullableNumber(formData.get("flat_value")) : null,
    min_order_value: nullableNumber(formData.get("min_order_value")),
    max_discount_value: nullableNumber(formData.get("max_discount_value")),
    starts_on: String(formData.get("starts_on") ?? "").trim() || null,
    ends_on: String(formData.get("ends_on") ?? "").trim() || null,
    is_active: formData.get("is_active") === "on",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/offers");
}

export async function updateOffer(formData: FormData) {
  const restaurant = await requireCurrentRestaurant();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  if (!id || !name || !isOfferType(type)) {
    throw new Error("Invalid offer.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("offers").update({
    name,
    type,
    percentage_value: type === "percentage" ? nullableNumber(formData.get("percentage_value")) : null,
    flat_value: type === "flat" ? nullableNumber(formData.get("flat_value")) : null,
    min_order_value: nullableNumber(formData.get("min_order_value")),
    max_discount_value: nullableNumber(formData.get("max_discount_value")),
    starts_on: String(formData.get("starts_on") ?? "").trim() || null,
    ends_on: String(formData.get("ends_on") ?? "").trim() || null,
    is_active: formData.get("is_active") === "on",
  }).eq("id", id).eq("restaurant_id", restaurant.restaurantId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/offers");
}
