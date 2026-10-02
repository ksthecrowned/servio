"use server";

import { redirect } from "next/navigation";

import type { AuthError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string | null; notice?: string | null };

/** Supabase Auth answers in English; show owners a French message instead. */
const AUTH_ERROR_FR: Record<string, string> = {
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  email_not_confirmed: "Confirmez d’abord votre adresse e-mail grâce au lien reçu.",
  user_already_exists: "Un compte existe déjà avec cette adresse e-mail.",
  email_exists: "Un compte existe déjà avec cette adresse e-mail.",
  weak_password: "Mot de passe trop faible : utilisez au moins 8 caractères.",
  email_address_invalid: "Adresse e-mail invalide.",
  validation_failed: "Vérifiez l’adresse e-mail et le mot de passe.",
  over_email_send_rate_limit: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
  over_request_rate_limit: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
  signup_disabled: "Les inscriptions sont fermées pour le moment.",
};

function authErrorMessage(error: AuthError): string {
  const message = error.code ? AUTH_ERROR_FR[error.code] : undefined;
  if (message) return message;
  console.error(error);
  return "Une erreur est survenue. Réessayez.";
}

export async function signUpOwner(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: authErrorMessage(error) };
  }

  // With "Confirm email" enabled (the Supabase default), signUp creates the
  // user but returns no session until the emailed link is clicked. Redirecting
  // to /onboarding here would bounce straight back to /login and look like the
  // signup silently failed, so say what actually happened instead.
  if (!data.session) {
    return {
      error: null,
      notice: `Compte créé. Ouvrez le lien de confirmation envoyé à ${email}, puis connectez-vous.`,
    };
  }

  redirect("/onboarding");
}

export async function signInOwner(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: authErrorMessage(error) };
  }

  redirect("/dashboard");
}

export async function signOutOwner() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
