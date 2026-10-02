import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { requireCurrentRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";
import { OfferForm } from "@/components/dashboard/offer-form";

const typeLabels: Record<string, string> = {
  percentage: "Pourcentage",
  flat: "Montant fixe",
  bogo: "1 acheté = 1 offert",
  combo: "Combo",
  happy_hour: "Happy hour",
};

export default async function OffersPage() {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const { data: offers } = await supabase
    .from("offers")
    .select("id, name, type, percentage_value, flat_value, min_order_value, max_discount_value, starts_on, ends_on, is_active")
    .eq("restaurant_id", restaurant.restaurantId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offres</h1>
          <p className="text-muted-foreground">Créez des réductions simples en XAF et gérez leur période d’activation.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild><Button>Nouvelle offre</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Créer une offre</DialogTitle></DialogHeader><OfferForm /></DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Vos offres</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(offers ?? []).map((offer) => (
            <div key={offer.id} className="flex flex-col gap-3 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{offer.name}</p>
                <p className="text-xs text-muted-foreground">{typeLabels[offer.type] ?? offer.type}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={offer.is_active ? "brand" : "outline"}>{offer.is_active ? "Active" : "Inactive"}</Badge>
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline" size="sm">Modifier</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Modifier l’offre</DialogTitle></DialogHeader><OfferForm offer={offer} /></DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
          {(!offers || offers.length === 0) && <p className="text-sm text-muted-foreground">Aucune offre. Créez votre première promotion.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
