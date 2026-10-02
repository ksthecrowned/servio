import Link from "next/link";

import { BrandingForm } from "@/components/dashboard/branding-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { loadPlanAccess } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export default async function BrandingPage() {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const [{ data: templates }, { data: theme }, access, { data: branch }] =
    await Promise.all([
      supabase.from("templates").select("id, slug, name, is_premium").order("is_premium"),
      supabase
        .from("restaurant_themes")
        .select("template_id, primary_color, font_family")
        .eq("restaurant_id", restaurant.restaurantId)
        .maybeSingle(),
      loadPlanAccess(supabase, restaurant.restaurantId),
      supabase
        .from("branches")
        .select("id, slug")
        .eq("restaurant_id", restaurant.restaurantId)
        .limit(1)
        .maybeSingle(),
    ]);

  const { data: previewTable } = branch
    ? await supabase
        .from("restaurant_tables")
        .select("id")
        .eq("branch_id", branch.id)
        .order("label")
        .limit(1)
        .maybeSingle()
    : { data: null };

  // A running trial has Business-level features (PRD section 48).
  const canUsePremium = access.effectiveTier !== "starter";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Apparence</h1>
          <p className="text-muted-foreground">
            Changez l’apparence de votre menu QR. Vos plats et vos prix restent exactement les mêmes.
          </p>
        </div>
        {branch && previewTable ? (
          <Link
            href={`/menu/${restaurant.restaurantSlug}/${branch.slug}/${previewTable.id}`}
            target="_blank"
            className="text-sm underline underline-offset-4"
          >
            Voir le menu en ligne →
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modèle et couleurs</CardTitle>
          <CardDescription>
            Changer de modèle ne modifie jamais le contenu du menu, seulement sa présentation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm
            templates={templates ?? []}
            current={theme}
            canUsePremium={canUsePremium}
          />
        </CardContent>
      </Card>
    </div>
  );
}
