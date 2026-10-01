export const REQUEST_LATE_AFTER_MS = 3 * 60 * 1000;

const TYPE_LABEL: Record<string, string> = {
  call_waiter: "Appeler un serveur",
  water: "Demander de l’eau",
  bill: "Demander l’addition",
  cutlery: "Demander des couverts",
  other: "Autre demande",
};

export function requestTitle(type: string, note: string | null) {
  if (note?.startsWith("Question sur un plat")) return "Question sur un plat";
  return TYPE_LABEL[type] ?? "Demande";
}

export function requestDetail(note: string | null) {
  if (!note) return null;
  if (note.startsWith("Question sur un plat")) {
    const detail = note.slice("Question sur un plat".length).replace(/^ · /, "");
    return detail || null;
  }
  return note;
}

export type RequestPhase = "waiting" | "active" | "done";

export function requestPhase(request: {
  acknowledged_at: string | null;
  resolved_at: string | null;
}): RequestPhase {
  if (request.resolved_at) return "done";
  if (request.acknowledged_at) return "active";
  return "waiting";
}

export function isRequestLate(
  request: { created_at: string; resolved_at?: string | null },
  now = Date.now(),
) {
  if (request.resolved_at) return false;
  return now - new Date(request.created_at).getTime() >= REQUEST_LATE_AFTER_MS;
}

export function requestAge(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "à l’instant";
  if (minutes === 1) return "il y a 1 min";
  return `il y a ${minutes} min`;
}
