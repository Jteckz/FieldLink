import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function AppShell({ children, fullWidth }: { children: ReactNode; fullWidth?: boolean }) {
  return (
    <div className="min-h-screen bg-paper font-sans text-ink antialiased">
      <Header />
      <main className={fullWidth ? "" : "relative mx-auto max-w-6xl px-5 py-8"}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
