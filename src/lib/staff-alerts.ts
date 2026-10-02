/**
 * What a staff screen should alert about, independent of how (sound,
 * vibration, browser notification). Pure so it can be unit-tested.
 *
 * Each alert has a stable key: the same request or order keeps its key
 * across refreshes, so it alerts once. A situation that deserves a new
 * alert gets a new key (e.g. a request transferred to me, or becoming late).
 */

export type StaffAlertKind = "new_order" | "request" | "bill" | "order_ready";

export type StaffAlert = {
  key: string;
  kind: StaffAlertKind;
  title: string;
  body: string;
};

/** Beeps per kind (PRD section 27: new order 3, waiter 2, bill 1). */
export const BEEPS: Record<StaffAlertKind, number> = {
  new_order: 3,
  request: 2,
  order_ready: 2,
  bill: 1,
};

/** Alerts present now that were not seen before, in display order. */
export function newAlerts(seen: ReadonlySet<string>, current: readonly StaffAlert[]): StaffAlert[] {
  return current.filter((alert) => !seen.has(alert.key));
}

/** Beeps to play for a batch: the most urgent kind wins, they don't add up. */
export function beepsFor(alerts: readonly StaffAlert[]): number {
  return alerts.reduce((max, alert) => Math.max(max, BEEPS[alert.kind]), 0);
}

/**
 * Keys to remember after a refresh: everything shown now, plus a bounded
 * tail of older keys so an item that briefly disappears and comes back
 * (e.g. a refresh racing a write) doesn't alert twice.
 */
export function rememberKeys(seen: ReadonlySet<string>, current: readonly StaffAlert[], limit = 200): Set<string> {
  const keys = [...seen, ...current.map((alert) => alert.key)];
  return new Set(keys.slice(Math.max(0, keys.length - limit)));
}
