"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/platform-admin";
import { userFacingError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

/**
 * Billing is not automated yet: a platform admin records what the
 * restaurant paid (cash, transfer) by moving its subscription here. Writes
 * go through the admin's own session, so RLS (is_platform_admin) applies on
 * top of the check below.
 */

export type AdminSubscriptionResult = { error: string | null };

const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK = "Impossible de modifier l’abonnement. Réessayez.";

const TIERS: Enums<"subscription_plan_tier">[] = ["starter", "business", "pro"];

function done(error: PostgrestError | null): AdminSubscriptionResult {
  revalidatePath("/admin/subscriptions");
  return { error: error ? userFacingError(error, FALLBACK) : null };
}

/** Starts (or renews) a paid period of `months` months on the chosen plan. */
export async function activateSubscription(
  subscriptionId: string,
  tier: Enums<"subscription_plan_tier">,
  months: number,
): Promise<AdminSubscriptionResult> {
  await requirePlatformAdmin();
  if (!TIERS.includes(tier)) return { error: "Formule inconnue." };
  if (!Number.isInteger(months) || months < 1 || months > 24) return { error: "Durée invalide." };

  const supabase = await createClient();
  const { data: plan } = await supabase.from("subscription_plans").select("id").eq("tier", tier).maybeSingle();
  if (!plan) return { error: "Formule inconnue." };

  const { data: current } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!current) return { error: "Abonnement introuvable." };

  // Renewing an active subscription before it ends extends it from its end
  // date, so paying early loses nothing.
  const now = new Date();
  const currentEnd = current.current_period_end ? new Date(current.current_period_end) : null;
  const renewing = current.status === "active" && currentEnd !== null && currentEnd > now;
  const end = new Date(renewing ? currentEnd : now);
  end.setMonth(end.getMonth() + months);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: plan.id,
      status: "active",
      current_period_end: end.toISOString(),
      ...(renewing ? {} : { current_period_start: now.toISOString() }),
    })
    .eq("id", subscriptionId);

  return done(error);
}

/** Gives a restaurant more trial days (from today if the trial already ended). */
export async function extendTrial(subscriptionId: string, days: number): Promise<AdminSubscriptionResult> {
  await requirePlatformAdmin();
  if (!Number.isInteger(days) || days < 1 || days > 90) return { error: "Durée invalide." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("subscriptions")
    .select("trial_ends_at")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!current) return { error: "Abonnement introuvable." };

  const now = Date.now();
  const from = current.trial_ends_at ? Math.max(Date.parse(current.trial_ends_at), now) : now;
  const endsAt = new Date(from + days * DAY_MS).toISOString();

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "trialing", trial_ends_at: endsAt, current_period_end: endsAt })
    .eq("id", subscriptionId);

  return done(error);
}

/** Records a missed payment (grace period, plan kept) or ends the subscription. */
export async function setSubscriptionStatus(
  subscriptionId: string,
  status: "past_due" | "cancelled" | "expired",
): Promise<AdminSubscriptionResult> {
  await requirePlatformAdmin();
  if (!["past_due", "cancelled", "expired"].includes(status)) return { error: "Statut inconnu." };

  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").update({ status }).eq("id", subscriptionId);
  return done(error);
}
