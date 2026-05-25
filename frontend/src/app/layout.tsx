import "./globals.css";
import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "VedaAI — Assessment Creator",
  description: "AI-powered assessment paper generator for teachers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthGate>
          <AppShell>{children}</AppShell>
        </AuthGate>
      </body>
    </html>
  );
}
