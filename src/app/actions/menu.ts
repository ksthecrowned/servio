"use server";

import { revalidatePath } from "next/cache";

import { formValues, type FormValues } from "@/lib/form-values";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { userFacingError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

const ITEM_FIELDS = [
  "categoryId",
  "name",
  "description",
  "basePrice",
  "isVeg",
  "isBestseller",
  "isAvailable",
] as const;

export type MenuActionState = {
  error: string | null;
  /** Bumped on each successful save so the form can reset client-only state. */
  savedAt?: number;
  /** What was typed, sent back on error so the form keeps it. */
  values?: FormValues<(typeof ITEM_FIELDS)[number]>;
};

export async function addMenuCategory(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const values = formValues(formData, ["name"]);
  if (!name) return { error: "Indiquez le nom de la catégorie.", values };

  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const { error } = await supabase
    .from("menu_categories")
    .insert({ restaurant_id: restaurant.restaurantId, name });

  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez."), values };

  revalidatePath("/dashboard/menu");
  return { error: null };
}

export async function addMenuItem(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const basePrice = Number(formData.get("basePrice"));
  const isVeg = formData.get("isVeg") === "on";
  const isBestseller = formData.get("isBestseller") === "on";
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const values = formValues(formData, ITEM_FIELDS);

  if (!categoryId || !name || Number.isNaN(basePrice)) {
    return { error: "La catégorie, le nom et le prix sont obligatoires.", values };
  }

  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("restaurant_id", restaurant.restaurantId)
    .maybeSingle();

  if (!category) return { error: "Catégorie introuvable.", values };

  const { error } = await supabase.from("menu_items").insert({
    restaurant_id: restaurant.restaurantId,
    category_id: categoryId,
    name,
    description,
    base_price: basePrice,
    is_veg: isVeg,
    is_bestseller: isBestseller,
    image_url: imageUrl,
  });

  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez."), values };

  revalidatePath("/dashboard/menu");
  return { error: null, savedAt: Date.now() };
}

export async function updateMenuItem(
  _prevState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const itemId = String(formData.get("itemId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const basePrice = Number(formData.get("basePrice"));
  const isVeg = formData.get("isVeg") === "on";
  const isBestseller = formData.get("isBestseller") === "on";
  const isAvailable = formData.get("isAvailable") === "on";
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const values = formValues(formData, ITEM_FIELDS);

  if (!itemId || !categoryId || !name || Number.isNaN(basePrice) || basePrice < 0) {
    return { error: "La catégorie, le nom et un prix valide sont obligatoires.", values };
  }

  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("restaurant_id", restaurant.restaurantId)
    .maybeSingle();

  if (!category) return { error: "Catégorie introuvable.", values };

  const { error } = await supabase
    .from("menu_items")
    .update({
      category_id: categoryId,
      name,
      description,
      base_price: basePrice,
      is_veg: isVeg,
      is_bestseller: isBestseller,
      is_available: isAvailable,
      image_url: imageUrl,
    })
    .eq("id", itemId)
    .eq("restaurant_id", restaurant.restaurantId);

  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez."), values };

  revalidatePath("/dashboard/menu");
  return { error: null, savedAt: Date.now() };
}

export async function toggleMenuItemAvailability(itemId: string, isAvailable: boolean) {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();
  await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId)
    .eq("restaurant_id", restaurant.restaurantId);
  revalidatePath("/dashboard/menu");
}
