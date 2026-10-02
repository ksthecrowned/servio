import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatCurrency } from "@/lib/currency";

import { AutoRefresh } from "@/components/auto-refresh";
import { FeedbackForm } from "@/components/menu/feedback-form";
import { OrderStatusStepper } from "@/components/menu/order-status-stepper";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import { createAdminClient } from "@/lib/supabase/admin";

type AddonSelection = { name: string; price: number }[];

export default async function OrderTrackingPage(
  props: PageProps<"/menu/[restaurant]/[branch]/order/[orderId]">,
) {
  const { restaurant: restaurantSlug, branch: branchSlug, orderId } = await props.params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      `id, order_number, status, subtotal, discount_amount, tax_amount, service_charge_amount, total_amount, created_at,
       restaurants!inner(name, slug), branches!orders_branch_id_fkey!inner(name, slug),
       table_sessions!orders_table_session_id_fkey(table_id),
       order_items(id, item_name, variant_name, unit_price, quantity, addon_selection)`,
    )
    .eq("id", orderId)
    .maybeSingle();

  const restaurant = order?.restaurants as unknown as { name: string; slug: string } | undefined;
  const branch = order?.branches as unknown as { name: string; slug: string } | undefined;

  if (!order || restaurant?.slug !== restaurantSlug || branch?.slug !== branchSlug) {
    notFound();
  }

  const isFinal = ["served", "completed", "cancelled"].includes(order.status);
  const tableId = order.table_sessions?.table_id ?? null;

  let hasFeedback = false;
  if (isFinal && order.status !== "cancelled") {
    const { data: feedback } = await admin
      .from("feedback")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();
    hasFeedback = Boolean(feedback);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-4 pb-16">
      {!isFinal && <AutoRefresh intervalMs={4000} />}

      {tableId ? (
        <Link
          href={`/menu/${restaurantSlug}/${branchSlug}/${tableId}`}
          className="flex w-fit items-center gap-2 pt-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" /> Retour au menu
        </Link>
      ) : null}

      <div className="pt-6 text-center">
        <p className="text-sm text-muted-foreground">{restaurant?.name}</p>
        <h1 className="text-2xl font-semibold">Commande n° {order.order_number}</h1>
        <Badge className="mt-2">{ORDER_STATUS_LABEL[order.status]}</Badge>
      </div>

      <div className="rounded-lg border p-4">
        <OrderStatusStepper status={order.status} />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <h2 className="font-medium">Articles</h2>
        {order.order_items.map((item) => {
          // Add-ons are priced per unit, like on the server (place_order).
          const addons = (item.addon_selection ?? []) as AddonSelection;
          const addonsTotal = addons.reduce((sum, addon) => sum + Number(addon.price), 0);
          return (
            <div key={item.id} className="flex justify-between gap-4 text-sm">
              <span>
                {item.item_name}
                {item.variant_name ? ` (${item.variant_name})` : ""} × {item.quantity}
                {addons.length > 0 ? (
                  <span className="block text-xs text-muted-foreground">
                    + {addons.map((addon) => addon.name).join(", ")}
                  </span>
                ) : null}
              </span>
              <span className="whitespace-nowrap">
                {formatCurrency((item.unit_price + addonsTotal) * item.quantity)}
              </span>
            </div>
          );
        })}

        <div className="mt-2 flex flex-col gap-1 border-t pt-2 text-sm">
          <div className="flex justify-between"><span>Sous-total</span><span>{formatCurrency(order.subtotal)}</span></div>
          {order.discount_amount > 0 && <div className="flex justify-between text-brand"><span>Réduction</span><span>−{formatCurrency(order.discount_amount)}</span></div>}
          <div className="flex justify-between"><span>Taxes</span><span>{formatCurrency(order.tax_amount)}</span></div>
          <div className="flex justify-between"><span>Service</span><span>{formatCurrency(order.service_charge_amount)}</span></div>
          <div className="flex justify-between font-medium"><span>Total</span><span>{formatCurrency(order.total_amount)}</span></div>
        </div>
      </div>

      {isFinal && order.status !== "cancelled" && (
        hasFeedback ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="font-medium">Merci pour votre avis.</p>
            <p className="mt-1 text-sm text-muted-foreground">Votre retour a bien été enregistré.</p>
          </div>
        ) : (
          <FeedbackForm orderId={order.id} restaurantSlug={restaurantSlug} branchSlug={branchSlug} />
        )
      )}
    </div>
  );
}
