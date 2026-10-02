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
          <h1 className="text-2xl font-semibold">Branding</h1>
          <p className="text-muted-foreground">
            Change how your QR menu looks. Your menu items and prices stay exactly as they are.
          </p>
        </div>
        {branch && previewTable ? (
          <Link
            href={`/menu/${restaurant.restaurantSlug}/${branch.slug}/${previewTable.id}`}
            target="_blank"
            className="text-sm underline underline-offset-4"
          >
            Preview live menu →
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template & colours</CardTitle>
          <CardDescription>
            Switching template never changes your menu data — only its presentation.
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
