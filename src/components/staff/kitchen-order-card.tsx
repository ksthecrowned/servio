"use client";

import { useTransition } from "react";

import { advanceOrderStatus } from "@/app/actions/staff-ops";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUS_LABEL } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/types";

const ACTION_LABEL: Partial<Record<Enums<"order_status">, string>> = {
  pending: "Accepter",
  accepted: "Lancer la préparation",
  preparing: "Marquer prête",
};

type OrderItem = { id: string; item_name: string; quantity: number };

export function KitchenOrderCard({
  order,
}: {
  order: {
    id: string;
    order_number: number;
    status: Enums<"order_status">;
    order_items: OrderItem[];
    tableLabel: string | null;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const actionLabel = ACTION_LABEL[order.status];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          {order.tableLabel ? `Table ${order.tableLabel}` : `Commande n° ${order.order_number}`}
        </CardTitle>
        <Badge>{ORDER_STATUS_LABEL[order.status]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="text-sm">
          {order.order_items.map((item) => (
            <li key={item.id}>
              {item.item_name} × {item.quantity}
            </li>
          ))}
        </ul>
        {actionLabel ? (
          <Button
            disabled={isPending}
            onClick={() => startTransition(() => advanceOrderStatus(order.id))}
          >
            {isPending ? "Mise à jour…" : actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
