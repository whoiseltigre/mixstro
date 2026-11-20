import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PlayerProvider } from "@/components/player";

// Fonts are self-hosted (src/app/fonts, latin subset, SIL Open Font License via Fontsource) so
// builds never depend on reaching Google Fonts.
// Apple devices use SF first (see globals.css), so Geist, Inter Tight and Roboto are only fetched
// when a page actually needs them instead of being preloaded on every first visit.
const geist = localFont({ src: "./fonts/geist-latin-wght-normal.woff2", variable: "--font-geist", weight: "100 900", display: "swap", preload: false });
const interTight = localFont({
  src: "./fonts/inter-tight-latin-wght-normal.woff2",
  variable: "--font-inter-tight",
  weight: "100 900",
  display: "swap",
  preload: false,
});
// Wordmark face: Outfit variable, set at weight 550.
const outfit = localFont({ src: "./fonts/outfit-latin-wght-normal.woff2", variable: "--font-outfit", weight: "100 900", display: "swap" });
// Google's sign-in button guidelines call for Roboto Medium.
const roboto = localFont({ src: "./fonts/roboto-latin-500-normal.woff2", variable: "--font-roboto", weight: "500", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Mixstro",
  description: "Where musicians meet. Show off your musical journey, find bandmates and land gigs.",
  applicationName: "Mixstro",
  appleWebApp: { capable: true, title: "Mixstro", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0F0D0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${interTight.variable} ${outfit.variable} ${roboto.variable}`}>
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
