"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

function rating(value: FormDataEntryValue | null) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export async function submitFeedback(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "").trim();
  const restaurantSlug = String(formData.get("restaurantSlug") ?? "").trim();
  const branchSlug = String(formData.get("branchSlug") ?? "").trim();
  const foodRating = rating(formData.get("food_rating"));
  const serviceRating = rating(formData.get("service_rating"));
  const experienceRating = rating(formData.get("experience_rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);

  if (!orderId || !restaurantSlug || !branchSlug || !foodRating || !serviceRating || !experienceRating) {
    return { error: "Veuillez attribuer une note de 1 à 5 pour chaque catégorie." };
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, restaurant_id, restaurants!inner(slug), branches!inner(slug)")
    .eq("id", orderId)
    .eq("restaurants.slug", restaurantSlug)
    .eq("branches.slug", branchSlug)
    .maybeSingle();

  if (!order) return { error: "Commande introuvable." };
  if (!["served", "completed"].includes(order.status)) {
    return { error: "Vous pourrez donner votre avis une fois la commande servie." };
  }

  const { data: existing } = await admin.from("feedback").select("id").eq("order_id", orderId).maybeSingle();
  if (existing) return { error: "Un avis a déjà été envoyé pour cette commande." };

  const { error } = await admin.from("feedback").insert({
    restaurant_id: order.restaurant_id,
    order_id: orderId,
    food_rating: foodRating,
    service_rating: serviceRating,
    experience_rating: experienceRating,
    comment: comment || null,
  });

  if (error) return { error: "Impossible d'enregistrer votre avis." };

  revalidatePath("/menu/[restaurant]/[branch]/order/[orderId]");
  return { success: true };
}
