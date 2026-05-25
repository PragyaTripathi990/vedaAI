"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Settings as SettingsIcon, User } from "lucide-react";
import { apiLogout, useAuth } from "@/lib/auth";

export function MobileHeader() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = (user?.name || "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const displayName = user?.name || "Guest";

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
    <header className="lg:hidden flex items-center justify-between bg-surface rounded-2xl border border-line px-4 py-3 mb-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-white text-xs font-bold">
          V
        </span>
        <span className="font-semibold">VedaAI</span>
      </Link>
      <div className="flex items-center gap-2">
        <button className="relative h-9 w-9 rounded-full bg-muted flex items-center justify-center">
          <Bell size={16} />
          <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white text-xs font-bold"
          >
            {initials || "?"}
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
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted text-left"
              >
                <SettingsIcon size={14} /> Settings
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
    </header>
  );
}
