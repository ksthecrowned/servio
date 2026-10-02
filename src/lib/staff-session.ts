import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";

export type StaffRole = "waiter" | "kitchen" | "cashier";

export type StaffSession = {
  staffId: string;
  restaurantId: string;
  branchId: string | null;
  role: StaffRole;
  name: string;
};

/** Signed cookie payload: the session plus its expiry (unix seconds). */
type StaffSessionToken = StaffSession & { exp: number };

export const STAFF_SESSION_COOKIE = "servio_staff_session";

/** One shift. Also enforced inside the signed payload, not just the cookie. */
export const STAFF_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function secret(): string {
  const value = process.env.STAFF_SESSION_SECRET;
  if (!value) {
    throw new Error("STAFF_SESSION_SECRET is not configured");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Signs a staff session into an opaque cookie value: base64(payload).hmac */
export function signStaffSession(session: StaffSession, now = Date.now()): string {
  const token: StaffSessionToken = {
    ...session,
    exp: Math.floor(now / 1000) + STAFF_SESSION_MAX_AGE_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(token)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/**
 * Verifies and decodes a staff session cookie value. Returns null if the
 * signature is wrong, the payload is malformed or the session has expired
 * — a cookie kept past its maxAge is still refused.
 */
export function verifyStaffSession(token: string | undefined, now = Date.now()): StaffSession | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let decoded: Partial<StaffSessionToken>;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof decoded.exp !== "number" || decoded.exp * 1000 <= now) return null;
  if (typeof decoded.staffId !== "string" || typeof decoded.restaurantId !== "string") return null;

  return {
    staffId: decoded.staffId,
    restaurantId: decoded.restaurantId,
    branchId: decoded.branchId ?? null,
    role: decoded.role as StaffRole,
    name: decoded.name ?? "",
  };
}

/**
 * Reads and verifies the staff session cookie, then re-checks the staff
 * member against the database on every request: a deactivated employee, a
 * changed role or a suspended restaurant takes effect immediately rather
 * than when the cookie expires. Redirects to /staff otherwise.
 */
export async function requireStaffSession(expectedRole: StaffRole): Promise<StaffSession> {
  const cookieStore = await cookies();
  const session = verifyStaffSession(cookieStore.get(STAFF_SESSION_COOKIE)?.value);

  if (!session || session.role !== expectedRole) {
    redirect("/staff");
  }

  const { data: staff } = await createAdminClient()
    .from("staff")
    .select("name, role, branch_id, is_active, restaurants!inner(status)")
    .eq("id", session.staffId)
    .eq("restaurant_id", session.restaurantId)
    .maybeSingle();

  if (
    !staff ||
    !staff.is_active ||
    staff.role !== expectedRole ||
    staff.restaurants.status !== "active"
  ) {
    redirect("/staff");
  }

  // Branch and name come from the database, so moving someone to another
  // branch also applies at once.
  return { ...session, name: staff.name, branchId: staff.branch_id };
}
