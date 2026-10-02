"use client";

import { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";

import { placeOrder } from "@/app/actions/orders";
import { useCart } from "@/components/menu/cart-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lineTotal } from "@/lib/cart-types";
import { formatCurrency } from "@/lib/currency";

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { lines, updateQuantity, removeLine, subtotal, clear } = useCart();
  const params = useParams<{ restaurant: string; branch: string; table?: string }>();
  const router = useRouter();

  const [couponCode, setCouponCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePlaceOrder() {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder({
        restaurantSlug: params.restaurant,
        branchSlug: params.branch,
        tableId: params.table,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          variantId: l.variantId,
          addonIds: l.addons.map((a) => a.id),
          quantity: l.quantity,
          specialInstructions: l.specialInstructions,
        })),
        couponCode: couponCode.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      clear();
      onOpenChange(false);
      router.push(`/menu/${params.restaurant}/${params.branch}/order/${result.orderId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Votre commande</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {lines.map((line) => (
            <div key={line.key} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0">
              <div className="flex-1">
                <p className="font-medium">{line.itemName}</p>
                {line.variantName ? (
                  <p className="text-xs text-muted-foreground">{line.variantName}</p>
                ) : null}
                {line.addons.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {line.addons.map((a) => a.name).join(", ")}
                  </p>
                ) : null}
                {line.specialInstructions ? (
                  <p className="text-xs text-muted-foreground italic">&ldquo;{line.specialInstructions}&rdquo;</p>
                ) : null}
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-6"
                    onClick={() => updateQuantity(line.key, line.quantity - 1)}
                  >
                    −
                  </Button>
                  <span className="w-4 text-center text-sm">{line.quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-6"
                    onClick={() => updateQuantity(line.key, line.quantity + 1)}
                  >
                    +
                  </Button>
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="ml-2 text-xs text-muted-foreground underline"
                  >
                    Retirer
                  </button>
                </div>
              </div>
              <p className="font-medium">{formatCurrency(lineTotal(line))}</p>
            </div>
          ))}
          {lines.length === 0 && <p className="text-sm text-muted-foreground">Votre panier est vide.</p>}
        </div>

        {lines.length > 0 && (
          <>
            <div className="flex items-center justify-between border-t pt-3 font-medium">
              <span>Sous-total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Les taxes, les frais de service et la réduction éventuelle sont appliqués à l’envoi de la
              commande.
            </p>

            <div className="flex flex-col gap-3 border-t pt-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="couponCode">Code promo (facultatif)</Label>
                <Input
                  id="couponCode"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="MIDI20"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="customerName">Nom (facultatif)</Label>
                  <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="customerPhone">Téléphone (facultatif)</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button onClick={handlePlaceOrder} disabled={isPending} className="w-full">
              {isPending ? "Envoi de la commande…" : "Commander"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
