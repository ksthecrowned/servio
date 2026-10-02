"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { clientIp } from "@/lib/client-ip";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  signStaffSession,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE_SECONDS,
  type StaffRole,
} from "@/lib/staff-session";
import { ROLE_LABEL } from "@/lib/labels";
import { verifyPin } from "@/lib/staff-pin";
import { userFacingError } from "@/lib/supabase/errors";

export type StaffLoginState = { error: string | null };

const ROLE_HOME: Record<StaffRole, string> = {
  waiter: "/staff/waiter",
  kitchen: "/staff/kitchen",
  cashier: "/staff/cashier",
};

function isStaffRole(value: string): value is StaffRole {
  return Object.hasOwn(ROLE_HOME, value);
}

/**
 * Resolves a restaurant code to its display name, so the sign-in screen can
 * confirm "Chez Mama Ngoma" before anyone starts tapping a PIN.
 */
export async function lookupRestaurant(
  code: string,
): Promise<{ slug: string; name: string } | { error: string }> {
  const slug = code.trim().toLowerCase();
  if (!slug) return { error: "Saisissez le code de votre restaurant." };

  const admin = createAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("slug, name, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!restaurant || restaurant.status !== "active") {
    return { error: "Aucun restaurant ne correspond à ce code. Demandez à votre responsable de le vérifier." };
  }

  return { slug: restaurant.slug, name: restaurant.name };
}

export async function staffLogin(
  _prevState: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  const restaurantSlug = String(formData.get("restaurantSlug") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const pin = String(formData.get("pin") ?? "");

  if (!restaurantSlug) return { error: "Saisissez le code de votre restaurant." };
  if (!isStaffRole(role)) return { error: "Choisissez votre rôle." };
  if (!/^\d{4}$/.test(pin)) return { error: "Saisissez votre PIN à 4 chiffres." };

  const admin = createAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id")
    .eq("slug", restaurantSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!restaurant) {
    return { error: "Aucun restaurant ne correspond à ce code. Demandez à votre responsable de le vérifier." };
  }

  const { data: candidates } = await admin
    .from("staff")
    .select("id, name, branch_id, pin_hash")
    .eq("restaurant_id", restaurant.id)
    .eq("role", role)
    .eq("is_active", true);

  if (!candidates || candidates.length === 0) {
    return { error: `Aucun compte ${ROLE_LABEL[role].toLowerCase()} n’existe encore. Demandez à votre responsable de vous ajouter.` };
  }

  // Recorded before the PIN is checked, so parallel guesses are counted
  // too; refused once the restaurant/device has too many recent failures.
  const { data: attemptId, error: throttleError } = await admin.rpc("begin_staff_login_attempt", {
    p_restaurant_id: restaurant.id,
    p_role: role,
    p_ip: await clientIp(),
  });

  if (throttleError || !attemptId) {
    return { error: userFacingError(throttleError, "La connexion est indisponible pour le moment. Réessayez dans un instant.") };
  }

  const matches = candidates.filter((candidate) => verifyPin(pin, candidate.pin_hash));

  if (matches.length === 0) {
    return { error: "Ce PIN est incorrect. Réessayez ou demandez à votre responsable." };
  }

  // Two active accounts in one role sharing a PIN (possible after a
  // reactivation) would be indistinguishable: refuse rather than sign in as
  // whoever happens to come first.
  if (matches.length > 1) {
    return { error: "Ce PIN est utilisé par plusieurs comptes. Demandez à votre responsable de le changer." };
  }

  const [match] = matches;

  await admin.rpc("complete_staff_login_attempt", { p_attempt_id: attemptId });

  const cookieStore = await cookies();
  cookieStore.set(
    STAFF_SESSION_COOKIE,
    signStaffSession({
      staffId: match.id,
      restaurantId: restaurant.id,
      branchId: match.branch_id,
      role,
      name: match.name,
    }),
    { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: STAFF_SESSION_MAX_AGE_SECONDS },
  );

  redirect(ROLE_HOME[role]);
}

export async function staffLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
  redirect("/staff");
}
