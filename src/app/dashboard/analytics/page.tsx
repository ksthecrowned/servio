import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

type OrderRow = {
  status: string;
  total_amount: number | string;
  discount_amount: number | string;
  created_at: string;
  customer_id: string | null;
  coupon_id: string | null;
  order_items: { item_name: string; quantity: number }[] | null;
};

type CouponRow = {
  code: string;
  times_used: number;
  offers: { name: string } | null;
};

function money(value: number | string) {
  return Number(value) || 0;
}

export default async function AnalyticsPage() {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const [{ data: orders, error: ordersError }, { count: customerCount }, { data: coupons }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "status, total_amount, discount_amount, created_at, customer_id, coupon_id, order_items(item_name, quantity)",
        )
        .eq("restaurant_id", restaurant.restaurantId)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.restaurantId),
      supabase
        .from("coupons")
        .select("code, times_used, offers(name)")
        .eq("restaurant_id", restaurant.restaurantId)
        .order("times_used", { ascending: false }),
    ]);

  const rows = (orders ?? []) as OrderRow[];
  const billable = rows.filter((order) => order.status !== "cancelled");

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const weekMs = todayMs - 6 * 24 * 60 * 60 * 1000;
  const monthMs = todayMs - 29 * 24 * 60 * 60 * 1000;

  function revenueSince(sinceMs: number) {
    return billable
      .filter((order) => new Date(order.created_at).getTime() >= sinceMs)
      .reduce((sum, order) => sum + money(order.total_amount), 0);
  }

  const statusCount = (status: string) => rows.filter((order) => order.status === status).length;

  const sold = new Map<string, number>();
  for (const order of billable) {
    for (const item of order.order_items ?? []) {
      sold.set(item.item_name, (sold.get(item.item_name) ?? 0) + item.quantity);
    }
  }
  const ranked = [...sold.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const ordersByCustomer = new Map<string, number>();
  for (const order of rows) {
    if (!order.customer_id) continue;
    ordersByCustomer.set(order.customer_id, (ordersByCustomer.get(order.customer_id) ?? 0) + 1);
  }
  let firstTime = 0;
  let returning = 0;
  for (const count of ordersByCustomer.values()) {
    if (count > 1) returning += 1;
    else firstTime += 1;
  }

  const couponOrders = billable.filter((order) => order.coupon_id);
  const discountGiven = couponOrders.reduce((sum, order) => sum + money(order.discount_amount), 0);
  const couponRevenue = couponOrders.reduce((sum, order) => sum + money(order.total_amount), 0);
  const couponRows = (coupons ?? []) as unknown as CouponRow[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Statistiques</h1>
        <p className="text-muted-foreground">
          Chiffre d’affaires, commandes et plats de {restaurant.restaurantName}.
        </p>
      </div>

      {ordersError ? (
        <p className="text-sm text-destructive">{ordersError.message}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chiffre d’affaires</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Stat label="Aujourd’hui" value={formatCurrency(revenueSince(todayMs))} />
            <Stat label="7 derniers jours" value={formatCurrency(revenueSince(weekMs))} />
            <Stat label="30 derniers jours" value={formatCurrency(revenueSince(monthMs))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commandes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Stat label="Total" value={String(rows.length)} />
            <Stat label="Terminées" value={String(statusCount("completed"))} />
            <Stat label="Annulées" value={String(statusCount("cancelled"))} />
            <Stat label="En attente" value={String(statusCount("pending"))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plats les plus vendus</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {ranked.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun plat vendu pour l’instant.</p>
            ) : (
              ranked.slice(0, 5).map(([name, quantity]) => (
                <Stat key={name} label={name} value={String(quantity)} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clients</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Stat label="Enregistrés" value={String(customerCount ?? 0)} />
            <Stat label="Première commande" value={String(firstTime)} />
            <Stat label="Clients fidèles" value={String(returning)} />
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Offres</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Stat label="Réductions accordées" value={formatCurrency(discountGiven)} />
            <Stat label="Chiffre d’affaires avec code promo" value={formatCurrency(couponRevenue)} />
            {couponRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun code promo pour l’instant.</p>
            ) : (
              couponRows.map((coupon) => (
                <Stat
                  key={coupon.code}
                  label={coupon.offers?.name ? `${coupon.code} · ${coupon.offers.name}` : coupon.code}
                  value={`${coupon.times_used} utilisation${coupon.times_used > 1 ? "s" : ""}`}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
