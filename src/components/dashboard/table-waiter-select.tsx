"use client";

import { useState, useTransition } from "react";

import { assignTableWaiter } from "@/app/actions/tables";

export function TableWaiterSelect({
  tableId,
  tableLabel,
  assignedStaffId,
  waiters,
}: {
  tableId: string;
  tableLabel: string;
  assignedStaffId: string | null;
  waiters: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <select
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
        value={assignedStaffId ?? ""}
        disabled={isPending}
        aria-label={`Serveur attitré de ${tableLabel}`}
        onChange={(event) => {
          const staffId = event.target.value || null;
          setError(null);
          startTransition(async () => {
            const result = await assignTableWaiter(tableId, staffId);
            setError(result.error);
          });
        }}
      >
        <option value="">Aucun serveur attitré</option>
        {waiters.map((waiter) => (
          <option key={waiter.id} value={waiter.id}>
            {waiter.name}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
