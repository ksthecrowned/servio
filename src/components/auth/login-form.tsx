"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInOwner } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInOwner, { error: null });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Connexion à Servio</CardTitle>
        <CardDescription>Gérez votre restaurant depuis un seul tableau de bord.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Connexion…" : "Se connecter"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Nouveau sur Servio ?{" "}
            <Link href="/signup" className="text-foreground underline underline-offset-4">
              Créer un compte
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
