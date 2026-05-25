"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Users,
  FileText,
  Sparkles,
  PieChart,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";
import { apiLogout, useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/groups", label: "My Groups", icon: Users },
  {
    href: "/assignments",
    label: "Assignments",
    icon: FileText,
    badge: undefined as string | undefined,
  },
  { href: "/toolkit", label: "AI Teacher's Toolkit", icon: Sparkles },
  { href: "/library", label: "My Library", icon: PieChart, badge: "32" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const onLogout = async () => {
    await apiLogout();
    setUser(null);
    router.replace("/login");
  };

  const initials = (user?.name || "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-sidebar rounded-3xl shadow-sidebar border border-line p-5 h-[calc(100vh-32px)] sticky top-4">
      <Link href="/" className="flex items-center gap-2 mb-6 px-1">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white text-xs font-bold">
          V
        </span>
        <span className="font-semibold text-lg">VedaAI</span>
      </Link>

      <button
        onClick={() => router.push("/assignments/new")}
        className="btn-primary w-full mb-6"
      >
        <Plus size={16} strokeWidth={2.5} />
        Create Assignment
      </button>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                active ? "bg-muted text-ink-900 font-semibold" : "text-ink-500 hover:bg-muted hover:text-ink-900"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-accent text-white text-[11px] font-semibold px-2 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 flex flex-col gap-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-ink-500 hover:bg-muted hover:text-ink-900"
        >
          <Settings size={18} strokeWidth={1.75} />
          Settings
        </Link>
        <div className="relative" ref={popRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center gap-3 rounded-2xl border border-line p-3 hover:bg-muted text-left"
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shrink-0 flex items-center justify-center text-white font-bold text-sm">
              {initials || "👤"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">
                {user?.school || user?.name || "Sign in"}
              </div>
              <div className="text-xs text-ink-500 truncate">
                {user
                  ? user.schoolCity || (user.school ? user.email : "Teacher")
                  : "—"}
              </div>
            </div>
          </button>
          {open && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-pop border border-line py-2 z-30">
              <div className="px-4 py-2 border-b border-line">
                <div className="text-sm font-semibold truncate">{user?.name}</div>
                <div className="text-xs text-ink-500 truncate">{user?.email}</div>
              </div>
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-sm text-hard hover:bg-muted flex items-center gap-2"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
