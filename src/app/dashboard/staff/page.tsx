import QRCode from "qrcode";

import { AddStaffForm } from "@/components/dashboard/add-staff-form";
import { StaffActiveToggle } from "@/components/dashboard/staff-active-toggle";
import { StaffLoginCard } from "@/components/dashboard/staff-login-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABEL } from "@/lib/labels";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

export default async function StaffPage() {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const loginUrl = `${siteUrl}/staff?r=${restaurant.restaurantSlug}`;
  const loginQr = await QRCode.toDataURL(loginUrl, { margin: 1, width: 220 });

  const [{ data: branches }, { data: staff }] = await Promise.all([
    supabase.from("branches").select("id, name").eq("restaurant_id", restaurant.restaurantId),
    supabase
      .from("staff")
      .select("id, name, role, is_active, branches!staff_branch_id_fkey(name)")
      .eq("restaurant_id", restaurant.restaurantId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Personnel</h1>
        <p className="text-muted-foreground">
          Les serveurs, la cuisine et la caisse se connectent avec leur rôle et un code PIN.
          Désactiver un compte le déconnecte immédiatement.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connexion du personnel</CardTitle>
          <CardDescription>Comment votre équipe accède à Servio depuis son propre téléphone.</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffLoginCard
            loginUrl={loginUrl}
            qrDataUrl={loginQr}
            restaurantCode={restaurant.restaurantSlug}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un membre</CardTitle>
          <CardDescription>
            Rôles de salle uniquement. Un gérant a besoin du tableau de bord complet, inaccessible
            avec un PIN : créez-lui plutôt un compte propriétaire ou gérant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {branches && branches.length > 0 ? (
            <AddStaffForm branches={branches} />
          ) : (
            <p className="text-sm text-muted-foreground">Créez d’abord une succursale.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Équipe</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(staff ?? []).map((member) => (
            <div key={member.id} className="flex items-center justify-between border-b py-2 last:border-0">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(member.branches as unknown as { name: string } | null)?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{ROLE_LABEL[member.role]}</Badge>
                {!member.is_active && <Badge variant="destructive">Désactivé</Badge>}
                <StaffActiveToggle staffId={member.id} isActive={member.is_active} />
              </div>
            </div>
          ))}
          {(!staff || staff.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucun membre pour l’instant.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
