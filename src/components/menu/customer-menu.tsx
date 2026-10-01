"use client";

import { ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AddToCartDialog, type MenuItemForCart } from "@/components/menu/add-to-cart-dialog";
import { CartBar } from "@/components/menu/cart-bar";
import { WaiterRequestButton } from "@/components/menu/waiter-request-button";

type Category = { id: string; name: string; menu_items: MenuItemForCart[] };

export type MenuTheme = {
  templateSlug: string | null;
  primaryColor: string | null;
  fontFamily: string | null;
};

function formatPrice(price: number) {
  return `₹${new Intl.NumberFormat("en-IN").format(price)}`;
}

function mark(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "S";
}

export function CustomerMenu({
  restaurant,
  categories,
  tableLabel,
  branchId,
  tableId,
}: {
  restaurant: {
    name: string;
    description: string | null;
    cuisine_type: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
  };
  categories: Category[];
  tableLabel?: string | null;
  branchId: string;
  tableId?: string;
  theme?: MenuTheme;
}) {
  const [activeItem, setActiveItem] = useState<MenuItemForCart | null>(null);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [query, setQuery] = useState("");

  const dishes = useMemo(
    () => categories.flatMap((category) => category.menu_items.map((item) => ({ ...item, category }))),
    [categories],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dishes.filter((dish) => {
      const inCategory = categoryId === "all" || dish.category.id === categoryId;
      const inQuery =
        !needle ||
        dish.name.toLowerCase().includes(needle) ||
        (dish.description ?? "").toLowerCase().includes(needle);
      return inCategory && inQuery;
    });
  }, [dishes, categoryId, query]);

  const featured = dishes.filter((dish) => dish.is_bestseller && dish.is_available);
  const activeCategory = categories.find((category) => category.id === categoryId);
  const showFeatured = !query && categoryId === "all" && featured.length > 0;

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">{mark(restaurant.name)}</span>
          <span>
            <strong>{restaurant.name}</strong>
            <small>
              {tableLabel ? `Table ${tableLabel}` : "Menu"}
              {restaurant.cuisine_type ? ` · ${restaurant.cuisine_type}` : ""}
            </small>
          </span>
        </div>
      </header>

      <div className="screen menu-screen animate-in">
        <div className="menu-intro">
          <p className="eyebrow">
            {restaurant.name}
            {tableLabel ? ` · Table ${tableLabel}` : ""}
          </p>
          <h1>Le menu</h1>
          <p>
            {restaurant.description ||
              "Une carte à parcourir depuis votre table. Touchez un plat pour le commander."}
          </p>
        </div>

        <label className="search-box">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un plat…"
            aria-label="Rechercher dans le menu"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche">
              <X size={18} />
            </button>
          ) : null}
        </label>

        <div className="category-strip">
          <button
            type="button"
            className={categoryId === "all" ? "active" : ""}
            onClick={() => setCategoryId("all")}
          >
            Tout
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={categoryId === category.id ? "active" : ""}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {showFeatured ? (
          <section>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Sélection</p>
                <h2>À découvrir</h2>
              </div>
            </div>
            <div className="featured-scroll">
              {featured.map((dish) => (
                <button
                  key={dish.id}
                  type="button"
                  className="featured-dish"
                  onClick={() => setActiveItem(dish)}
                >
                  {dish.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dish.image_url} alt={dish.name} />
                  ) : (
                    <span className="dish-photo" />
                  )}
                  <span className="image-label">Recommandé</span>
                  <span className="featured-caption">
                    <strong>{dish.name}</strong>
                    <em>{formatPrice(dish.base_price)}</em>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {query
                  ? `${shown.length} résultat${shown.length > 1 ? "s" : ""}`
                  : (activeCategory?.name ?? "Toute la carte")}
              </p>
              <h2>{query ? `Recherche « ${query} »` : activeCategory?.name ?? "Toute la carte"}</h2>
            </div>
          </div>

          {shown.length > 0 ? (
            <div className="dish-list">
              {shown.map((dish) => (
                <button
                  key={dish.id}
                  type="button"
                  className={`dish-row ${dish.is_available ? "" : "unavailable"}`}
                  disabled={!dish.is_available}
                  onClick={() => setActiveItem(dish)}
                >
                  {dish.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dish.image_url} alt="" />
                  ) : (
                    <span className="dish-photo-thumb" />
                  )}
                  <span className="dish-copy">
                    {dish.is_bestseller ? <small>Recommandé</small> : null}
                    <strong>{dish.name}</strong>
                    {dish.description ? <em>{dish.description}</em> : null}
                    <b>{dish.is_available ? formatPrice(dish.base_price) : "Indisponible"}</b>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search className="mx-auto" />
              <h3>Aucun résultat</h3>
              <p>Essayez un autre nom ou parcourez les catégories.</p>
            </div>
          )}
        </section>
      </div>

      {activeItem ? (
        <AddToCartDialog
          item={activeItem}
          open={!!activeItem}
          onOpenChange={(open) => !open && setActiveItem(null)}
        />
      ) : null}

      {tableId ? <WaiterRequestButton branchId={branchId} tableId={tableId} /> : null}
      <CartBar />
    </>
  );
}
