"use client";

import { BellOff, BellRing, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { beepsFor, newAlerts, rememberKeys, type StaffAlert } from "@/lib/staff-alerts";

const ENABLED_KEY = "servio_staff_alerts";

function seenStorageKey(staffId: string) {
  return `servio_staff_alerts_seen:${staffId}`;
}

function readSeen(staffId: string): Set<string> | null {
  try {
    const raw = window.sessionStorage.getItem(seenStorageKey(staffId));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeSeen(staffId: string, seen: Set<string>) {
  try {
    window.sessionStorage.setItem(seenStorageKey(staffId), JSON.stringify([...seen]));
  } catch {
    // Private mode / storage full: alerts still work for this page load.
  }
}

/**
 * Sound, vibration, browser notification and tab-title counter for a staff
 * screen. The page re-renders every few seconds (AutoRefresh) with the
 * alerts that currently apply; anything not seen before alerts once.
 *
 * Browsers only allow sound and notifications after a tap, so alerts are
 * switched on with a button, and the sound is re-armed by the first tap
 * after a full reload. They work while the screen is open, including in a
 * background tab; alerts with the phone locked need the future native app.
 */
export function StaffAlerts({
  staffId,
  alerts,
  screenName,
}: {
  staffId: string;
  alerts: StaffAlert[];
  screenName: string;
}) {
  const audioRef = useRef<AudioContext | null>(null);
  const seenRef = useRef<Set<string> | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  // Restore the on/off choice (localStorage) after hydration.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabled(window.localStorage.getItem(ENABLED_KEY) === "1");
    } catch {
      // ignore
    }
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  // After a reload the audio context needs a fresh tap: arm it on the first one.
  useEffect(() => {
    if (!enabled || soundReady) return;
    const arm = () => {
      void unlockAudio(audioRef).then(setSoundReady);
    };
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, [enabled, soundReady]);

  // Tab title shows how many things are waiting.
  useEffect(() => {
    document.title = alerts.length > 0 ? `(${alerts.length}) ${screenName} — Servio` : `${screenName} — Servio`;
  }, [alerts.length, screenName]);

  // Alert on anything new.
  useEffect(() => {
    if (seenRef.current === null) {
      const stored = readSeen(staffId);
      if (stored === null) {
        // First load of this screen in this tab: what is already on screen
        // is visible, so start from it instead of ringing for everything.
        seenRef.current = rememberKeys(new Set(), alerts);
        writeSeen(staffId, seenRef.current);
        return;
      }
      seenRef.current = stored;
    }

    const fresh = newAlerts(seenRef.current, alerts);
    seenRef.current = rememberKeys(seenRef.current, alerts);
    writeSeen(staffId, seenRef.current);
    if (fresh.length === 0 || !enabled) return;

    playBeeps(audioRef.current, beepsFor(fresh));
    if ("vibrate" in navigator) navigator.vibrate(Array.from({ length: beepsFor(fresh) }, () => [180, 120]).flat());
    if ("Notification" in window && Notification.permission === "granted") {
      for (const alert of fresh.slice(0, 3)) {
        new Notification(alert.title, { body: alert.body, tag: alert.key });
      }
    }
  }, [alerts, enabled, staffId]);

  async function enable() {
    const ready = await unlockAudio(audioRef);
    setSoundReady(ready);
    if ("Notification" in window && Notification.permission === "default") {
      setPermission(await Notification.requestPermission());
    }
    try {
      window.localStorage.setItem(ENABLED_KEY, "1");
    } catch {
      // ignore
    }
    setEnabled(true);
    playBeeps(audioRef.current, 1);
  }

  function disable() {
    try {
      window.localStorage.setItem(ENABLED_KEY, "0");
    } catch {
      // ignore
    }
    setEnabled(false);
  }

  if (!enabled) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-background p-3 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <BellOff className="size-4" /> Alertes désactivées sur cet appareil.
        </span>
        <Button size="sm" onClick={() => void enable()}>
          <BellRing className="size-4" /> Activer le son et les notifications
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm">
      <span className="flex items-center gap-2">
        <BellRing className="size-4 text-brand" />
        {soundReady ? "Alertes activées" : "Touchez l’écran pour réactiver le son"}
        {permission === "denied" ? (
          <span className="text-muted-foreground"> · notifications bloquées par le navigateur</span>
        ) : null}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => playBeeps(audioRef.current, 1)} disabled={!soundReady}>
          <Volume2 className="size-4" /> Tester
        </Button>
        <Button size="sm" variant="ghost" onClick={disable}>
          Couper
        </Button>
      </div>
    </div>
  );
}

/** Browsers only start audio after a user gesture: call from one. */
async function unlockAudio(ref: RefObject<AudioContext | null>): Promise<boolean> {
  try {
    ref.current ??= new AudioContext();
    await ref.current.resume();
    return ref.current.state === "running";
  } catch {
    return false;
  }
}

function playBeeps(context: AudioContext | null, count: number) {
  if (!context || context.state !== "running" || count <= 0) return;
  const start = context.currentTime;
  for (let i = 0; i < count; i++) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    const at = start + i * 0.28;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.2);
  }
}
