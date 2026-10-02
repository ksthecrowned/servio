import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

const FLOW = [
  "Scan du QR",
  "Menu digital",
  "Table identifiée",
  "Commande passée",
  "Préparation en cuisine",
  "Suivi en direct",
  "Paiement",
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <BrandMark />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/staff">Espace personnel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Commencer</Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center gap-10 px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Un QR. Tout votre restaurant connecté.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Scannez. Commandez. Servez. Gérez. Servio est le système de gestion centré sur le QR code
            pour les cafés, restaurants, boulangeries et food courts.
          </p>
        </div>

        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Essai gratuit de 14 jours</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>

        <ol className="flex flex-wrap items-center justify-center gap-2 pt-8 text-sm text-muted-foreground">
          {FLOW.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full border px-3 py-1">{step}</span>
              {i < FLOW.length - 1 && <span aria-hidden>→</span>}
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
