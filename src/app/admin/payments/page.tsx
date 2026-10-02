import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABEL } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount, status, created_at, subscriptions(restaurants(name))")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Paiements</h1>
        <p className="text-muted-foreground">Transactions de facturation des abonnements.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions récentes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(transactions ?? []).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between border-b py-2 last:border-0">
              <div>
                <p className="font-medium">
                  {(tx.subscriptions as unknown as { restaurants: { name: string } } | null)
                    ?.restaurants.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(tx.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(tx.amount)}</span>
                <Badge variant={tx.status === "paid" ? "brand" : "outline"}>
                  {PAYMENT_STATUS_LABEL[tx.status]}
                </Badge>
              </div>
            </div>
          ))}
          {(!transactions || transactions.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucune transaction pour l’instant.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
