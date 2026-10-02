"use client";

import { Check, ChevronRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { placeOrder, type TableOrder } from "@/app/actions/orders";
import { useCart } from "@/components/menu/cart-provider";
import { lineTotal, type MenuItemForCart } from "@/lib/cart-types";
import { formatCurrency } from "@/lib/currency";
import { ORDER_STATUS_LABEL } from "@/lib/labels";

const MAX_QUANTITY = 50;

/** Statuses after which a guest no longer needs to follow the order. */
const FINISHED: ReadonlySet<TableOrder["status"]> = new Set(["served", "completed", "cancelled"]);

export function isOrderInProgress(order: TableOrder) {
  return !FINISHED.has(order.status);
}

function QuantityStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div className="qty-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Retirer un">
        <Minus size={16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))}
        disabled={value >= MAX_QUANTITY}
        aria-label="Ajouter un"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

/**
 * Size, add-ons, instructions and quantity for one dish, shown on the dish
 * page. Prices here are only a preview: place_order re-prices everything.
 */
export function DishOrderPanel({ dish, onAdded }: { dish: MenuItemForCart; onAdded: () => void }) {
  const { addLine } = useCart();
  const defaultVariant = dish.menu_variants.find((v) => v.is_default) ?? dish.menu_variants[0];
  const [variantId, setVariantId] = useState<string | null>(defaultVariant?.id ?? null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");

  const variant = dish.menu_variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = variant ? variant.price : dish.base_price;
  const addons = dish.menu_addons.filter((a) => addonIds.includes(a.id));
  const total = (unitPrice + addons.reduce((sum, a) => sum + a.price, 0)) * quantity;

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  function add() {
    addLine({
      itemId: dish.id,
      itemName: dish.name,
      isVeg: dish.is_veg,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      unitPrice,
      addons: addons.map(({ id, name, price }) => ({ id, name, price })),
      quantity,
      specialInstructions: instructions.trim(),
    });
    onAdded();
  }

  return (
    <div className="order-panel">
      {dish.menu_variants.length > 0 ? (
        <section className="detail-section">
          <h2>Taille</h2>
          <div className="choice-list">
            {dish.menu_variants.map((option) => (
              <button
                key={option.id}
                type="button"
                className={option.id === variantId ? "selected" : ""}
                onClick={() => setVariantId(option.id)}
                aria-pressed={option.id === variantId}
              >
                <span>{option.name}</span>
                <small>{formatCurrency(option.price)}</small>
                <span className="radio">{option.id === variantId ? <Check size={14} /> : null}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {dish.menu_addons.length > 0 ? (
        <section className="detail-section">
          <h2>Suppléments</h2>
          <div className="choice-list">
            {dish.menu_addons.map((addon) => {
              const selected = addonIds.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  type="button"
                  className={selected ? "selected" : ""}
                  onClick={() => toggleAddon(addon.id)}
                  aria-pressed={selected}
                >
                  <span>{addon.name}</span>
                  <small>+ {formatCurrency(addon.price)}</small>
                  <span className="radio square">{selected ? <Check size={14} /> : null}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="detail-section">
        <label className="field-label">
          Instructions pour la cuisine (facultatif)
          <textarea
            className="compact"
            value={instructions}
            maxLength={300}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Ex. : moins pimenté, sans oignons…"
          />
        </label>
      </section>

      <div className="add-row">
        <QuantityStepper
          value={quantity}
          onChange={(next) => setQuantity(Math.max(1, next))}
          label="Quantité"
        />
        <button type="button" className="btn btn-primary" onClick={add}>
          <ShoppingBag size={19} /> Ajouter · {formatCurrency(total)}
        </button>
      </div>
    </div>
  );
}

/** Floating "view cart" button, above the bottom navigation. */
export function GuestCartBar({ onOpen }: { onOpen: () => void }) {
  const { itemCount, subtotal } = useCart();
  if (itemCount === 0) return null;

  return (
    <>
      <div className="cart-bar-spacer" aria-hidden />
      <button type="button" className="cart-bar" onClick={onOpen}>
        <span className="cart-count">{itemCount}</span>
        <span>Voir le panier</span>
        <strong>{formatCurrency(subtotal)}</strong>
      </button>
    </>
  );
}

export function CartScreen({
  restaurantSlug,
  branchSlug,
  tableId,
  menu,
}: {
  restaurantSlug: string;
  branchSlug: string;
  tableId: string;
  menu: () => void;
}) {
  const router = useRouter();
  const { lines, updateQuantity, removeLine, clear, subtotal } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await placeOrder({
        restaurantSlug,
        branchSlug,
        tableId,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          variantId: line.variantId,
          addonIds: line.addons.map((addon) => addon.id),
          quantity: line.quantity,
          specialInstructions: line.specialInstructions,
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
      router.push(`/menu/${restaurantSlug}/${branchSlug}/order/${result.orderId}`);
    });
  }

  if (lines.length === 0) {
    return (
      <div className="screen animate-in">
        <div className="empty-state">
          <ShoppingBag size={34} />
          <h3>Votre panier est vide</h3>
          <p>Choisissez un plat dans le menu pour l’ajouter ici.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={menu}>
          Voir le menu
        </button>
      </div>
    );
  }

  return (
    <div className="screen cart-screen animate-in">
      <div className="page-heading">
        <p className="eyebrow">VOTRE COMMANDE</p>
        <h1>Panier</h1>
        <p>Vérifiez votre commande avant de l’envoyer en cuisine.</p>
      </div>

      <div className="cart-lines">
        {lines.map((line) => (
          <article key={line.key} className="cart-line">
            <div className="cart-line-copy">
              <strong>{line.itemName}</strong>
              {line.variantName ? <small>{line.variantName}</small> : null}
              {line.addons.length > 0 ? <small>+ {line.addons.map((a) => a.name).join(", ")}</small> : null}
              {line.specialInstructions ? <em>« {line.specialInstructions} »</em> : null}
            </div>
            <b>{formatCurrency(lineTotal(line))}</b>
            <div className="cart-line-actions">
              <QuantityStepper
                value={line.quantity}
                onChange={(next) => updateQuantity(line.key, next)}
                label={`Quantité de ${line.itemName}`}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => removeLine(line.key)}
                aria-label={`Retirer ${line.itemName}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="cart-total">
        <span>Sous-total</span>
        <strong>{formatCurrency(subtotal)}</strong>
      </div>
      <p className="cart-note">
        Les taxes, les frais de service et la réduction éventuelle sont calculés à l’envoi de la commande.
      </p>

      <div className="cart-fields">
        <label className="text-field">
          Code promo (facultatif)
          <input
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
            placeholder="Ex. MIDI20"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <label className="text-field">
          Votre nom (facultatif)
          <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" />
        </label>
        <label className="text-field">
          Téléphone (facultatif)
          <input
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="06 000 00 00"
          />
        </label>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="button" className="btn btn-primary" onClick={submit} disabled={isPending}>
        {isPending ? "Envoi en cuisine…" : `Commander · ${formatCurrency(subtotal)}`}
      </button>
      <button type="button" className="btn btn-ghost" onClick={menu} disabled={isPending}>
        Continuer mes achats
      </button>
    </div>
  );
}

/** The table's orders, each linking to its live tracking page. */
export function TableOrders({
  orders,
  restaurantSlug,
  branchSlug,
}: {
  orders: TableOrder[];
  restaurantSlug: string;
  branchSlug: string;
}) {
  if (orders.length === 0) return null;

  return (
    <section className="table-orders">
      <h2>Mes commandes</h2>
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/menu/${restaurantSlug}/${branchSlug}/order/${order.id}`}
          className="table-order"
        >
          <span>
            <strong>Commande n° {order.order_number}</strong>
            <small>{formatCurrency(order.total_amount)}</small>
          </span>
          <span className={`status-badge ${isOrderInProgress(order) ? "active" : "success"}`}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          <ChevronRight size={18} />
        </Link>
      ))}
    </section>
  );
}
