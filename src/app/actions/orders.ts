"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { userFacingError } from "@/lib/supabase/errors";
import type { Enums } from "@/lib/supabase/types";

export type PlaceOrderLine = {
  itemId: string;
  variantId: string | null;
  addonIds: string[];
  quantity: number;
  specialInstructions: string;
};

export type PlaceOrderInput = {
  restaurantSlug: string;
  branchSlug: string;
  tableId?: string;
  lines: PlaceOrderLine[];
  couponCode?: string;
  customerName?: string;
  customerPhone?: string;
};

export type PlaceOrderResult = { orderId: string; orderNumber: number } | { error: string };

/**
 * Places a customer order. The client cart only drives the UI: prices,
 * coupon and totals are all resolved inside the `place_order` database
 * function, in one transaction, so a tampered request cannot change what
 * the restaurant gets paid and a failure leaves nothing half-written.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!input.lines || input.lines.length === 0) {
    return { error: "Votre panier est vide." };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .rpc("place_order", {
      p_restaurant_slug: input.restaurantSlug,
      p_branch_slug: input.branchSlug,
      p_lines: input.lines.map((line) => ({
        item_id: line.itemId,
        variant_id: line.variantId,
        addon_ids: line.addonIds,
        quantity: line.quantity,
        special_instructions: line.specialInstructions,
      })),
      p_table_id: input.tableId,
      p_coupon_code: input.couponCode,
      p_customer_name: input.customerName,
      p_customer_phone: input.customerPhone,
    })
    .single();

  if (error || !data) {
    return { error: userFacingError(error, "Impossible d’envoyer la commande. Réessayez.") };
  }

  return { orderId: data.order_id, orderNumber: data.order_number };
}

export type TableOrder = {
  id: string;
  order_number: number;
  status: Enums<"order_status">;
  total_amount: number;
  created_at: string;
};

/**
 * Orders of the table's current session, so guests can get back to their
 * order tracking from the table menu. Scoped to the active session: guests
 * at the next sitting don't see the previous table's orders.
 */
export async function listTableOrders(branchId: string, tableId: string): Promise<TableOrder[]> {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("table_sessions")
    .select("id")
    .eq("table_id", tableId)
    .eq("branch_id", branchId)
    .neq("status", "closed")
    .maybeSingle();

  if (!session) return [];

  const { data } = await admin
    .from("orders")
    .select("id, order_number, status, total_amount, created_at")
    .eq("table_session_id", session.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
