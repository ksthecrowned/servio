"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import { updateMenuItem, type MenuActionState } from "@/app/actions/menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = { id: string; name: string };

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  is_veg: boolean;
  is_bestseller: boolean;
  is_available: boolean;
  image_url: string | null;
  category_id: string;
};

export function EditMenuItemDialog({
  item,
  categories,
  restaurantId,
}: {
  item: MenuItem;
  categories: Category[];
  restaurantId: string;
}) {
  const initialState: MenuActionState = { error: null };
  const [state, formAction, isPending] = useActionState(updateMenuItem, initialState);
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(item.image_url);

  if (state.savedAt && open) {
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setImageUrl(item.image_url);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil />
          Modifier
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier « {item.name} »</DialogTitle>
          <DialogDescription>
            Mettez à jour les informations visibles sur votre menu.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />

          <div className="flex flex-col gap-1.5">
            <Label>Photo</Label>
            <ImageUpload
              bucket="menu-images"
              restaurantId={restaurantId}
              value={imageUrl}
              onChange={setImageUrl}
              prefix="item"
              label="Changer la photo"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-category-${item.id}`}>Catégorie</Label>
              <select
                id={`edit-category-${item.id}`}
                name="categoryId"
                defaultValue={item.category_id}
                required
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-price-${item.id}`}>Prix (FCFA)</Label>
              <Input
                id={`edit-price-${item.id}`}
                name="basePrice"
                type="number"
                min="0"
                step="1"
                defaultValue={item.base_price}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-name-${item.id}`}>Nom</Label>
            <Input id={`edit-name-${item.id}`} name="name" defaultValue={item.name} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-description-${item.id}`}>Description</Label>
            <textarea
              id={`edit-description-${item.id}`}
              name="description"
              defaultValue={item.description ?? ""}
              rows={3}
              placeholder="Décrivez brièvement le plat, ses ingrédients ou sa particularité."
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isVeg" defaultChecked={item.is_veg} className="size-4" />
              Végétarien
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isBestseller"
                defaultChecked={item.is_bestseller}
                className="size-4"
              />
              Best-seller
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isAvailable"
                defaultChecked={item.is_available}
                className="size-4"
              />
              Disponible
            </label>
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
