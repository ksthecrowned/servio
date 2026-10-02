import { describe, expect, test } from "bun:test";

import { beepsFor, newAlerts, rememberKeys, type StaffAlert } from "@/lib/staff-alerts";

const alert = (key: string, kind: StaffAlert["kind"] = "request"): StaffAlert => ({ key, kind, title: key, body: "" });

describe("staff alerts", () => {
  test("only unseen keys alert", () => {
    const seen = new Set(["req:1"]);
    expect(newAlerts(seen, [alert("req:1"), alert("req:2")]).map((a) => a.key)).toEqual(["req:2"]);
    expect(newAlerts(seen, [alert("req:1")])).toEqual([]);
  });

  test("the most urgent kind sets the number of beeps", () => {
    expect(beepsFor([alert("a", "bill")])).toBe(1);
    expect(beepsFor([alert("a", "bill"), alert("b", "new_order")])).toBe(3);
    expect(beepsFor([])).toBe(0);
  });

  test("remembered keys keep current ones and stay bounded", () => {
    const seen = new Set(Array.from({ length: 10 }, (_, i) => `old:${i}`));
    const kept = rememberKeys(seen, [alert("new:1")], 5);
    expect(kept.size).toBe(5);
    expect(kept.has("new:1")).toBe(true);
    expect(kept.has("old:0")).toBe(false);
  });
});
