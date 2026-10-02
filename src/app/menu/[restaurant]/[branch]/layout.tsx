import { IBM_Plex_Mono, Lora, Playfair_Display, Plus_Jakarta_Sans, Syne } from "next/font/google";

import { CartProvider } from "@/components/menu/cart-provider";
import { guestTheme } from "@/lib/guest-theme";
import { createClient } from "@/lib/supabase/server";

import "../../guest.css";

const guestSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-guest-sans",
});

const guestDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-guest-display",
});

// Alternative fonts from Dashboard → Apparence. Not preloaded: only the
// restaurants that pick them download them.
const guestSerif = Lora({
  subsets: ["latin"],
  variable: "--font-guest-serif",
  preload: false,
});

const guestSerifDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-guest-serif-display",
  preload: false,
});

const guestMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-guest-mono",
  preload: false,
});

const FONT_VARIABLES = [guestSans, guestDisplay, guestSerif, guestSerifDisplay, guestMono]
  .map((font) => font.variable)
  .join(" ");

export default async function MenuLayout({
  children,
  params,
}: LayoutProps<"/menu/[restaurant]/[branch]">) {
  const { restaurant: restaurantSlug } = await params;
  const supabase = await createClient();

  // The restaurant's branding applies to every guest page: menu, cart and
  // order tracking.
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("restaurant_themes(primary_color, font_family, templates(slug))")
    .eq("slug", restaurantSlug)
    .eq("status", "active")
    .maybeSingle();

  const branding = restaurant?.restaurant_themes;
  const theme = guestTheme({
    templateSlug: branding?.templates?.slug ?? null,
    primaryColor: branding?.primary_color ?? null,
    fontFamily: branding?.font_family ?? null,
  });

  return (
    <CartProvider>
      <div
        className={`${FONT_VARIABLES} guest-app`}
        data-template={theme.template}
        data-font={theme.font}
        style={theme.style}
      >
        <div className="app-shell">{children}</div>
      </div>
    </CartProvider>
  );
}
