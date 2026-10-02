import { staffLogout } from "@/app/actions/staff-auth";
import { AutoRefresh } from "@/components/auto-refresh";
import { WaiterBoard, type OpenServiceRequest } from "@/components/staff/waiter-board";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffSession } from "@/lib/staff-session";

export default async function WaiterPage() {
  const session = await requireStaffSession("waiter");
  const admin = createAdminClient();

  const { data: branches } = await admin
    .from("branches")
    .select("id")
    .eq("restaurant_id", session.restaurantId);

  const branchIds = session.branchId
    ? [session.branchId]
    : (branches ?? []).map((branch) => branch.id);

  const [{ data: tables }, { data: requests }, { data: waiters }] = await Promise.all([
    admin
      .from("restaurant_tables")
      .select("id, label, status")
      .in("branch_id", branchIds.length > 0 ? branchIds : ["00000000-0000-0000-0000-000000000000"])
      .order("label"),
    admin
      .from("waiter_requests")
      .select("id, type, note, created_at, acknowledged_at, assigned_staff_id, table_id, restaurant_tables!waiter_requests_table_id_fkey(label)")
      .in("branch_id", branchIds.length > 0 ? branchIds : ["00000000-0000-0000-0000-000000000000"])
      .is("resolved_at", null)
      .order("created_at"),
    admin
      .from("staff")
      .select("id, name")
      .eq("restaurant_id", session.restaurantId)
      .eq("role", "waiter")
      .eq("is_active", true)
      .order("name"),
  ]);

  const names = new Map((waiters ?? []).map((waiter) => [waiter.id, waiter.name]));
  const openRequests: OpenServiceRequest[] = (requests ?? []).map((request) => ({
    id: request.id,
    type: request.type,
    note: request.note,
    created_at: request.created_at,
    acknowledged_at: request.acknowledged_at,
    assigned_staff_id: request.assigned_staff_id,
    assigneeName: request.assigned_staff_id ? (names.get(request.assigned_staff_id) ?? null) : null,
    tableLabel: (request.restaurant_tables as unknown as { label: string } | null)?.label ?? "—",
  }));

  const counts = new Map<string, number>();
  for (const request of requests ?? []) {
    counts.set(request.table_id, (counts.get(request.table_id) ?? 0) + 1);
  }

  const floor = (tables ?? [])
    .map((table) => ({
      id: table.id,
      label: table.label,
      status: table.status,
      openCount: counts.get(table.id) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 bg-muted/20 p-4 sm:p-6">
      <AutoRefresh intervalMs={4000} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service</h1>
          <p className="text-muted-foreground">{session.name}</p>
        </div>
        <form action={staffLogout}>
          <Button type="submit" variant="outline">
            Quitter
          </Button>
        </form>
      </div>
      <WaiterBoard
        staffId={session.staffId}
        tables={floor}
        requests={openRequests}
        colleagues={(waiters ?? []).filter((waiter) => waiter.id !== session.staffId)}
      />
    </div>
  );
}
