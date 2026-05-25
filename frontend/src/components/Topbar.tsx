"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Bell, ChevronDown, LayoutGrid } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function Topbar({ title, icon = "grid" }: { title: string; icon?: "grid" | "sparkle" }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const canGoBack = pathname !== "/" && pathname !== "/assignments";
  const initials = (user?.name || "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const displayName = user?.name || "Guest";

  return (
    <div className="flex items-center justify-between mb-6 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => (canGoBack ? router.back() : null)}
          className={`h-10 w-10 rounded-full bg-surface border border-line flex items-center justify-center text-ink-700 transition ${
            canGoBack ? "hover:bg-muted" : "opacity-50 cursor-default"
          }`}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 text-ink-500 text-sm">
          <LayoutGrid size={16} />
          <span>{title}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative h-10 w-10 rounded-full bg-surface border border-line flex items-center justify-center text-ink-700 hover:bg-muted">
          <Bell size={18} />
          <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="flex items-center gap-2 rounded-full bg-surface border border-line pl-1 pr-3 py-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
            {initials || "?"}
          </div>
          <span className="text-sm font-medium">{displayName}</span>
          <ChevronDown size={14} className="text-ink-500" />
        </div>
      </div>
    </div>
  );
}
