import { describe, expect, test } from "bun:test";

import { planWaiterFloor, type FloorRequestInput, type FloorTableInput } from "@/lib/waiter-floor";

const NOW = Date.UTC(2026, 9, 2, 12, 0, 0);
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

const ME = "w-me";
const OTHER = "w-other";
const names = new Map([
  [ME, "Moi"],
  [OTHER, "Ama"],
]);

const tables: FloorTableInput[] = [
  { id: "t-mine", label: "1", status: "occupied", assigned_staff_id: ME },
  { id: "t-other", label: "2", status: "occupied", assigned_staff_id: OTHER },
  { id: "t-free", label: "3", status: "occupied", assigned_staff_id: null },
];

const request = (id: string, table_id: string, extra: Partial<FloorRequestInput> = {}): FloorRequestInput => ({
  id,
  type: "call_waiter",
  note: null,
  created_at: ago(1),
  acknowledged_at: null,
  assigned_staff_id: null,
  table_id,
  ...extra,
});

function plan(requests: FloorRequestInput[], readyOrders: Parameters<typeof planWaiterFloor>[0]["readyOrders"] = []) {
  return planWaiterFloor({ staffId: ME, tables, requests, readyOrders, waiterNames: names, now: NOW });
}

describe("waiter floor routing", () => {
  test("requests on my tables and on unassigned tables are mine and alert me", () => {
    const floor = plan([request("r1", "t-mine"), request("r2", "t-free"), request("r3", "t-other")]);
    expect(floor.myNew.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(floor.others.map((r) => r.id)).toEqual(["r3"]);
    expect(floor.alerts.map((a) => a.key)).toEqual(["req:r1", "req:r2"]);
    expect(floor.others[0].tableWaiterName).toBe("Ama");
  });

  test("taking a request of my table keeps the same alert key (no second ring)", () => {
    const before = plan([request("r1", "t-mine")]).alerts.map((a) => a.key);
    const after = plan([request("r1", "t-mine", { acknowledged_at: ago(0), assigned_staff_id: ME })]);
    expect(after.alerts.map((a) => a.key)).toEqual(before);
    expect(after.myActive.map((r) => r.id)).toEqual(["r1"]);
  });

  test("a request transferred to me from another table becomes mine and alerts", () => {
    const floor = plan([request("r3", "t-other", { acknowledged_at: ago(0), assigned_staff_id: ME })]);
    expect(floor.myActive.map((r) => r.id)).toEqual(["r3"]);
    expect(floor.alerts.map((a) => a.key)).toEqual(["req:r3"]);
  });

  test("a request a colleague holds on my table is theirs and silent", () => {
    const floor = plan([request("r1", "t-mine", { acknowledged_at: ago(0), assigned_staff_id: OTHER })]);
    expect(floor.others.map((r) => r.id)).toEqual(["r1"]);
    expect(floor.alerts).toEqual([]);
  });

  test("late requests escalate to everyone, on any table", () => {
    const floor = plan([request("r3", "t-other", { created_at: ago(4) })]);
    expect(floor.late.map((r) => r.id)).toEqual(["r3"]);
    expect(floor.others).toEqual([]);
    expect(floor.alerts.map((a) => a.key)).toEqual(["late:r3"]);
  });

  test("bill requests alert with the bill kind", () => {
    expect(plan([request("r1", "t-mine", { type: "bill" })]).alerts[0].kind).toBe("bill");
  });

  test("ready orders of my tables come first and alert; others are listed but silent", () => {
    const item = [{ id: "i", item_name: "Poulet DG", variant_name: null, quantity: 2 }];
    const floor = plan([], [
      { id: "o-other", order_number: 1, table_id: "t-other", items: item },
      { id: "o-mine", order_number: 2, table_id: "t-mine", items: item },
      { id: "o-free", order_number: 3, table_id: "t-free", items: item },
    ]);
    expect(floor.toServe.map((o) => o.id)).toEqual(["o-mine", "o-free", "o-other"]);
    expect(floor.alerts.map((a) => a.key)).toEqual(["ready:o-mine", "ready:o-free"]);
    expect(floor.alerts[0]).toMatchObject({ kind: "order_ready", title: "Commande prête — Table 1", body: "Poulet DG × 2" });
  });

  test("my tables are listed first", () => {
    expect(plan([]).tables.map((t) => t.id)).toEqual(["t-mine", "t-free", "t-other"]);
  });
});
