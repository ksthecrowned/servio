"use client";

import { useState, useTransition } from "react";

import {
  activateSubscription,
  extendTrial,
  setSubscriptionStatus,
  type AdminSubscriptionResult,
} from "@/app/actions/admin-subscriptions";
import { Button } from "@/components/ui/button";
import type { Enums } from "@/lib/supabase/types";

const TIER_OPTIONS: { value: Enums<"subscription_plan_tier">; label: string }[] = [
  { value: "starter", label: "Starter" },
  { value: "business", label: "Business" },
  { value: "pro", label: "Pro" },
];

const MONTH_OPTIONS = [1, 3, 6, 12];

const selectClass = "h-8 rounded-md border bg-transparent px-2 text-sm";

/** Admin actions on one subscription: activate/renew a paid plan, extend the trial, suspend. */
export function SubscriptionControls({
  subscriptionId,
  tier,
  status,
}: {
  subscriptionId: string;
  tier: Enums<"subscription_plan_tier"> | null;
  status: Enums<"subscription_status">;
}) {
  const [planTier, setPlanTier] = useState<Enums<"subscription_plan_tier">>(
    tier && tier !== "starter" ? tier : "business",
  );
  const [months, setMonths] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<AdminSubscriptionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Formule"
          className={selectClass}
          value={planTier}
          onChange={(event) => setPlanTier(event.target.value as Enums<"subscription_plan_tier">)}
        >
          {TIER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Durée"
          className={selectClass}
          value={months}
          onChange={(event) => setMonths(Number(event.target.value))}
        >
          {MONTH_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} mois
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => activateSubscription(subscriptionId, planTier, months))}
        >
          {status === "active" ? "Renouveler" : "Activer"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => extendTrial(subscriptionId, 14))}
        >
          Prolonger l’essai de 14 jours
        </Button>
        {status === "active" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => setSubscriptionStatus(subscriptionId, "past_due"))}
          >
            Paiement en retard
          </Button>
        )}
        {status !== "cancelled" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            disabled={isPending}
            onClick={() => {
              if (window.confirm("Résilier cet abonnement ? Le restaurant repassera en Starter.")) {
                run(() => setSubscriptionStatus(subscriptionId, "cancelled"));
              }
            }}
          >
            Résilier
          </Button>
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
