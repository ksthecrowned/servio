"use client";

import { useState, useTransition } from "react";

import {
  claimWaiterRequest,
  resolveWaiterRequest,
  transferWaiterRequest,
} from "@/app/actions/staff-ops";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isRequestLate, requestAge, requestDetail, requestTitle } from "@/lib/request-status";

export type FloorTable = {
  id: string;
  label: string;
  status: string;
  openCount: number;
};

export type WaiterColleague = { id: string; name: string };

export type OpenServiceRequest = {
  id: string;
  type: string;
  note: string | null;
  created_at: string;
  acknowledged_at: string | null;
  assigned_staff_id: string | null;
  assigneeName: string | null;
  tableLabel: string;
};

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
  tables,
  requests,
  colleagues,
}: {
  staffId: string;
  tables: FloorTable[];
  requests: OpenServiceRequest[];
  colleagues: WaiterColleague[];
}) {
  const late = requests.filter((request) => isRequestLate(request));
  const lateIds = new Set(late.map((request) => request.id));
  const fresh = requests.filter((request) => !request.acknowledged_at && !lateIds.has(request.id));
  const active = requests.filter((request) => request.acknowledged_at && !lateIds.has(request.id));

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Salle</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardContent className="flex flex-col gap-1 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{tableLine(table.label)}</p>
                  {table.openCount > 0 ? <Badge>{table.openCount}</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {TABLE_STATUS[table.status] ?? table.status}
                </p>
              </CardContent>
            </Card>
          ))}
          {tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune table sur cette salle.</p>
          ) : null}
        </div>
      </section>

      <RequestSection
        title="En retard"
        empty=""
        requests={late}
        staffId={staffId}
        colleagues={colleagues}
        emphasize
      />
      <RequestSection
        title="Nouvelles demandes"
        empty="Aucune nouvelle demande."
        requests={fresh}
        staffId={staffId}
        colleagues={colleagues}
      />
      <RequestSection
        title="En cours"
        empty="Aucune demande en cours."
        requests={active}
        staffId={staffId}
        colleagues={colleagues}
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
  requests: OpenServiceRequest[];
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
  request: OpenServiceRequest;
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
            <p className="text-sm text-muted-foreground">{tableLine(request.tableLabel)}</p>
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
