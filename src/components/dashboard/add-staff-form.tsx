"use client";

import { useActionState } from "react";

import { addStaff } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddStaffForm({ branches }: { branches: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(addStaff, { error: null });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="staffName">Nom</Label>
        <Input
          id="staffName"
          name="name"
          placeholder="Grâce"
          required
          className="w-40"
          defaultValue={state.values?.name}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="role">Rôle</Label>
        {/* A select only applies defaultValue when it mounts: the key remounts it
            so that the form reset after an action shows the returned value. */}
        <select
          key={state.values?.role}
          id="role"
          name="role"
          required
          defaultValue={state.values?.role}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
        >
          <option value="waiter">Serveur</option>
          <option value="kitchen">Cuisine</option>
          <option value="cashier">Caisse</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="branchId">Succursale</Label>
        <select
          key={state.values?.branchId}
          id="branchId"
          name="branchId"
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
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          placeholder="4 chiffres"
          pattern="\d{4}"
          minLength={4}
          maxLength={4}
          required
          className="w-32"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Ajout…" : "Ajouter"}
      </Button>
      {state.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
