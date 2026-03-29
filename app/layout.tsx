import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Exo_2, Manrope } from "next/font/google";
import "./globals.css";
import { SyncProvider } from "@/components/sync-provider";
import { ThemeSync } from "@/components/theme-sync";

const exo = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo",
  style: ["normal", "italic"],
  weight: ["500", "600", "700", "800"]
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "KAKOR SENTINEL SUPPLY",
  description:
    "Smart Pharmacy Control & Distribution System untuk Puskesmas dengan QR tracking, audit trail, offline sync, dan dashboard cerdas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KAKOR SENTINEL SUPPLY",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#0a2234",
  colorScheme: "dark light"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      className={`${exo.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
      data-theme="dark"
      suppressHydrationWarning
    >
      <body className="font-body">
        <ThemeSync />
        <SyncProvider>{children}</SyncProvider>
      </body>
    </html>
  );
}
