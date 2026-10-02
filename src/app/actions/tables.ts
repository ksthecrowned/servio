"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentRestaurant } from "@/lib/restaurant";
import { userFacingError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type TableActionState = { error: string | null };

export async function addTable(
  _prevState: TableActionState,
  formData: FormData,
): Promise<TableActionState> {
  const branchId = String(formData.get("branchId") ?? "");
  const label = String(formData.get("label") ?? "").trim();

  if (!branchId || !label) {
    return { error: "La succursale et le nom de la table sont obligatoires." };
  }

  await requireCurrentRestaurant();
  const supabase = await createClient();

  const { error } = await supabase.from("restaurant_tables").insert({ branch_id: branchId, label });

  if (error?.code === "23505") {
    return { error: `Une table « ${label} » existe déjà dans cette succursale.` };
  }
  if (error) {
    return { error: userFacingError(error, "Une erreur est survenue. Réessayez.") };
  }

  revalidatePath("/dashboard/tables");
  return { error: null };
}

/**
 * Assigns a table to a waiter (or clears it with null). The database checks
 * the waiter is active and works in the table's branch.
 */
export async function assignTableWaiter(
  tableId: string,
  staffId: string | null,
): Promise<TableActionState> {
  const restaurant = await requireCurrentRestaurant();
  const supabase = await createClient();

  const { data: table } = await supabase
    .from("restaurant_tables")
    .select("id, branches!inner(restaurant_id)")
    .eq("id", tableId)
    .eq("branches.restaurant_id", restaurant.restaurantId)
    .maybeSingle();

  if (!table) return { error: "Table introuvable." };

  const { error } = await supabase
    .from("restaurant_tables")
    .update({ assigned_staff_id: staffId })
    .eq("id", tableId);

  if (error) return { error: userFacingError(error, "Une erreur est survenue. Réessayez.") };

  revalidatePath("/dashboard/tables");
  return { error: null };
}
