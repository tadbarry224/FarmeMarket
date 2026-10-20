import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import {
  SiteHeader,
  SiteHeaderFallback,
} from "@/components/layout/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FarmMarket — producteurs et acheteurs agricoles en Guinée",
    template: "%s · FarmMarket",
  },
  description:
    "FarmMarket met en relation les producteurs agricoles et les acheteurs en Guinée.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* L'en-tête charge l'utilisateur connecté sans retarder l'affichage de la page */}
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-600">
          FarmMarket — producteurs et acheteurs agricoles en Guinée
        </footer>
      </body>
    </html>
  );
}
