import { QrCode } from "lucide-react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function mark(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "S"
  );
}

export default async function BranchMenuPage(props: PageProps<"/menu/[restaurant]/[branch]">) {
  const { restaurant: restaurantSlug, branch: branchSlug } = await props.params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("slug", restaurantSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!restaurant) notFound();

  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("slug", branchSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!branch) notFound();

  return (
    <div className="access-screen">
      <div className="access-brand">
        <span className="brand-mark large">{mark(restaurant.name)}</span>
        <strong>{restaurant.name}</strong>
      </div>
      <div className="access-content">
        <span className="access-icon">
          <QrCode size={26} />
        </span>
        <p className="eyebrow">ACCÈS À LA TABLE</p>
        <h1>Scannez le QR de votre table</h1>
        <p>Le menu s’ouvre uniquement depuis le QR posé sur votre table.</p>
      </div>
    </div>
  );
}
