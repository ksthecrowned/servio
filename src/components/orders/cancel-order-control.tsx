"use client";

import { useState, useTransition } from "react";

import { cancelOrderAsKitchen, cancelOrderAsOwner } from "@/app/actions/order-cancellation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REASONS = ["Plat épuisé", "Erreur de commande", "Demande du client", "Cuisine fermée"];

/**
 * Two-step cancel for staff screens: pick a reason, then confirm. Kept
 * deliberately out of the way of the main action (accept / prepare).
 */
export function CancelOrderControl({ orderId, as }: { orderId: string; as: "kitchen" | "owner" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        Annuler la commande
      </Button>
    );
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = as === "kitchen" ? await cancelOrderAsKitchen(orderId, reason) : await cancelOrderAsOwner(orderId, reason);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3">
      <p className="text-sm font-medium">Motif de l’annulation</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Motif de l’annulation">
        {REASONS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={reason === option}
            onClick={() => setReason(option)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              reason === option ? "border-destructive bg-destructive text-white" : "hover:bg-accent",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={confirm}>
          {isPending ? "Annulation…" : "Confirmer l’annulation"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => setOpen(false)}>
          Retour
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
