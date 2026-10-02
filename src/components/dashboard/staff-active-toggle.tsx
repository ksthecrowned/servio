"use client";

import { useState, useTransition } from "react";

import { setStaffActive } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";

export function StaffActiveToggle({ staffId, isActive }: { staffId: string; isActive: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await setStaffActive(staffId, !isActive);
            setError(result.error);
          })
        }
      >
        {isPending ? "Enregistrement…" : isActive ? "Désactiver" : "Réactiver"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
