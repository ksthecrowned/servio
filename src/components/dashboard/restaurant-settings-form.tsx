"use client";

import { useActionState, useState } from "react";

import { updateRestaurantProfile } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Restaurant = {
  name: string;
  phone: string | null;
  description: string | null;
  tax_percent: number;
  service_charge_percent: number;
  logo_url: string | null;
  cover_image_url: string | null;
};

export function RestaurantSettingsForm({
  restaurant,
  restaurantId,
}: {
  restaurant: Restaurant;
  restaurantId: string;
}) {
  const [state, formAction, isPending] = useActionState(updateRestaurantProfile, {
    error: null,
    success: false,
  });
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url);
  const [coverUrl, setCoverUrl] = useState(restaurant.cover_image_url);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="logoUrl" value={logoUrl ?? ""} />
      <input type="hidden" name="coverImageUrl" value={coverUrl ?? ""} />

      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-1.5">
          <Label>Logo</Label>
          <ImageUpload
            bucket="restaurant-branding"
            restaurantId={restaurantId}
            value={logoUrl}
            onChange={setLogoUrl}
            prefix="logo"
            label="Ajouter un logo"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Image de couverture</Label>
          <ImageUpload
            bucket="restaurant-branding"
            restaurantId={restaurantId}
            value={coverUrl}
            onChange={setCoverUrl}
            prefix="cover"
            label="Ajouter une couverture"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom du restaurant</Label>
        <Input id="name" name="name" defaultValue={restaurant.name} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Téléphone</Label>
        <Input id="phone" name="phone" defaultValue={restaurant.phone ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue={restaurant.description ?? ""} />
      </div>
      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="taxPercent">Taxe (%)</Label>
          <Input
            id="taxPercent"
            name="taxPercent"
            type="number"
            step="0.01"
            min="0"
            defaultValue={restaurant.tax_percent}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serviceChargePercent">Frais de service (%)</Label>
          <Input
            id="serviceChargePercent"
            name="serviceChargePercent"
            type="number"
            step="0.01"
            min="0"
            defaultValue={restaurant.service_charge_percent}
            className="w-28"
          />
        </div>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-brand">Enregistré.</p> : null}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
