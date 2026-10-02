import { createAdminClient } from "@/lib/supabase/admin";

/** Opens a table session on QR scan, or reuses the one already open. */
export async function ensureOpenTableSession(branchId: string, tableId: string) {
  const admin = createAdminClient();

  const { data: table } = await admin
    .from("restaurant_tables")
    .select("id, status")
    .eq("id", tableId)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (!table) return null;

  const existing = await findActiveSession(admin, tableId);
  const session = existing ?? (await openSession(admin, branchId, tableId));
  if (!session) return null;

  if (table.status === "available" || table.status === "cleaning") {
    await admin.from("restaurant_tables").update({ status: "occupied" }).eq("id", tableId);
  }

  return { openedAt: session.opened_at as string };
}

async function findActiveSession(
  admin: ReturnType<typeof createAdminClient>,
  tableId: string,
) {
  const { data } = await admin
    .from("table_sessions")
    .select("id, opened_at")
    .eq("table_id", tableId)
    .neq("status", "closed")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

async function openSession(
  admin: ReturnType<typeof createAdminClient>,
  branchId: string,
  tableId: string,
) {
  const { data, error } = await admin
    .from("table_sessions")
    .insert({ table_id: tableId, branch_id: branchId, status: "open" })
    .select("id, opened_at")
    .single();

  if (!error && data) return data;

  return findActiveSession(admin, tableId);
}
