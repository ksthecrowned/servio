"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpOwner } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signUpOwner, {
    error: null,
    notice: null,
  });

  if (state.notice) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Confirmez votre adresse e-mail</CardTitle>
          <CardDescription>{state.notice}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm underline underline-offset-4">
            Aller à la connexion
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Créez votre compte Servio</CardTitle>
        <CardDescription>Configurez votre restaurant en quelques minutes.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Votre nom</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              autoComplete="name"
              defaultValue={state.values?.fullName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={state.values?.email}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mot de passe (8 caractères minimum)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Création du compte…" : "Créer mon compte"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Se connecter
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
