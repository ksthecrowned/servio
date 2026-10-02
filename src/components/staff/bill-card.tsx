"use client";

import { useState, useTransition } from "react";
import { Wallet } from "lucide-react";

import { markBillPaid } from "@/app/actions/staff-ops";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

type Bill = {
  id: string;
  total_amount: number;
  tableLabel: string;
};

const METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Carte" },
] as const;

export function BillCard({ bill }: { bill: Bill }) {
  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>("cash");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">Table {bill.tableLabel}</p>
          <p className="text-xl font-semibold">{formatCurrency(bill.total_amount)}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={cn(
                "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                method === m.value ? "border-brand bg-brand text-brand-foreground" : "hover:bg-accent",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await markBillPaid(bill.id, method);
              setError(result.error);
            })
          }
        >
          <Wallet className="size-4" />
          {isPending ? "Enregistrement…" : `Encaisser · ${METHODS.find((m) => m.value === method)?.label}`}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
