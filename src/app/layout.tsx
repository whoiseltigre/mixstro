import type { Metadata, Viewport } from "next";
import { Geist, Inter_Tight, Outfit } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["700", "800"],
});
// Wordmark face: Outfit variable, set at weight 550.
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

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
      <body className={`${geist.variable} ${interTight.variable} ${outfit.variable}`}>
        <div className="mx-auto min-h-dvh w-full max-w-[440px] relative">{children}</div>
      </body>
    </html>
  );
}
