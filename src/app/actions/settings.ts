"use server";

import { revalidatePath } from "next/cache";

import { formValues, type FormValues } from "@/lib/form-values";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { userFacingError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

const FIELDS = ["name", "phone", "description", "taxPercent", "serviceChargePercent"] as const;

export type SettingsActionState = {
  error: string | null;
  success: boolean;
  /** What was typed, sent back on error so the form keeps it. */
  values?: FormValues<(typeof FIELDS)[number]>;
};

export async function updateRestaurantProfile(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const taxPercent = Number(formData.get("taxPercent") ?? 0);
  const serviceChargePercent = Number(formData.get("serviceChargePercent") ?? 0);
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim() || null;
  const values = formValues(formData, FIELDS);
  if (!name) {
    return { error: "Indiquez le nom du restaurant.", success: false, values };
  }

  for (const percent of [taxPercent, serviceChargePercent]) {
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return {
        error: "La taxe et les frais de service doivent être compris entre 0 et 100 %.",
        success: false,
        values,
      };
    }
  }

  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const { error } = await supabase
    .from("restaurants")
    .update({
      name,
      phone,
      description,
      tax_percent: Number.isFinite(taxPercent) ? taxPercent : 0,
      service_charge_percent: Number.isFinite(serviceChargePercent) ? serviceChargePercent : 0,
      logo_url: logoUrl,
      cover_image_url: coverImageUrl,
    })
    .eq("id", restaurant.restaurantId);

  if (error) {
    return {
      error: userFacingError(error, "Une erreur est survenue. Réessayez."),
      success: false,
      values,
    };
  }

  revalidatePath("/dashboard/settings");
  return { error: null, success: true };
}
