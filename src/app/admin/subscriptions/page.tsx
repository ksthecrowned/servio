import { SubscriptionControls } from "@/components/admin/subscription-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { SUBSCRIPTION_STATUS_LABEL } from "@/lib/labels";
import { planAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

const TIER_LABEL = { starter: "Starter", business: "Business", pro: "Pro" } as const;

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function formatDate(value: string | null): string {
  return value ? dateFormat.format(new Date(value)) : "—";
}

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "id, status, trial_ends_at, current_period_end, restaurants(name, slug), subscription_plans(name, tier, monthly_price)",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Abonnements</h1>
        <p className="text-muted-foreground">
          La facturation n’est pas encore automatisée : une fois le paiement reçu, activez ou
          renouvelez la formule ici.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tous les abonnements</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          {(subscriptions ?? []).map((sub) => {
            const access = planAccess(sub);
            const plan = sub.subscription_plans;
            return (
              <div
                key={sub.id}
                className="flex flex-col gap-3 border-b py-4 last:border-0 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{sub.restaurants?.name}</p>
                    <Badge
                      variant={
                        sub.status === "active" ? "brand" : access.trialExpired ? "destructive" : "outline"
                      }
                    >
                      {access.trialExpired ? "Essai terminé" : SUBSCRIPTION_STATUS_LABEL[sub.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sub.status === "trialing"
                      ? `Essai jusqu’au ${formatDate(sub.trial_ends_at)}`
                      : `${plan?.name ?? "—"} · ${plan ? formatCurrency(plan.monthly_price) : ""}/mois · jusqu’au ${formatDate(sub.current_period_end)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fonctions actives : {TIER_LABEL[access.effectiveTier]}
                    {access.renewalDue ? " · renouvellement attendu" : ""}
                  </p>
                </div>
                <SubscriptionControls
                  subscriptionId={sub.id}
                  tier={plan?.tier ?? null}
                  status={sub.status}
                />
              </div>
            );
          })}
          {(!subscriptions || subscriptions.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucun abonnement pour l’instant.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
