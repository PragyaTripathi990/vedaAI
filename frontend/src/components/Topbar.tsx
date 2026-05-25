"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Bell, ChevronDown, LayoutGrid, LogOut, User } from "lucide-react";
import { apiLogout, useAuth } from "@/lib/auth";

export function Topbar({ title, icon = "grid" }: { title: string; icon?: "grid" | "sparkle" }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuth();
  const canGoBack = pathname !== "/" && pathname !== "/assignments";
  const initials = (user?.name || "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const displayName = user?.name || "Guest";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [menuOpen]);

  const onLogout = async () => {
    setMenuOpen(false);
    await apiLogout();
    setUser(null);
    router.replace("/login");
  };

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
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full bg-surface border border-line pl-1 pr-3 py-1 hover:bg-muted"
            aria-expanded={menuOpen}
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
              {initials || "?"}
            </div>
            <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
            <ChevronDown
              size={14}
              className={`text-ink-500 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-pop border border-line py-2 z-50">
              <div className="px-4 py-2 border-b border-line mb-1">
                <div className="text-sm font-semibold truncate">{displayName}</div>
                {user?.email && (
                  <div className="text-xs text-ink-500 truncate">{user.email}</div>
                )}
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted text-left"
              >
                <User size={14} /> Profile
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted text-hard text-left"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
