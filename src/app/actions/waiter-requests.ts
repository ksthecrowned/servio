"use server";

import { clientIp } from "@/lib/client-ip";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFacingError } from "@/lib/supabase/errors";

const VALID_TYPES = ["call_waiter", "water", "cutlery", "bill", "other"] as const;
type WaiterRequestType = (typeof VALID_TYPES)[number];

function isWaiterRequestType(value: string): value is WaiterRequestType {
  return (VALID_TYPES as readonly string[]).includes(value);
}

export async function requestWaiterAssistance(
  branchId: string,
  tableId: string,
  type: string,
  note?: string,
): Promise<{ error: string | null }> {
  if (!isWaiterRequestType(type)) {
    return { error: "Type de demande invalide." };
  }

  const admin = createAdminClient();

  const { data: table } = await admin
    .from("restaurant_tables")
    .select("id, branches(restaurant_id)")
    .eq("id", tableId)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (!table) {
    return { error: "Table introuvable." };
  }

  const cleanNote = note?.trim() ? note.trim().slice(0, 500) : null;

  // The same request already waiting: don't ring the staff twice.
  let duplicate = admin
    .from("waiter_requests")
    .select("id")
    .eq("table_id", tableId)
    .eq("type", type)
    .is("resolved_at", null)
    .limit(1);
  duplicate = cleanNote === null ? duplicate.is("note", null) : duplicate.eq("note", cleanNote);
  const { data: existing } = await duplicate;
  if (existing && existing.length > 0) {
    return { error: "Cette demande est déjà en cours." };
  }

  // Rate limit (per table and per device), given back if the insert fails.
  const { data: attemptId, error: limitError } = await admin.rpc("begin_guest_action", {
    p_table_id: tableId,
    p_ip: await clientIp(),
    p_action: "request",
  });
  if (limitError || !attemptId) {
    return { error: userFacingError(limitError, "Impossible d’envoyer la demande. Réessayez.") };
  }

  const { error } = await admin.from("waiter_requests").insert({
    branch_id: branchId,
    table_id: tableId,
    type,
    note: cleanNote,
  });

  if (error) {
    await admin.rpc("cancel_guest_action", { p_id: attemptId });
    return { error: userFacingError(error, "Impossible d’envoyer la demande. Réessayez.") };
  }

  if (type === "bill") {
    await admin.from("restaurant_tables").update({ status: "bill_requested" }).eq("id", tableId);
    await raiseBillForTable(admin, branchId, tableId, (table.branches as unknown as { restaurant_id: string }).restaurant_id);
  }

  return { error: null };
}

export type TableRequest = {
  id: string;
  type: string;
  note: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
};

export async function listTableRequests(branchId: string, tableId: string): Promise<TableRequest[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("waiter_requests")
    .select("id, type, note, created_at, acknowledged_at, resolved_at")
    .eq("branch_id", branchId)
    .eq("table_id", tableId)
    .order("created_at", { ascending: false })
    .limit(30);

  return data ?? [];
}

async function raiseBillForTable(
  admin: ReturnType<typeof createAdminClient>,
  branchId: string,
  tableId: string,
  restaurantId: string,
) {
  // Any active session: a second bill request (or one made after ordering
  // again) must still refresh the bill.
  const { data: session } = await admin
    .from("table_sessions")
    .select("id")
    .eq("table_id", tableId)
    .neq("status", "closed")
    .maybeSingle();

  if (!session) return;

  const { data: orders } = await admin
    .from("orders")
    .select("total_amount")
    .eq("table_session_id", session.id)
    .neq("status", "cancelled");

  const totalAmount = (orders ?? []).reduce((sum, o) => sum + o.total_amount, 0);

  const { data: existingBill } = await admin
    .from("bills")
    .select("id")
    .eq("table_session_id", session.id)
    .neq("status", "paid")
    .maybeSingle();

  if (existingBill) {
    await admin
      .from("bills")
      .update({ status: "requested", total_amount: totalAmount })
      .eq("id", existingBill.id);
  } else {
    await admin.from("bills").insert({
      restaurant_id: restaurantId,
      branch_id: branchId,
      table_session_id: session.id,
      status: "requested",
      total_amount: totalAmount,
    });
  }

  await admin.from("table_sessions").update({ status: "bill_requested" }).eq("id", session.id);
}
