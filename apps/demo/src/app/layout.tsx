import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import "@kit/ui/styles.css";
import "./app.css";
import { ThemeProvider, ToastProvider } from "@kit/ui";
import { Telemetry } from "@/components/Telemetry";

export const metadata: Metadata = { title: "Web Platform Kit demo", description: "Next.js demo consuming @kit/ui, @kit/auth and @kit/telemetry" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection(); // dynamic rendering: required so the CSP nonce can be applied to Next's inline scripts
  return (
    <html lang="en">
      <body>
        <ThemeProvider><ToastProvider><Telemetry>
          <header className="site-header">
            <nav aria-label="Main" className="site-nav">
              <a href="/">Home</a><a href="/account">Account</a><a href="/telemetry">Telemetry</a>
            </nav>
          </header>
          <main className="site-main">{children}</main>
        </Telemetry></ToastProvider></ThemeProvider>
      </body>
    </html>
  );
}
