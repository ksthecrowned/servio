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
