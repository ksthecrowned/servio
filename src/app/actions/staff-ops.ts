"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/lib/supabase/types";
import { requireStaffSession } from "@/lib/staff-session";
import { userFacingError } from "@/lib/supabase/errors";

const KITCHEN_NEXT_STATUS: Partial<Record<Enums<"order_status">, Enums<"order_status">>> = {
  pending: "accepted",
  accepted: "preparing",
  preparing: "ready",
};

export async function advanceOrderStatus(orderId: string) {
  const session = await requireStaffSession("kitchen");
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, restaurant_id")
    .eq("id", orderId)
    .eq("restaurant_id", session.restaurantId)
    .single();

  if (!order) return;

  const nextStatus = KITCHEN_NEXT_STATUS[order.status];
  if (!nextStatus) return;

  await admin.from("orders").update({ status: nextStatus }).eq("id", orderId);
  await admin.from("order_status_history").insert({
    order_id: orderId,
    status: nextStatus,
    changed_by_staff_id: session.staffId,
  });

  revalidatePath("/staff/kitchen");
}

/**
 * Waiter picks up a ready order and takes it to the table.
 *
 * Kitchen's last step is "ready" — without this the order would sit there
 * forever, since nothing else advances it to "served" (PRD section 22).
 */
export async function markOrderServed(orderId: string) {
  const session = await requireStaffSession("waiter");
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, table_session_id")
    .eq("id", orderId)
    .eq("restaurant_id", session.restaurantId)
    .eq("status", "ready")
    .maybeSingle();

  if (!order) return;

  await admin.from("orders").update({ status: "served" }).eq("id", orderId);
  await admin.from("order_status_history").insert({
    order_id: orderId,
    status: "served",
    changed_by_staff_id: session.staffId,
  });

  // Reflect it on the floor plan: the table is occupied and eating rather
  // than waiting on the kitchen.
  if (order.table_session_id) {
    const { data: tableSession } = await admin
      .from("table_sessions")
      .select("table_id, status")
      .eq("id", order.table_session_id)
      .maybeSingle();

    if (tableSession?.table_id && tableSession.status === "open") {
      await admin
        .from("restaurant_tables")
        .update({ status: "occupied" })
        .eq("id", tableSession.table_id);
    }
  }

  revalidatePath("/staff/waiter");
}

/**
 * Waiter marks a paid table as cleared: "À débarrasser" → "Libre".
 *
 * Only a table that is still waiting to be cleared changes: if guests have
 * scanned its QR in the meantime it is already "Occupée" and stays so.
 */
export async function markTableCleared(tableId: string): Promise<{ error: string | null }> {
  const session = await requireStaffSession("waiter");
  const admin = createAdminClient();

  const { data: table } = await admin
    .from("restaurant_tables")
    .select("id, branch_id, branches!inner(restaurant_id)")
    .eq("id", tableId)
    .eq("branches.restaurant_id", session.restaurantId)
    .maybeSingle();

  if (!table || (session.branchId && table.branch_id !== session.branchId)) {
    return { error: "Table introuvable." };
  }

  const { data: cleared, error } = await admin
    .from("restaurant_tables")
    .update({ status: "available" })
    .eq("id", tableId)
    .eq("status", "cleaning")
    .select("id");

  revalidatePath("/staff/waiter");
  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez.") };
  if (!cleared || cleared.length === 0) return { error: "Cette table n’est plus à débarrasser." };
  return { error: null };
}

type OwnedRequest = {
  id: string;
  branch_id: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
  assigned_staff_id: string | null;
};

async function loadOwnedRequest(
  admin: ReturnType<typeof createAdminClient>,
  session: { restaurantId: string; branchId: string | null },
  requestId: string,
): Promise<OwnedRequest | null> {
  const { data } = await admin
    .from("waiter_requests")
    .select("id, branch_id, resolved_at, acknowledged_at, assigned_staff_id, branches!inner(restaurant_id)")
    .eq("id", requestId)
    .maybeSingle();

  if (!data) return null;

  const restaurantId = (data.branches as unknown as { restaurant_id: string }).restaurant_id;
  if (restaurantId !== session.restaurantId) return null;
  if (session.branchId && data.branch_id !== session.branchId) return null;

  return {
    id: data.id,
    branch_id: data.branch_id,
    resolved_at: data.resolved_at,
    acknowledged_at: data.acknowledged_at,
    assigned_staff_id: data.assigned_staff_id,
  };
}

export async function claimWaiterRequest(requestId: string): Promise<{ error: string | null }> {
  const session = await requireStaffSession("waiter");
  const admin = createAdminClient();
  const request = await loadOwnedRequest(admin, session, requestId);

  if (!request || request.resolved_at) return { error: "Cette demande n’est plus ouverte." };
  if (request.assigned_staff_id && request.assigned_staff_id !== session.staffId) {
    return { error: "Un autre serveur a déjà pris cette demande." };
  }

  const { error } = await admin
    .from("waiter_requests")
    .update({
      acknowledged_at: request.acknowledged_at ?? new Date().toISOString(),
      assigned_staff_id: session.staffId,
    })
    .eq("id", requestId)
    .is("resolved_at", null);

  revalidatePath("/staff/waiter");
  return { error: error?.message ?? null };
}

export async function resolveWaiterRequest(requestId: string): Promise<{ error: string | null }> {
  const session = await requireStaffSession("waiter");
  const admin = createAdminClient();
  const request = await loadOwnedRequest(admin, session, requestId);

  if (!request || request.resolved_at) return { error: "Cette demande n’est plus ouverte." };
  if (request.assigned_staff_id && request.assigned_staff_id !== session.staffId) {
    return { error: "Cette demande est tenue par un autre serveur." };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("waiter_requests")
    .update({
      acknowledged_at: request.acknowledged_at ?? now,
      assigned_staff_id: request.assigned_staff_id ?? session.staffId,
      resolved_at: now,
      resolved_by_staff_id: session.staffId,
    })
    .eq("id", requestId)
    .is("resolved_at", null);

  revalidatePath("/staff/waiter");
  return { error: error?.message ?? null };
}

export async function transferWaiterRequest(
  requestId: string,
  targetStaffId: string,
): Promise<{ error: string | null }> {
  const session = await requireStaffSession("waiter");
  const admin = createAdminClient();
  const request = await loadOwnedRequest(admin, session, requestId);

  if (!request || request.resolved_at) return { error: "Cette demande n’est plus ouverte." };
  if (request.assigned_staff_id !== session.staffId) {
    return { error: "Prenez d’abord la demande en charge." };
  }
  if (targetStaffId === session.staffId) return { error: "Choisissez un autre serveur." };

  const { data: target } = await admin
    .from("staff")
    .select("id, branch_id")
    .eq("id", targetStaffId)
    .eq("restaurant_id", session.restaurantId)
    .eq("role", "waiter")
    .eq("is_active", true)
    .maybeSingle();

  if (!target) return { error: "Serveur introuvable." };
  if (session.branchId && target.branch_id && target.branch_id !== session.branchId) {
    return { error: "Ce serveur n’est pas sur cette salle." };
  }

  const { error } = await admin
    .from("waiter_requests")
    .update({
      assigned_staff_id: targetStaffId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("assigned_staff_id", session.staffId)
    .is("resolved_at", null);

  revalidatePath("/staff/waiter");
  return { error: error?.message ?? null };
}

/**
 * Cashier records payment. The `mark_bill_paid` database function does it
 * in one transaction: charges what the session actually ordered, records
 * the payment once (a double click gets "already paid"), completes the
 * session's orders, closes the session and frees the table.
 */
export async function markBillPaid(billId: string): Promise<{ error: string | null }> {
  const session = await requireStaffSession("cashier");
  const admin = createAdminClient();

  const { error } = await admin.rpc("mark_bill_paid", {
    p_bill_id: billId,
    p_restaurant_id: session.restaurantId,
    p_staff_id: session.staffId,
    // Cash only for now; mark_bill_paid also accepts mobile_money and card
    // for when a payment provider is connected.
    p_method: "cash",
    p_branch_id: session.branchId ?? undefined,
  });

  revalidatePath("/staff/cashier");
  return { error: error ? userFacingError(error, "Impossible d’enregistrer le paiement. Réessayez.") : null };
}
