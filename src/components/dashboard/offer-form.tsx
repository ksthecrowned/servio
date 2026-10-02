"use client";

import { useActionState, useState } from "react";
import { createOffer, updateOffer } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OFFER_TYPE_LABEL } from "@/lib/labels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Offer = {
  id: string;
  name: string;
  type: string;
  percentage_value: number | null;
  flat_value: number | null;
  min_order_value: number | null;
  max_discount_value: number | null;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};


/** Types guests can redeem at checkout today (see place_order). */
const ORDERABLE_TYPES = ["percentage", "flat"];

export function OfferForm({ offer }: { offer?: Offer }) {
  const [type, setType] = useState(offer?.type ?? "percentage");
  const [state, formAction, isPending] = useActionState(offer ? updateOffer : createOffer, { error: null });
  // After a failed save, keep what was typed rather than the saved offer.
  const values = state.values;
  // An existing offer of a legacy type stays editable, but new offers only
  // offer the types that can actually be priced.
  const typeOptions = Object.entries(OFFER_TYPE_LABEL).filter(
    ([value]) => ORDERABLE_TYPES.includes(value) || value === offer?.type,
  );

  return (
    <form action={formAction} className="grid gap-4">
      {offer && <input type="hidden" name="id" value={offer.id} />}
      <div className="grid gap-2">
        <Label htmlFor={offer ? `offer-name-${offer.id}` : "offer-name"}>Nom</Label>
        <Input id={offer ? `offer-name-${offer.id}` : "offer-name"} name="name" defaultValue={values?.name ?? offer?.name} placeholder="Ex. Déjeuner -20%" required />
      </div>
      <div className="grid gap-2">
        <Label>Type</Label>
        <Select name="type" value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {typeOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        {!ORDERABLE_TYPES.includes(type) && (
          <p className="text-xs text-muted-foreground">Ce type n’est pas encore utilisable par les clients : ses coupons seront refusés à la commande.</p>
        )}
      </div>
      {type === "percentage" && <div className="grid gap-2"><Label>Réduction (%)</Label><Input name="percentage_value" type="number" min="0.01" max="100" step="0.01" defaultValue={values?.percentage_value ?? offer?.percentage_value ?? ""} required /></div>}
      {type === "flat" && <div className="grid gap-2"><Label>Réduction (FCFA)</Label><Input name="flat_value" type="number" min="1" step="1" defaultValue={values?.flat_value ?? offer?.flat_value ?? ""} required /></div>}
      <div className="grid gap-2 md:grid-cols-2 md:gap-3">
        <div className="grid gap-2"><Label>Minimum de commande (FCFA)</Label><Input name="min_order_value" type="number" min="0" step="1" defaultValue={values?.min_order_value ?? offer?.min_order_value ?? ""} /></div>
        <div className="grid gap-2"><Label>Réduction maximale (FCFA)</Label><Input name="max_discount_value" type="number" min="0" step="1" defaultValue={values?.max_discount_value ?? offer?.max_discount_value ?? ""} /></div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 md:gap-3">
        <div className="grid gap-2"><Label>Début</Label><Input name="starts_on" type="date" defaultValue={values?.starts_on ?? offer?.starts_on ?? ""} /></div>
        <div className="grid gap-2"><Label>Fin</Label><Input name="ends_on" type="date" defaultValue={values?.ends_on ?? offer?.ends_on ?? ""} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={values ? values.is_active === "on" : (offer?.is_active ?? true)} /> Offre active</label>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {!state.error && state.savedAt && <p className="text-sm text-muted-foreground">Offre enregistrée.</p>}
      <Button type="submit" disabled={isPending}>{isPending ? "Enregistrement…" : offer ? "Enregistrer" : "Créer l’offre"}</Button>
    </form>
  );
}
