"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  signStaffSession,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE_SECONDS,
  type StaffRole,
} from "@/lib/staff-session";
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
 * Client IP for sign-in throttling. On Vercel the first x-forwarded-for
 * entry is set by the platform and cannot be spoofed; behind another proxy
 * make sure it overwrites the header. If it is spoofable, only the per-IP
 * limit is weakened — the per-role limit still applies.
 */
async function clientIp(): Promise<string> {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Resolves a restaurant code to its display name, so the sign-in screen can
 * confirm "The Coffee House" before anyone starts tapping a PIN.
 */
export async function lookupRestaurant(
  code: string,
): Promise<{ slug: string; name: string } | { error: string }> {
  const slug = code.trim().toLowerCase();
  if (!slug) return { error: "Enter your restaurant code." };

  const admin = createAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("slug, name, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!restaurant || restaurant.status !== "active") {
    return { error: "No restaurant found with that code. Ask your manager to check it." };
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

  if (!restaurantSlug) return { error: "Enter your restaurant code." };
  if (!isStaffRole(role)) return { error: "Choose your role." };
  if (!/^\d{4}$/.test(pin)) return { error: "Enter your 4-digit PIN." };

  const admin = createAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id")
    .eq("slug", restaurantSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!restaurant) {
    return { error: "No restaurant found with that code. Ask your manager to check it." };
  }

  const { data: candidates } = await admin
    .from("staff")
    .select("id, name, branch_id, pin_hash")
    .eq("restaurant_id", restaurant.id)
    .eq("role", role)
    .eq("is_active", true);

  if (!candidates || candidates.length === 0) {
    return { error: `No ${role} accounts set up yet. Ask your manager to add you.` };
  }

  // Recorded before the PIN is checked, so parallel guesses are counted
  // too; refused once the restaurant/device has too many recent failures.
  const { data: attemptId, error: throttleError } = await admin.rpc("begin_staff_login_attempt", {
    p_restaurant_id: restaurant.id,
    p_role: role,
    p_ip: await clientIp(),
  });

  if (throttleError || !attemptId) {
    return { error: userFacingError(throttleError, "Sign-in is unavailable right now. Try again shortly.") };
  }

  const matches = candidates.filter((candidate) => verifyPin(pin, candidate.pin_hash));

  if (matches.length === 0) {
    return { error: "That PIN doesn't match. Try again or ask your manager." };
  }

  // Two active accounts in one role sharing a PIN (possible after a
  // reactivation) would be indistinguishable: refuse rather than sign in as
  // whoever happens to come first.
  if (matches.length > 1) {
    return { error: "This PIN is used by more than one account. Ask your manager to change it." };
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
