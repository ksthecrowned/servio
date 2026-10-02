import { AutoRefresh } from "@/components/auto-refresh";
import { KitchenOrderCard } from "@/components/staff/kitchen-order-card";
import { StaffAlerts } from "@/components/staff/staff-alerts";
import type { StaffAlert } from "@/lib/staff-alerts";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffSession } from "@/lib/staff-session";
import { staffLogout } from "@/app/actions/staff-auth";

export default async function KitchenPage() {
  const session = await requireStaffSession("kitchen");
  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select(
      "id, order_number, status, order_items(id, item_name, quantity), table_sessions!orders_table_session_id_fkey(restaurant_tables!table_sessions_table_id_fkey(label))",
    )
    .eq("restaurant_id", session.restaurantId)
    .in("status", ["pending", "accepted", "preparing"])
    .order("created_at");

  if (session.branchId) {
    query = query.eq("branch_id", session.branchId);
  }

  const { data: orders } = await query;

  const tableLabelOf = (order: NonNullable<typeof orders>[number]) =>
    (order.table_sessions as unknown as { restaurant_tables: { label: string } } | null)?.restaurant_tables.label ??
    null;

  // New orders waiting to be accepted ring the kitchen (3 beeps).
  const alerts: StaffAlert[] = (orders ?? [])
    .filter((order) => order.status === "pending")
    .map((order) => {
      const label = tableLabelOf(order);
      return {
        key: `order:${order.id}`,
        kind: "new_order",
        title: `Nouvelle commande — ${label ? `Table ${label}` : `n° ${order.order_number}`}`,
        body: order.order_items.map((item) => `${item.item_name} × ${item.quantity}`).join(", "),
      };
    });

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-muted/20 p-6">
      <AutoRefresh intervalMs={3000} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cuisine</h1>
          <p className="text-muted-foreground">{session.name}</p>
        </div>
        <form action={staffLogout}>
          <Button type="submit" variant="outline">
            Quitter
          </Button>
        </form>
      </div>

      <StaffAlerts staffId={session.staffId} alerts={alerts} screenName="Cuisine" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(orders ?? []).map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={{
              id: order.id,
              order_number: order.order_number,
              status: order.status,
              order_items: order.order_items,
              tableLabel: tableLabelOf(order),
            }}
          />
        ))}
        {(!orders || orders.length === 0) && (
          <p className="text-sm text-muted-foreground">Aucune commande en cours. Les nouvelles commandes s’afficheront ici aussitôt.</p>
        )}
      </div>
    </div>
  );
}
