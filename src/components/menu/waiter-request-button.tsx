"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";

import { requestWaiterAssistance } from "@/app/actions/waiter-requests";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const OPTIONS = [
  { value: "call_waiter", label: "Appeler un serveur" },
  { value: "water", label: "De l’eau" },
  { value: "cutlery", label: "Des couverts" },
  { value: "bill", label: "L’addition" },
  { value: "other", label: "Autre" },
];

export function WaiterRequestButton({ branchId, tableId }: { branchId: string; tableId: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function send(type: string) {
    startTransition(async () => {
      const result = await requestWaiterAssistance(branchId, tableId, type);
      if (!result.error) {
        setSent(type);
        setTimeout(() => {
          setOpen(false);
          setSent(null);
        }, 1200);
      }
    });
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40">
        <Button variant="outline" size="icon" className="size-12 rounded-full shadow-lg" onClick={() => setOpen(true)}>
          <Bell className="size-5" />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Besoin de quelque chose ?</DialogTitle>
          </DialogHeader>
          {sent ? (
            <p className="text-sm text-brand">Demande envoyée : l’équipe a été prévenue.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  disabled={isPending}
                  onClick={() => send(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
