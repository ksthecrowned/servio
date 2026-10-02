"use client";

import { useState, useTransition } from "react";
import { Banknote } from "lucide-react";

import { markBillPaid } from "@/app/actions/staff-ops";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

type Bill = {
  id: string;
  total_amount: number;
  tableLabel: string;
};

/** Cash only for now: Mobile Money and card come back with a payment provider. */
export function BillCard({ bill }: { bill: Bill }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">Table {bill.tableLabel}</p>
          <p className="text-xl font-semibold">{formatCurrency(bill.total_amount)}</p>
        </div>

        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await markBillPaid(bill.id);
              setError(result.error);
            })
          }
        >
          <Banknote className="size-4" />
          {isPending ? "Enregistrement…" : "Encaisser en espèces"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
