"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formValues, type FormValues } from "@/lib/form-values";
import { slugify } from "@/lib/slug";
import { userFacingError } from "@/lib/supabase/errors";

const FIELDS = ["name", "branchName", "cuisineType"] as const;

export type OnboardingState = {
  error: string | null;
  /** What was typed, sent back on error so the form keeps it. */
  values?: FormValues<(typeof FIELDS)[number]>;
};

export async function createRestaurant(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const name = String(formData.get("name") ?? "").trim();
  const branchName = String(formData.get("branchName") ?? "").trim() || "Succursale principale";
  const cuisineType = String(formData.get("cuisineType") ?? "").trim() || null;

  const values = formValues(formData, FIELDS);

  if (!name) {
    return { error: "Indiquez le nom du restaurant.", values };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const baseSlug = slugify(name) || "restaurant";
  const slug = `${baseSlug}-${user.id.slice(0, 6)}`;

  // Restaurant, owner membership, first branch and the 14-day trial are
  // created in one transaction: a failure can't leave half a restaurant.
  const { error } = await supabase.rpc("create_restaurant", {
    p_slug: slug,
    p_name: name,
    p_branch_name: branchName,
    p_cuisine_type: cuisineType ?? undefined,
  });

  if (error) {
    return {
      error: userFacingError(error, "Impossible de créer le restaurant. Réessayez."),
      values,
    };
  }

  redirect("/dashboard");
}
