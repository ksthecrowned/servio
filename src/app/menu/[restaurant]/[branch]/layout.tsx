import { Plus_Jakarta_Sans, Syne } from "next/font/google";

import { CartProvider } from "@/components/menu/cart-provider";

import "../../guest.css";

const guestSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-guest-sans",
});

const guestDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-guest-display",
});

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className={`${guestSans.variable} ${guestDisplay.variable} guest-app`}>
        <div className="app-shell">{children}</div>
      </div>
    </CartProvider>
  );
}
