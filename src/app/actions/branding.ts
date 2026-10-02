"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentRestaurant } from "@/lib/restaurant";
import { loadPlanAccess } from "@/lib/subscription";
import { userFacingError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type BrandingActionState = { error: string | null; success: boolean };

const HEX = /^#[0-9a-fA-F]{6}$/;

const FONTS = ["sans", "serif", "mono"];

export async function updateBranding(
  _prevState: BrandingActionState,
  formData: FormData,
): Promise<BrandingActionState> {
  const templateId = String(formData.get("templateId") ?? "") || null;
  const primaryColor = String(formData.get("primaryColor") ?? "").trim();
  const fontFamily = String(formData.get("fontFamily") ?? "").trim();

  if (primaryColor && !HEX.test(primaryColor)) {
    return { error: "La couleur doit être au format hexadécimal, par exemple #C2410C.", success: false };
  }

  if (fontFamily && !FONTS.includes(fontFamily)) {
    return { error: "Police inconnue.", success: false };
  }

  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  if (templateId) {
    // Reject a template id that isn't a real template rather than storing a
    // dangling reference.
    const { data: template } = await supabase
      .from("templates")
      .select("id, is_premium")
      .eq("id", templateId)
      .maybeSingle();

    if (!template) {
      return { error: "Ce modèle n’existe plus.", success: false };
    }

    // Enforced here, not only by the locked cards in the form.
    if (template.is_premium) {
      const access = await loadPlanAccess(supabase, restaurant.restaurantId);
      if (access.effectiveTier === "starter") {
        return { error: "Les modèles premium nécessitent la formule Business ou Pro.", success: false };
      }
    }
  }

  const { error } = await supabase.from("restaurant_themes").upsert(
    {
      restaurant_id: restaurant.restaurantId,
      template_id: templateId,
      primary_color: primaryColor || null,
      font_family: fontFamily || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "restaurant_id" },
  );

  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez."), success: false };

  revalidatePath("/dashboard/branding");
  return { error: null, success: true };
}
