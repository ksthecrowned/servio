"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentRestaurant } from "@/lib/restaurant";
import { requireStaffSession } from "@/lib/staff-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFacingError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Cancelling an order goes through the cancel_order database function
 * (status, reason, history, coupon use given back, bill re-totalled, table
 * status) in one transaction. Each entry point checks who is asking.
 */

export type CancelResult = { error: string | null };

const FALLBACK = "Impossible d’annuler la commande. Réessayez.";

/** The guest who placed the order (holds its tracking link), before the kitchen accepts it. */
export async function cancelOrderAsGuest(
  orderId: string,
  restaurantSlug: string,
  branchSlug: string,
): Promise<CancelResult> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, restaurant_id, restaurants!inner(slug), branches!orders_branch_id_fkey!inner(slug)")
    .eq("id", orderId)
    .eq("restaurants.slug", restaurantSlug)
    .eq("branches.slug", branchSlug)
    .maybeSingle();

  if (!order) return { error: "Commande introuvable." };

  const { error } = await admin.rpc("cancel_order", {
    p_order_id: orderId,
    p_restaurant_id: order.restaurant_id,
    p_reason: "Annulée par le client",
    p_only_pending: true,
  });

  revalidatePath(`/menu/${restaurantSlug}/${branchSlug}/order/${orderId}`);
  return { error: error ? userFacingError(error, FALLBACK) : null };
}

/** Kitchen refuses an order it can't make (dish sold out…). */
export async function cancelOrderAsKitchen(orderId: string, reason: string): Promise<CancelResult> {
  const session = await requireStaffSession("kitchen");
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, branch_id")
    .eq("id", orderId)
    .eq("restaurant_id", session.restaurantId)
    .maybeSingle();

  if (!order || (session.branchId && order.branch_id !== session.branchId)) {
    return { error: "Commande introuvable." };
  }

  const { error } = await admin.rpc("cancel_order", {
    p_order_id: orderId,
    p_restaurant_id: session.restaurantId,
    p_reason: reason,
    p_staff_id: session.staffId,
  });

  revalidatePath("/staff/kitchen");
  return { error: error ? userFacingError(error, FALLBACK) : null };
}

/** Owner or manager, from the dashboard. */
export async function cancelOrderAsOwner(orderId: string, reason: string): Promise<CancelResult> {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await createAdminClient().rpc("cancel_order", {
    p_order_id: orderId,
    p_restaurant_id: restaurant.restaurantId,
    p_reason: reason,
    p_user_id: user?.id,
  });

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { error: error ? userFacingError(error, FALLBACK) : null };
}
