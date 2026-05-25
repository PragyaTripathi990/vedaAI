"use client";

import Link from "next/link";
import { Bell, Menu } from "lucide-react";

export function MobileHeader() {
  return (
    <header className="lg:hidden flex items-center justify-between bg-surface rounded-2xl border border-line px-4 py-3 mb-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-white text-xs font-bold">V</span>
        <span className="font-semibold">VedaAI</span>
      </Link>
      <div className="flex items-center gap-2">
        <button className="relative h-9 w-9 rounded-full bg-muted flex items-center justify-center">
          <Bell size={16} />
          <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
          JD
        </div>
        <button className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
          <Menu size={16} />
        </button>
      </div>
    </header>
  );
}
