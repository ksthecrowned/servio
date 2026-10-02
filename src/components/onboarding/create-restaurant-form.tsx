"use client";

import { useActionState } from "react";

import { createRestaurant } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateRestaurantForm() {
  const [state, formAction, isPending] = useActionState(createRestaurant, { error: null });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Créez votre restaurant</CardTitle>
        <CardDescription>
          Nous créons aussi votre première succursale ; vous pourrez ensuite ajouter vos tables et
          votre menu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom du restaurant</Label>
            <Input
              id="name"
              name="name"
              placeholder="Chez Mama Ngoma"
              required
              defaultValue={state.values?.name}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branchName">Nom de la première succursale</Label>
            <Input
              id="branchName"
              name="branchName"
              placeholder="Succursale principale"
              defaultValue={state.values?.branchName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cuisineType">Type de cuisine</Label>
            <Input
              id="cuisineType"
              name="cuisineType"
              placeholder="Congolaise, boulangerie, fast-food…"
              defaultValue={state.values?.cuisineType}
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Création…" : "Créer le restaurant"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
