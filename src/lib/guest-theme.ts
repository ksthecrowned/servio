import type { CSSProperties } from "react";

/**
 * Turns a restaurant's branding (Dashboard → Apparence) into what the guest
 * menu applies: data attributes selecting a template/font variant in
 * guest.css, and CSS variables for the brand colour.
 *
 * Template slugs match the `templates` table; unknown or missing values fall
 * back to the default look, so a bad row never breaks the menu.
 */

export const GUEST_TEMPLATES = [
  "minimal",
  "classic",
  "modern",
  "luxury",
  "premium-dark",
  "cafe",
  "local",
  "fast-food",
  "coffee",
  "fine-dining",
  "editorial",
] as const;

export type GuestTemplate = (typeof GUEST_TEMPLATES)[number];
export type GuestFont = "sans" | "serif" | "mono";

export type GuestTheme = {
  template: GuestTemplate;
  font: GuestFont;
  style: CSSProperties;
};

const HEX = /^#([0-9a-f]{6})$/i;

/** WCAG relative luminance of a #RRGGBB colour. */
export function relativeLuminance(hex: string): number {
  const value = HEX.exec(hex)?.[1];
  if (!value) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(value.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const LIGHT_TEXT = "#fdfbf7";
const DARK_TEXT = "#1c1917";

/** Text colour with the better contrast on the given background. */
export function readableOn(hex: string): string {
  const l = relativeLuminance(hex);
  const contrastWithLight = (relativeLuminance(LIGHT_TEXT) + 0.05) / (l + 0.05);
  const contrastWithDark = (l + 0.05) / (relativeLuminance(DARK_TEXT) + 0.05);
  return contrastWithLight >= contrastWithDark ? LIGHT_TEXT : DARK_TEXT;
}

export function guestTheme(input: {
  templateSlug: string | null;
  primaryColor: string | null;
  fontFamily: string | null;
}): GuestTheme {
  const template = (GUEST_TEMPLATES as readonly string[]).includes(input.templateSlug ?? "")
    ? (input.templateSlug as GuestTemplate)
    : "minimal";
  const font: GuestFont = input.fontFamily === "serif" || input.fontFamily === "mono" ? input.fontFamily : "sans";

  const style: Record<string, string> = {};
  if (input.primaryColor && HEX.test(input.primaryColor)) {
    style["--primary"] = input.primaryColor;
    style["--primary-foreground"] = readableOn(input.primaryColor);
    style["--ring"] = input.primaryColor;
  }

  return { template, font, style: style as CSSProperties };
}
