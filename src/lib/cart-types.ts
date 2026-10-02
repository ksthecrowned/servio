export type CartAddon = { id: string; name: string; price: number };

export type CartLine = {
  key: string;
  itemId: string;
  itemName: string;
  isVeg: boolean;
  variantId: string | null;
  variantName: string | null;
  unitPrice: number;
  addons: CartAddon[];
  quantity: number;
  specialInstructions: string;
};

export function lineTotal(line: CartLine): number {
  const addonsTotal = line.addons.reduce((sum, addon) => sum + addon.price, 0);
  return (line.unitPrice + addonsTotal) * line.quantity;
}

/** A menu item as the guest menu receives it, with its sizes and add-ons. */
export type MenuItemForCart = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  is_veg: boolean;
  is_bestseller: boolean;
  is_available: boolean;
  menu_variants: { id: string; name: string; price: number; is_default: boolean }[];
  menu_addons: { id: string; name: string; price: number }[];
};
