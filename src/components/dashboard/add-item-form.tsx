"use client";

import { useActionState, useState } from "react";

import { addMenuItem } from "@/app/actions/menu";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddItemForm({
  categories,
  restaurantId,
}: {
  categories: { id: string; name: string }[];
  restaurantId: string;
}) {
  const [state, formAction, isPending] = useActionState(addMenuItem, { error: null });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState(state.savedAt);

  if (state.savedAt !== lastSavedAt) {
    setLastSavedAt(state.savedAt);
    setImageUrl(null);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />

      <div className="flex flex-col gap-1.5">
        <Label>Photo</Label>
        <ImageUpload
          bucket="menu-images"
          restaurantId={restaurantId}
          value={imageUrl}
          onChange={setImageUrl}
          prefix="item"
          label="Ajouter une photo"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">Catégorie</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="basePrice">Prix (XAF)</Label>
          <Input id="basePrice" name="basePrice" type="number" min="0" step="1" placeholder="2500" required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="itemName">Nom</Label>
        <Input id="itemName" name="name" placeholder="Poulet braisé" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="itemDescription">Description</Label>
        <textarea
          id="itemDescription"
          name="description"
          rows={3}
          placeholder="Ingrédients, accompagnement ou particularité du plat."
          className="border-input bg-transparent placeholder:text-muted-foreground rounded-md border px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isVeg" defaultChecked className="size-4" />
          Végétarien
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isBestseller" className="size-4" />
          Best-seller
        </label>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Ajout…" : "Ajouter l’élément"}
      </Button>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
