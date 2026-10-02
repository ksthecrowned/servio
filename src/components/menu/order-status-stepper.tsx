import { cn } from "@/lib/utils";

const STEPS = [
  { status: "pending", label: "Reçue" },
  { status: "accepted", label: "Acceptée" },
  { status: "preparing", label: "En préparation" },
  { status: "ready", label: "Prête" },
  { status: "served", label: "Servie" },
];

export function OrderStatusStepper({ status }: { status: string }) {
  if (status === "cancelled") {
    return <p className="text-sm font-medium text-destructive">Cette commande a été annulée.</p>;
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);
  const effectiveIndex = status === "completed" ? STEPS.length - 1 : currentIndex;

  return (
    <ol className="flex flex-col gap-2">
      {STEPS.map((step, i) => {
        const done = i < effectiveIndex;
        const active = i === effectiveIndex;
        return (
          <li key={step.status} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                done && "border-brand bg-brand text-brand-foreground",
                active && !done && "border-brand text-brand",
                !done && !active && "border-muted-foreground/40 text-muted-foreground",
              )}
            >
              {done ? "✓" : active ? "●" : "○"}
            </span>
            <span className={cn("text-sm", active && "font-medium")}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
