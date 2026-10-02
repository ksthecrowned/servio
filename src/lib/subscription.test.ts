import { describe, expect, test } from "bun:test";

import { planAccess, RENEWAL_GRACE_DAYS, type SubscriptionRow } from "@/lib/subscription";

const now = Date.UTC(2026, 9, 2, 12, 0, 0);
const day = 24 * 60 * 60 * 1000;
const trial = (endsInMs: number): SubscriptionRow => ({
  status: "trialing",
  trial_ends_at: new Date(now + endsInMs).toISOString(),
  subscription_plans: { tier: "business" },
});

describe("planAccess", () => {
  test("a running trial gets Business features and counts down", () => {
    expect(planAccess(trial(14 * day), now)).toEqual({
      effectiveTier: "business",
      isTrial: true,
      trialDaysLeft: 14,
      trialExpired: false,
      renewalDue: false,
    });
    expect(planAccess(trial(14 * day - 5000), now).trialDaysLeft).toBe(14);
    expect(planAccess(trial(day - 1), now).trialDaysLeft).toBe(1);
  });

  test("an expired trial falls back to Starter", () => {
    expect(planAccess(trial(0), now)).toMatchObject({ effectiveTier: "starter", trialExpired: true, trialDaysLeft: 0 });
  });

  test("paid plans apply while active or past due, not once cancelled", () => {
    const sub = (status: SubscriptionRow["status"]): SubscriptionRow => ({
      status,
      trial_ends_at: null,
      subscription_plans: { tier: "pro" },
    });
    expect(planAccess(sub("active"), now).effectiveTier).toBe("pro");
    expect(planAccess(sub("past_due"), now).effectiveTier).toBe("pro");
    expect(planAccess(sub("cancelled"), now).effectiveTier).toBe("starter");
    expect(planAccess(sub("expired"), now).effectiveTier).toBe("starter");
  });

  test("a paid plan lapses to Starter after its period and the grace days", () => {
    const paid = (endsInMs: number): SubscriptionRow => ({
      status: "active",
      trial_ends_at: null,
      current_period_end: new Date(now + endsInMs).toISOString(),
      subscription_plans: { tier: "pro" },
    });
    expect(planAccess(paid(10 * day), now)).toMatchObject({ effectiveTier: "pro", renewalDue: false });
    expect(planAccess(paid(-day), now)).toMatchObject({ effectiveTier: "pro", renewalDue: true });
    expect(planAccess(paid(-RENEWAL_GRACE_DAYS * day), now)).toMatchObject({
      effectiveTier: "starter",
      renewalDue: true,
    });
  });

  test("no subscription row grants nothing beyond Starter", () => {
    expect(planAccess(null, now).effectiveTier).toBe("starter");
  });
});
