import { formatCurrency } from "@/lib/currency";
import { AddCategoryForm } from "@/components/dashboard/add-category-form";
import { AddItemForm } from "@/components/dashboard/add-item-form";
import { EditMenuItemDialog } from "@/components/dashboard/edit-menu-item-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

export default async function MenuPage() {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("menu_categories")
    .select(
      "id, name, menu_items!menu_items_category_id_fkey(id, category_id, name, description, base_price, is_veg, is_bestseller, is_available, image_url)",
    )
    .eq("restaurant_id", restaurant.restaurantId)
    .order("sort_order");

  const categoryOptions = (categories ?? []).map(({ id, name }) => ({ id, name }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Menu</h1>
        <p className="text-muted-foreground">
          Gérez vos catégories, vos plats, leurs prix, photos et disponibilité.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajouter une catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <AddCategoryForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajouter un élément</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryOptions.length > 0 ? (
              <AddItemForm categories={categoryOptions} restaurantId={restaurant.restaurantId} />
            ) : (
              <p className="text-sm text-muted-foreground">Créez d’abord une catégorie.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {(categories ?? []).map((category) => (
          <Card key={category.id}>
            <CardHeader className="border-b">
              <CardTitle className="text-base">{category.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {category.menu_items.length === 0 && (
                <p className="px-6 py-5 text-sm text-muted-foreground">Aucun élément pour le moment.</p>
              )}

              {category.menu_items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 border-b p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt=""
                        className="size-16 shrink-0 rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                        Photo
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`size-2.5 rounded-sm border ${item.is_veg ? "border-green-600 bg-green-600" : "border-red-600 bg-red-600"}`}
                          title={item.is_veg ? "Végétarien" : "Non végétarien"}
                        />
                        <span className="font-medium">{item.name}</span>
                        {item.is_bestseller && <Badge>Best-seller</Badge>}
                        {!item.is_available && <Badge variant="outline">Indisponible</Badge>}
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {item.description || "Aucune description renseignée."}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-semibold">{formatCurrency(item.base_price)}</span>
                        <span className="text-muted-foreground">
                          {item.is_veg ? "Végétarien" : "Non végétarien"}
                        </span>
                        <span className={item.is_available ? "text-foreground" : "text-muted-foreground"}>
                          {item.is_available ? "Disponible" : "Masqué du menu"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    <EditMenuItemDialog
                      item={item}
                      categories={categoryOptions}
                      restaurantId={restaurant.restaurantId}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {(!categories || categories.length === 0) && (
          <p className="text-sm text-muted-foreground">Aucune catégorie pour le moment.</p>
        )}
      </div>
    </div>
  );
}
