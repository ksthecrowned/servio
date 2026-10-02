import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Enums } from "@/lib/supabase/types";

export type SubscriptionRow = {
  status: Enums<"subscription_status">;
  trial_ends_at: string | null;
  subscription_plans: { tier: Enums<"subscription_plan_tier"> } | null;
};

export type PlanAccess = {
  /** Tier whose features apply right now. */
  effectiveTier: Enums<"subscription_plan_tier">;
  isTrial: boolean;
  /** Days left in the trial, rounded up (0 once expired); null outside a trial. */
  trialDaysLeft: number | null;
  trialExpired: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What a restaurant's subscription currently unlocks. A running trial gets
 * Business-level features (PRD section 48); an expired trial or a lapsed
 * subscription falls back to Starter until a plan is chosen. Billing is
 * not automated yet: platform admins move restaurants to a paid plan.
 */
export function planAccess(subscription: SubscriptionRow | null, now = Date.now()): PlanAccess {
  if (!subscription) {
    // Every restaurant gets a trial row on creation; a missing row means the
    // data is inconsistent, so grant nothing beyond Starter.
    return { effectiveTier: "starter", isTrial: false, trialDaysLeft: null, trialExpired: false };
  }

  if (subscription.status === "trialing") {
    const endsAt = subscription.trial_ends_at ? Date.parse(subscription.trial_ends_at) : null;
    const expired = endsAt !== null && endsAt <= now;
    let trialDaysLeft: number | null = null;
    // Rounded up: a trial created a few seconds ago still shows 14 days, and
    // its final 24 hours show 1.
    if (endsAt !== null) trialDaysLeft = expired ? 0 : Math.ceil((endsAt - now) / DAY_MS);

    return {
      effectiveTier: expired ? "starter" : "business",
      isTrial: true,
      trialDaysLeft,
      trialExpired: expired,
    };
  }

  // past_due keeps the plan as a grace period; cancelled/expired lose it.
  const keepsPlan = subscription.status === "active" || subscription.status === "past_due";
  const tier = subscription.subscription_plans?.tier;
  return {
    effectiveTier: keepsPlan && tier ? tier : "starter",
    isTrial: false,
    trialDaysLeft: null,
    trialExpired: false,
  };
}

/** Loads and evaluates a restaurant's subscription (RLS: members can read it). */
export async function loadPlanAccess(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
): Promise<PlanAccess> {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, subscription_plans(tier)")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  return planAccess(data);
}
