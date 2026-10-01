"use client";

import { useState } from "react";
import { createOffer, updateOffer } from "@/app/actions/offers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const typeLabels: Record<string, string> = {
  percentage: "Pourcentage",
  flat: "Montant fixe",
  bogo: "1 acheté = 1 offert",
  combo: "Combo",
  happy_hour: "Happy hour",
};

export function OfferForm({ offer, onDone }: { offer?: Offer; onDone?: () => void }) {
  const [type, setType] = useState(offer?.type ?? "percentage");
  const action = offer ? updateOffer : createOffer;

  return (
    <form action={async (formData) => { await action(formData); onDone?.(); }} className="grid gap-4">
      {offer && <input type="hidden" name="id" value={offer.id} />}
      <div className="grid gap-2">
        <Label htmlFor={offer ? `offer-name-${offer.id}` : "offer-name"}>Nom</Label>
        <Input id={offer ? `offer-name-${offer.id}` : "offer-name"} name="name" defaultValue={offer?.name} placeholder="Ex. Déjeuner -20%" required />
      </div>
      <div className="grid gap-2">
        <Label>Type</Label>
        <Select name="type" value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {type === "percentage" && <div className="grid gap-2"><Label>Réduction (%)</Label><Input name="percentage_value" type="number" min="0" max="100" step="0.01" defaultValue={offer?.percentage_value ?? ""} /></div>}
      {type === "flat" && <div className="grid gap-2"><Label>Réduction (XAF)</Label><Input name="flat_value" type="number" min="0" step="1" defaultValue={offer?.flat_value ?? ""} /></div>}
      <div className="grid gap-2 md:grid-cols-2 md:gap-3">
        <div className="grid gap-2"><Label>Minimum de commande (XAF)</Label><Input name="min_order_value" type="number" min="0" step="1" defaultValue={offer?.min_order_value ?? ""} /></div>
        <div className="grid gap-2"><Label>Réduction maximale (XAF)</Label><Input name="max_discount_value" type="number" min="0" step="1" defaultValue={offer?.max_discount_value ?? ""} /></div>
      </div>
      <div className="grid gap-2 md:grid-cols-2 md:gap-3">
        <div className="grid gap-2"><Label>Début</Label><Input name="starts_on" type="date" defaultValue={offer?.starts_on ?? ""} /></div>
        <div className="grid gap-2"><Label>Fin</Label><Input name="ends_on" type="date" defaultValue={offer?.ends_on ?? ""} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={offer?.is_active ?? true} /> Offre active</label>
      <Button type="submit">{offer ? "Enregistrer" : "Créer l'offre"}</Button>
    </form>
  );
}
