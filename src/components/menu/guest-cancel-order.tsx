"use client";

import { useState, useTransition } from "react";

import { cancelOrderAsGuest } from "@/app/actions/order-cancellation";
import { Button } from "@/components/ui/button";

/** Lets the guest cancel while the kitchen hasn't accepted the order yet. */
export function GuestCancelOrder({
  orderId,
  restaurantSlug,
  branchSlug,
}: {
  orderId: string;
  restaurantSlug: string;
  branchSlug: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
        Annuler ma commande
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-sm">Annuler cette commande ? La cuisine ne l’a pas encore acceptée.</p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await cancelOrderAsGuest(orderId, restaurantSlug, branchSlug);
              if (result.error) setError(result.error);
            });
          }}
        >
          {isPending ? "Annulation…" : "Oui, annuler"}
        </Button>
        <Button type="button" variant="ghost" disabled={isPending} onClick={() => setConfirming(false)}>
          Garder ma commande
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
