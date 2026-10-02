import { isRequestLate, requestTitle } from "@/lib/request-status";
import type { StaffAlert } from "@/lib/staff-alerts";

/**
 * Splits a waiter's screen into what is theirs and what isn't, and decides
 * what should alert them. A table is "mine" when it is assigned to me, and
 * also when it has no assigned waiter (then it is everyone's). Pure, so the
 * routing rules are unit-tested (waiter-floor.test.ts).
 */

export type FloorTableInput = {
  id: string;
  label: string;
  status: string;
  assigned_staff_id: string | null;
};

export type FloorRequestInput = {
  id: string;
  type: string;
  note: string | null;
  created_at: string;
  acknowledged_at: string | null;
  assigned_staff_id: string | null;
  table_id: string;
};

export type ReadyOrderInput = {
  id: string;
  order_number: number;
  table_id: string | null;
  items: { id: string; item_name: string; variant_name: string | null; quantity: number }[];
};

export type FloorTable = FloorTableInput & {
  mine: boolean;
  assigneeName: string | null;
  openCount: number;
};

export type FloorRequest = FloorRequestInput & {
  tableLabel: string;
  assigneeName: string | null;
  tableWaiterName: string | null;
};

export type FloorReadyOrder = ReadyOrderInput & {
  tableLabel: string | null;
  mine: boolean;
  tableWaiterName: string | null;
};

export type WaiterFloor = {
  tables: FloorTable[];
  late: FloorRequest[];
  myNew: FloorRequest[];
  myActive: FloorRequest[];
  others: FloorRequest[];
  toServe: FloorReadyOrder[];
  alerts: StaffAlert[];
};

function tableRank(table: FloorTableInput, staffId: string) {
  if (table.assigned_staff_id === staffId) return 0;
  return table.assigned_staff_id === null ? 1 : 2;
}

function tableLine(label: string) {
  return /^table\b/i.test(label) ? label : `Table ${label}`;
}

export function planWaiterFloor(input: {
  staffId: string;
  tables: FloorTableInput[];
  requests: FloorRequestInput[];
  readyOrders: ReadyOrderInput[];
  waiterNames: Map<string, string>;
  now?: number;
}): WaiterFloor {
  const { staffId, waiterNames } = input;
  const now = input.now ?? Date.now();
  const tablesById = new Map(input.tables.map((table) => [table.id, table]));
  const nameOf = (id: string | null) => (id ? (waiterNames.get(id) ?? null) : null);

  const isMyTable = (tableId: string | null) => {
    const table = tableId ? tablesById.get(tableId) : undefined;
    if (!table) return true; // Unknown/counter: everyone's.
    return table.assigned_staff_id === null || table.assigned_staff_id === staffId;
  };

  const openCounts = new Map<string, number>();
  for (const request of input.requests) {
    openCounts.set(request.table_id, (openCounts.get(request.table_id) ?? 0) + 1);
  }

  const tables: FloorTable[] = input.tables
    .map((table) => ({
      ...table,
      mine: table.assigned_staff_id === staffId,
      assigneeName: nameOf(table.assigned_staff_id),
      openCount: openCounts.get(table.id) ?? 0,
    }))
    // Mine first, then unassigned tables (everyone's), then colleagues'.
    .sort(
      (a, b) =>
        tableRank(a, staffId) - tableRank(b, staffId) || a.label.localeCompare(b.label, "fr", { numeric: true }),
    );

  const requests: FloorRequest[] = input.requests.map((request) => {
    const table = tablesById.get(request.table_id);
    return {
      ...request,
      tableLabel: table?.label ?? "—",
      assigneeName: nameOf(request.assigned_staff_id),
      // Only worth showing when the table is someone else's.
      tableWaiterName: table?.assigned_staff_id === staffId ? null : nameOf(table?.assigned_staff_id ?? null),
    };
  });

  // A request is mine when I hold it, or when nobody holds it and it is on
  // one of my tables. Requests a colleague holds are theirs.
  const isMine = (request: FloorRequest) =>
    request.assigned_staff_id === staffId || (request.assigned_staff_id === null && isMyTable(request.table_id));

  const late = requests.filter((request) => isRequestLate(request, now));
  const onTime = requests.filter((request) => !isRequestLate(request, now));

  const toServe: FloorReadyOrder[] = input.readyOrders
    .map((order) => {
      const table = order.table_id ? tablesById.get(order.table_id) : undefined;
      return {
        ...order,
        tableLabel: table?.label ?? null,
        mine: isMyTable(order.table_id),
        tableWaiterName: nameOf(table?.assigned_staff_id ?? null),
      };
    })
    .sort((a, b) => Number(b.mine) - Number(a.mine));

  const alerts: StaffAlert[] = [];
  for (const request of requests) {
    if (isRequestLate(request, now)) {
      // Escalation: a late request alerts everyone, whoever's table it is.
      alerts.push({
        key: `late:${request.id}`,
        kind: request.type === "bill" ? "bill" : "request",
        title: `En retard — ${tableLine(request.tableLabel)}`,
        body: requestTitle(request.type, request.note),
      });
    } else if (isMine(request) && (request.acknowledged_at === null || request.assigned_staff_id === staffId)) {
      // Same key whether it is waiting or already held by me, so taking a
      // request of my own table doesn't ring again; a request transferred
      // to me from another table is new to me and rings.
      alerts.push({
        key: `req:${request.id}`,
        kind: request.type === "bill" ? "bill" : "request",
        title: `${tableLine(request.tableLabel)} — ${requestTitle(request.type, request.note)}`,
        body: request.note ?? "",
      });
    }
  }
  for (const order of toServe) {
    if (!order.mine) continue;
    alerts.push({
      key: `ready:${order.id}`,
      kind: "order_ready",
      title: `Commande prête — ${order.tableLabel ? tableLine(order.tableLabel) : `n° ${order.order_number}`}`,
      body: order.items.map((item) => `${item.item_name} × ${item.quantity}`).join(", "),
    });
  }

  return {
    tables,
    late,
    myNew: onTime.filter((request) => isMine(request) && request.acknowledged_at === null),
    myActive: onTime.filter((request) => isMine(request) && request.acknowledged_at !== null),
    others: onTime.filter((request) => !isMine(request)),
    toServe,
    alerts,
  };
}
