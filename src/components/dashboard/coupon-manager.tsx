"use client";

import { useActionState, useState, useTransition } from "react";

import { createCoupon, setCouponActive } from "@/app/actions/offers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CouponRow = {
  id: string;
  code: string;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
};

export function CouponManager({ offerId, coupons }: { offerId: string; coupons: CouponRow[] }) {
  const [state, formAction, isPending] = useActionState(createCoupon.bind(null, offerId), { error: null });

  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">Codes promo</p>

      {coupons.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {coupons.map((coupon) => (
            <CouponItem key={coupon.id} coupon={coupon} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Aucun code : les clients ne peuvent pas encore utiliser cette offre.
        </p>
      )}

      {/* Keyed on the last save so a successful add clears the inputs. */}
      <form key={state.savedAt ?? 0} action={formAction} className="flex flex-wrap items-center gap-2">
        <Input
          name="code"
          placeholder="Ex. MIDI20"
          aria-label="Code promo"
          className="h-8 w-36 font-mono uppercase"
          maxLength={20}
          required
        />
        <Input
          name="usage_limit"
          type="number"
          min="1"
          step="1"
          placeholder="Limite (option.)"
          aria-label="Nombre d’utilisations maximum"
          className="h-8 w-36"
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Ajout…" : "Ajouter"}
        </Button>
      </form>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </div>
  );
}

function CouponItem({ coupon }: { coupon: CouponRow }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const usage =
    coupon.usage_limit === null
      ? `${coupon.times_used} utilisation${coupon.times_used > 1 ? "s" : ""}`
      : `${coupon.times_used} / ${coupon.usage_limit} utilisations`;
  const exhausted = coupon.usage_limit !== null && coupon.times_used >= coupon.usage_limit;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium">{coupon.code}</span>
        <span className="text-xs text-muted-foreground">{usage}</span>
        {exhausted && <Badge variant="outline">Épuisé</Badge>}
        {!coupon.is_active && <Badge variant="outline">Désactivé</Badge>}
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-destructive">{error}</span>}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await setCouponActive(coupon.id, !coupon.is_active);
              setError(result.error);
            })
          }
        >
          {coupon.is_active ? "Désactiver" : "Réactiver"}
        </Button>
      </div>
    </li>
  );
}
