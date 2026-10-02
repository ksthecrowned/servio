import { describe, expect, test } from "bun:test";

import { guestTheme, readableOn, relativeLuminance } from "@/lib/guest-theme";

describe("guestTheme", () => {
  test("applies a valid brand colour with readable text", () => {
    const theme = guestTheme({ templateSlug: "luxury", primaryColor: "#C2410C", fontFamily: "serif" });
    expect(theme.template).toBe("luxury");
    expect(theme.font).toBe("serif");
    expect(theme.style).toMatchObject({ "--primary": "#C2410C", "--primary-foreground": "#fdfbf7" });
  });

  test("dark text on light brand colours", () => {
    expect(readableOn("#FACC15")).toBe("#1c1917");
    expect(readableOn("#FFFFFF")).toBe("#1c1917");
    expect(readableOn("#1E3A8A")).toBe("#fdfbf7");
  });

  test("falls back to the default look on unknown or invalid values", () => {
    const theme = guestTheme({ templateSlug: "does-not-exist", primaryColor: "red", fontFamily: "comic" });
    expect(theme).toEqual({ template: "minimal", font: "sans", style: {} });
    expect(guestTheme({ templateSlug: null, primaryColor: null, fontFamily: null }).template).toBe("minimal");
  });

  test("relative luminance matches WCAG reference points", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });
});
