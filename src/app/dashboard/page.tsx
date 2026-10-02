import { AutoRefresh } from "@/components/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { loadPlanAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/currency";
import { ORDER_STATUS_LABEL } from "@/lib/labels";

export default async function DashboardOverviewPage() {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: pendingOrders },
    { count: activeTables },
    { data: todayOrders },
    { data: recentOrders },
    access,
  ] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.restaurantId)
        .in("status", ["pending", "accepted", "preparing"]),
      supabase
        .from("restaurant_tables")
        .select("id, branches!inner(restaurant_id)", { count: "exact", head: true })
        .eq("branches.restaurant_id", restaurant.restaurantId)
        .neq("status", "available"),
      supabase
        .from("orders")
        .select("total_amount, status")
        .eq("restaurant_id", restaurant.restaurantId)
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("orders")
        .select("id, order_number, status, total_amount, order_items(item_name, quantity)")
        .eq("restaurant_id", restaurant.restaurantId)
        .order("created_at", { ascending: false })
        .limit(8),
      loadPlanAccess(supabase, restaurant.restaurantId),
    ]);

  const todayRevenue = (todayOrders ?? [])
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const stats = [
    { label: "Commandes du jour", value: todayOrders?.length ?? 0 },
    { label: "Commandes en cours", value: pendingOrders ?? 0 },
    { label: "Tables occupées", value: activeTables ?? 0 },
    { label: "Chiffre d’affaires du jour", value: formatCurrency(todayRevenue) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh intervalMs={8000} />
      <div>
        <h1 className="text-2xl font-semibold">Bonjour</h1>
        <p className="text-muted-foreground">{restaurant.restaurantName} — vue en direct</p>
      </div>

      {access.isTrial && (
        <div
          className={
            access.trialExpired
              ? "rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
              : "rounded-lg border bg-muted/40 p-4 text-sm"
          }
        >
          {access.trialExpired ? (
            <>
              <p className="font-medium">Votre essai gratuit est terminé.</p>
              <p className="text-muted-foreground">
                Les modèles premium et les fonctions Business sont verrouillés jusqu’au choix d’une
                formule. Contactez Servio pour vous abonner.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">{trialLabel(access.trialDaysLeft)}</p>
              <p className="text-muted-foreground">Toutes les fonctions Business sont incluses pendant l’essai.</p>
            </>
          )}
        </div>
      )}

      {access.renewalDue && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Votre abonnement est à renouveler.</p>
          <p className="text-muted-foreground">
            {access.effectiveTier === "starter"
              ? "Les fonctions de votre formule sont verrouillées jusqu’au renouvellement. Contactez Servio pour régler votre abonnement."
              : "Votre formule reste active quelques jours, le temps de régler votre abonnement auprès de Servio."}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commandes en direct</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(recentOrders ?? []).map((order) => (
            <div key={order.id} className="flex items-center justify-between border-b py-2 last:border-0">
              <div>
                <p className="font-medium">Commande n° {order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {order.order_items.map((i) => `${i.item_name} × ${i.quantity}`).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatCurrency(order.total_amount)}</span>
                <Badge>{ORDER_STATUS_LABEL[order.status]}</Badge>
              </div>
            </div>
          ))}
          {(!recentOrders || recentOrders.length === 0) && (
            <p className="text-sm text-muted-foreground">
              Aucune commande pour l’instant. Elles apparaîtront ici dès que vos clients scanneront
              les QR codes des tables.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function trialLabel(daysLeft: number | null): string {
  if (daysLeft === null) return "Essai gratuit";
  if (daysLeft <= 1) return "Essai gratuit : dernier jour";
  return `Essai gratuit : ${daysLeft} jours restants`;
}
