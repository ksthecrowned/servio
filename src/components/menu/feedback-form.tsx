"use client";

import { useState } from "react";
import { submitFeedback } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const categories = [
  ["food_rating", "Qualité du repas"],
  ["service_rating", "Service"],
  ["experience_rating", "Expérience globale"],
] as const;

export function FeedbackForm({ orderId, restaurantSlug, branchSlug }: { orderId: string; restaurantSlug: string; branchSlug: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    const result = await submitFeedback(formData);
    if (result?.error) setError(result.error);
    else setSubmitted(true);
  }

  if (submitted) {
    return <div className="rounded-lg border bg-muted/30 p-4 text-center"><p className="font-medium">Merci pour votre avis !</p><p className="mt-1 text-sm text-muted-foreground">Votre retour nous aide à améliorer le service.</p></div>;
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5 rounded-lg border p-4">
      <div><h2 className="font-medium">Votre avis</h2><p className="text-sm text-muted-foreground">Notez votre expérience de 1 à 5.</p></div>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="restaurantSlug" value={restaurantSlug} />
      <input type="hidden" name="branchSlug" value={branchSlug} />
      {categories.map(([name, label]) => (
        <div key={name} className="flex flex-col gap-2">
          <Label>{label}</Label>
          <div className="flex gap-2" role="radiogroup" aria-label={label}>
            {[1,2,3,4,5].map((value) => (
              <label key={value} className="cursor-pointer">
                <input className="sr-only peer" type="radio" name={name} value={value} required />
                <span className="flex h-9 w-9 items-center justify-center rounded-full border text-sm peer-checked:bg-brand peer-checked:text-white">{value}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="grid gap-2"><Label htmlFor="feedback-comment">Commentaire (facultatif)</Label><Textarea id="feedback-comment" name="comment" maxLength={1000} placeholder="Un commentaire sur votre expérience ?" /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit">Envoyer mon avis</Button>
    </form>
  );
}
