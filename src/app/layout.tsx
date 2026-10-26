import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "PatchPilot — Understand Any Codebase. Find Your First Contribution.",
  description: "AI-Powered Repository Onboarding for Beginners",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface font-sans text-on-surface min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full pt-14">{children}</main>
        <footer className="w-full bg-surface-container-lowest border-t border-surface-container py-4 text-center text-xs text-on-surface-variant">
          PatchPilot © 2026. Engineering guidance for newcomers.
        </footer>
      </body>
    </html>
  );
}
