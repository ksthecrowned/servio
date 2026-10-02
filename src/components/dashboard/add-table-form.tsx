"use client";

import { useActionState } from "react";

import { addTable } from "@/app/actions/tables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddTableForm({ branches }: { branches: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(addTable, { error: null });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branchId">Succursale</Label>
        {/* A select only applies defaultValue when it mounts: the key remounts it
            so that the form reset after an action shows the returned value. */}
        <select
          key={state.values?.branchId}
          id="branchId"
          name="branchId"
          required
          defaultValue={state.values?.branchId}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="label">Nom de la table</Label>
        <Input
          id="label"
          name="label"
          placeholder="Table 05"
          required
          className="w-40"
          defaultValue={state.values?.label}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Ajout…" : "Ajouter la table"}
      </Button>
      {state.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
