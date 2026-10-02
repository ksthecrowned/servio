import { AutoRefresh } from "@/components/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/currency";
import { ORDER_STATUS_LABEL } from "@/lib/labels";

export default async function OrdersPage() {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, created_at, branches!orders_branch_id_fkey(name)")
    .eq("restaurant_id", restaurant.restaurantId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={5000} />
      <div>
        <h1 className="text-2xl font-semibold">Commandes</h1>
        <p className="text-muted-foreground">Commandes en cours et récentes, toutes succursales confondues.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commandes récentes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(orders ?? []).map((order) => (
            <div key={order.id} className="flex items-center justify-between border-b py-2 last:border-0">
              <div>
                <p className="font-medium">Commande n° {order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {(order.branches as unknown as { name: string } | null)?.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatCurrency(order.total_amount)}</span>
                <Badge>{ORDER_STATUS_LABEL[order.status]}</Badge>
              </div>
            </div>
          ))}
          {(!orders || orders.length === 0) && (
            <p className="text-sm text-muted-foreground">
              Aucune commande pour l’instant. Les commandes passées depuis le menu QR apparaîtront ici
              en temps réel.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
