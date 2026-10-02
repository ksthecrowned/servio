import { staffLogout } from "@/app/actions/staff-auth";
import { AutoRefresh } from "@/components/auto-refresh";
import { StaffAlerts } from "@/components/staff/staff-alerts";
import { WaiterBoard } from "@/components/staff/waiter-board";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffSession } from "@/lib/staff-session";
import { planWaiterFloor } from "@/lib/waiter-floor";

const NO_BRANCH = ["00000000-0000-0000-0000-000000000000"];

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
  const scope = branchIds.length > 0 ? branchIds : NO_BRANCH;

  const [{ data: tables }, { data: requests }, { data: readyOrders }, { data: waiters }] = await Promise.all([
    admin
      .from("restaurant_tables")
      .select("id, label, status, assigned_staff_id")
      .in("branch_id", scope),
    admin
      .from("waiter_requests")
      .select("id, type, note, created_at, acknowledged_at, assigned_staff_id, table_id")
      .in("branch_id", scope)
      .is("resolved_at", null)
      .order("created_at"),
    admin
      .from("orders")
      .select(
        "id, order_number, table_sessions!orders_table_session_id_fkey(table_id), order_items(id, item_name, variant_name, quantity)",
      )
      .eq("restaurant_id", session.restaurantId)
      .in("branch_id", scope)
      .eq("status", "ready")
      .order("updated_at"),
    admin
      .from("staff")
      .select("id, name")
      .eq("restaurant_id", session.restaurantId)
      .eq("role", "waiter")
      .eq("is_active", true)
      .order("name"),
  ]);

  const floor = planWaiterFloor({
    staffId: session.staffId,
    tables: tables ?? [],
    requests: requests ?? [],
    readyOrders: (readyOrders ?? []).map((order) => ({
      id: order.id,
      order_number: order.order_number,
      table_id: order.table_sessions?.table_id ?? null,
      items: order.order_items,
    })),
    waiterNames: new Map((waiters ?? []).map((waiter) => [waiter.id, waiter.name])),
  });

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
      <StaffAlerts staffId={session.staffId} alerts={floor.alerts} screenName="Service" />
      <WaiterBoard
        staffId={session.staffId}
        floor={floor}
        colleagues={(waiters ?? []).filter((waiter) => waiter.id !== session.staffId)}
      />
    </div>
  );
}
