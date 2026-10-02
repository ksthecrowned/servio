import type { Enums } from "@/lib/supabase/types";

/**
 * French display labels for database enum values. The database keeps the
 * English identifiers; these are what owners see in the dashboard.
 */

export const ORDER_STATUS_LABEL: Record<Enums<"order_status">, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  preparing: "En préparation",
  ready: "Prête",
  served: "Servie",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const TABLE_STATUS_LABEL: Record<Enums<"table_status">, string> = {
  available: "Libre",
  occupied: "Occupée",
  order_pending: "Commande en attente",
  preparing: "En préparation",
  ready: "Commande prête",
  bill_requested: "Addition demandée",
  cleaning: "À débarrasser",
};

export const ROLE_LABEL: Record<Enums<"restaurant_role">, string> = {
  owner: "Propriétaire",
  manager: "Gérant",
  waiter: "Serveur",
  kitchen: "Cuisine",
  cashier: "Caisse",
};

export const OFFER_TYPE_LABEL: Record<Enums<"offer_type">, string> = {
  percentage: "Pourcentage",
  flat: "Montant fixe",
  bogo: "1 acheté = 1 offert",
  combo: "Combo",
  happy_hour: "Happy hour",
};

export const RESTAURANT_STATUS_LABEL: Record<Enums<"restaurant_status">, string> = {
  active: "Actif",
  suspended: "Suspendu",
  closed: "Fermé",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<Enums<"subscription_status">, string> = {
  trialing: "Essai",
  active: "Actif",
  past_due: "Paiement en retard",
  cancelled: "Résilié",
  expired: "Expiré",
};

export const PAYMENT_STATUS_LABEL: Record<Enums<"payment_status">, string> = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
};
