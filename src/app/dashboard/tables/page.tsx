import { AutoRefresh } from "@/components/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddTableForm } from "@/components/dashboard/add-table-form";
import { TableWaiterSelect } from "@/components/dashboard/table-waiter-select";
import { TABLE_STATUS_LABEL } from "@/lib/labels";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

const STATUS_VARIANT: Record<string, "default" | "brand" | "secondary" | "destructive" | "outline"> = {
  available: "secondary",
  occupied: "default",
  order_pending: "brand",
  preparing: "default",
  ready: "default",
  bill_requested: "destructive",
  cleaning: "outline",
};

export default async function TablesPage() {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("restaurant_id", restaurant.restaurantId)
    .order("name");

  const [{ data: tables }, { data: waiters }] = await Promise.all([
    supabase
      .from("restaurant_tables")
      .select("id, label, status, assigned_staff_id, branch_id, branches!inner(id, name, restaurant_id)")
      .eq("branches.restaurant_id", restaurant.restaurantId)
      .order("label"),
    supabase
      .from("staff")
      .select("id, name, branch_id")
      .eq("restaurant_id", restaurant.restaurantId)
      .eq("role", "waiter")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={8000} />
      <div>
        <h1 className="text-2xl font-semibold">Tables</h1>
        <p className="text-muted-foreground">
          Gérez les tables de vos succursales et leur serveur attitré : il reçoit en priorité les
          demandes et les commandes prêtes de ses tables. Une table sans serveur attitré alerte toute
          l’équipe de salle.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une table</CardTitle>
        </CardHeader>
        <CardContent>
          {branches && branches.length > 0 ? (
            <AddTableForm branches={branches} />
          ) : (
            <p className="text-sm text-muted-foreground">Créez d’abord une succursale.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(tables ?? []).map((table) => (
          <Card key={table.id}>
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{table.label}</p>
                  <p className="text-xs text-muted-foreground">{table.branches.name}</p>
                </div>
                <Badge variant={STATUS_VARIANT[table.status] ?? "secondary"}>
                  {TABLE_STATUS_LABEL[table.status]}
                </Badge>
              </div>
              <TableWaiterSelect
                tableId={table.id}
                tableLabel={table.label}
                assignedStaffId={table.assigned_staff_id}
                waiters={(waiters ?? []).filter(
                  (waiter) => waiter.branch_id === null || waiter.branch_id === table.branch_id,
                )}
              />
            </CardContent>
          </Card>
        ))}
        {(!tables || tables.length === 0) && (
          <p className="text-sm text-muted-foreground">Aucune table pour l’instant.</p>
        )}
      </div>
    </div>
  );
}
