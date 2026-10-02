"use client";

import { useState, useTransition } from "react";

import {
  claimWaiterRequest,
  resolveWaiterRequest,
  transferWaiterRequest,
} from "@/app/actions/staff-ops";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReadyOrderCard } from "@/components/staff/ready-order-card";
import { Card, CardContent } from "@/components/ui/card";
import { isRequestLate, requestAge, requestDetail, requestTitle } from "@/lib/request-status";
import type { FloorRequest, WaiterFloor } from "@/lib/waiter-floor";

export type WaiterColleague = { id: string; name: string };

const TABLE_STATUS: Record<string, string> = {
  available: "Libre",
  occupied: "Occupée",
  order_pending: "Commande",
  preparing: "En préparation",
  ready: "Prête",
  bill_requested: "Addition",
  cleaning: "Nettoyage",
};

function tableLine(label: string) {
  return /^table\b/i.test(label) ? label : `Table ${label}`;
}

export function WaiterBoard({
  staffId,
  floor,
  colleagues,
}: {
  staffId: string;
  floor: WaiterFloor;
  colleagues: WaiterColleague[];
}) {
  const hasMyTables = floor.tables.some((table) => table.mine);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Salle</h2>
        {!hasMyTables ? (
          <p className="text-sm text-muted-foreground">
            Aucune table ne vous est attribuée : vous recevez les demandes des tables sans serveur
            attitré.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {floor.tables.map((table) => (
            <Card key={table.id} className={table.mine ? "border-brand" : undefined}>
              <CardContent className="flex flex-col gap-1 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{tableLine(table.label)}</p>
                  {table.openCount > 0 ? <Badge>{table.openCount}</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {TABLE_STATUS[table.status] ?? table.status}
                </p>
                <p className={table.mine ? "text-xs font-medium text-brand" : "text-xs text-muted-foreground"}>
                  {table.mine ? "Ma table" : (table.assigneeName ?? "Sans serveur attitré")}
                </p>
              </CardContent>
            </Card>
          ))}
          {floor.tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune table sur cette salle.</p>
          ) : null}
        </div>
      </section>

      <RequestSection
        title="En retard"
        empty=""
        requests={floor.late}
        staffId={staffId}
        colleagues={colleagues}
        emphasize
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">
          À servir{floor.toServe.length > 0 ? ` (${floor.toServe.length})` : ""}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {floor.toServe.map((order) => (
            <ReadyOrderCard
              key={order.id}
              order={{
                id: order.id,
                order_number: order.order_number,
                tableLabel: order.tableLabel,
                order_items: order.items,
              }}
              note={order.mine ? null : `Table de ${order.tableWaiterName ?? "un collègue"}`}
            />
          ))}
        </div>
        {floor.toServe.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune commande prête en cuisine.</p>
        ) : null}
      </section>

      <RequestSection
        title="Mes tables · nouvelles demandes"
        empty="Aucune nouvelle demande."
        requests={floor.myNew}
        staffId={staffId}
        colleagues={colleagues}
      />
      <RequestSection
        title="Mes tables · en cours"
        empty="Aucune demande en cours."
        requests={floor.myActive}
        staffId={staffId}
        colleagues={colleagues}
      />
      <RequestSection
        title="Autres tables"
        empty=""
        requests={floor.others}
        staffId={staffId}
        colleagues={colleagues}
        emphasize
      />
    </div>
  );
}

function RequestSection({
  title,
  empty,
  requests,
  staffId,
  colleagues,
  emphasize = false,
}: {
  title: string;
  empty: string;
  requests: FloorRequest[];
  staffId: string;
  colleagues: WaiterColleague[];
  emphasize?: boolean;
}) {
  if (emphasize && requests.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">
        {title}
        {requests.length > 0 ? ` (${requests.length})` : ""}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} staffId={staffId} colleagues={colleagues} />
        ))}
      </div>
      {requests.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
    </section>
  );
}

function RequestCard({
  request,
  staffId,
  colleagues,
}: {
  request: FloorRequest;
  staffId: string;
  colleagues: WaiterColleague[];
}) {
  const [target, setTarget] = useState(colleagues[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mine = request.assigned_staff_id === staffId;
  const heldByOther = Boolean(request.assigned_staff_id && !mine);
  const late = isRequestLate(request);
  const detail = requestDetail(request.note);

  function run(action: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card className={late ? "border-destructive" : undefined}>
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{requestTitle(request.type, request.note)}</p>
            <p className="text-sm text-muted-foreground">
              {tableLine(request.tableLabel)}
              {request.tableWaiterName ? ` · serveur attitré : ${request.tableWaiterName}` : ""}
            </p>
            {detail ? <p className="mt-1 text-sm">{detail}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {requestAge(request.created_at)}
              {request.assigneeName ? ` · ${request.assigneeName}` : ""}
              {late ? " · En retard" : ""}
            </p>
          </div>
        </div>

        {heldByOther ? null : (
          <div className="flex flex-wrap gap-2">
            {request.acknowledged_at ? null : (
              <Button size="sm" disabled={isPending} onClick={() => run(() => claimWaiterRequest(request.id))}>
                Prendre en charge
              </Button>
            )}
            <Button
              size="sm"
              variant={request.acknowledged_at ? "default" : "outline"}
              disabled={isPending}
              onClick={() => run(() => resolveWaiterRequest(request.id))}
            >
              Terminer
            </Button>
          </div>
        )}

        {mine && colleagues.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              aria-label="Serveur à qui transférer"
            >
              {colleagues.map((colleague) => (
                <option key={colleague.id} value={colleague.id}>
                  {colleague.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || !target}
              onClick={() => run(() => transferWaiterRequest(request.id, target))}
            >
              Transférer
            </Button>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
