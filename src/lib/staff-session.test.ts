import { createHmac } from "node:crypto";

import { beforeAll, describe, expect, test } from "bun:test";

import {
  signStaffSession,
  STAFF_SESSION_MAX_AGE_SECONDS,
  verifyStaffSession,
  type StaffSession,
} from "@/lib/staff-session";

const session: StaffSession = {
  staffId: "72000000-0000-0000-0000-000000000001",
  restaurantId: "10000000-0000-0000-0000-000000000001",
  branchId: null,
  role: "cashier",
  name: "Ama",
};

beforeAll(() => {
  process.env.STAFF_SESSION_SECRET = "test-secret";
});

describe("staff session cookie", () => {
  const now = Date.UTC(2026, 9, 2, 8, 0, 0);

  test("round-trips a session", () => {
    expect(verifyStaffSession(signStaffSession(session, now), now)).toEqual(session);
  });

  test("expires after one shift, even if the cookie is kept", () => {
    const token = signStaffSession(session, now);
    const justBefore = now + STAFF_SESSION_MAX_AGE_SECONDS * 1000 - 1;
    const atExpiry = now + STAFF_SESSION_MAX_AGE_SECONDS * 1000;
    expect(verifyStaffSession(token, justBefore)).not.toBeNull();
    expect(verifyStaffSession(token, atExpiry)).toBeNull();
  });

  test("rejects a tampered payload", () => {
    const [, signature] = signStaffSession(session, now).split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...session, role: "kitchen", exp: now / 1000 + 3600 }),
    ).toString("base64url");
    expect(verifyStaffSession(`${forged}.${signature}`, now)).toBeNull();
  });

  test("rejects a token signed with another secret", () => {
    const token = signStaffSession(session, now);
    process.env.STAFF_SESSION_SECRET = "other-secret";
    try {
      expect(verifyStaffSession(token, now)).toBeNull();
    } finally {
      process.env.STAFF_SESSION_SECRET = "test-secret";
    }
  });

  test("rejects cookies issued before expiry was signed in", () => {
    // Pre-upgrade cookies carry no exp: they are refused, forcing a fresh sign-in.
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
    const signature = createHmac("sha256", "test-secret").update(payload).digest("base64url");
    expect(verifyStaffSession(`${payload}.${signature}`, now)).toBeNull();
  });

  test("rejects garbage", () => {
    expect(verifyStaffSession(undefined, now)).toBeNull();
    expect(verifyStaffSession("", now)).toBeNull();
    expect(verifyStaffSession("abc", now)).toBeNull();
    expect(verifyStaffSession("abc.def", now)).toBeNull();
  });
});
