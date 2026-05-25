"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FileText, BookOpen, Sparkles } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/assignments", label: "Assignments", icon: FileText },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/toolkit", label: "AI Toolkit", icon: Sparkles },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-900 text-white px-4 pt-3 pb-5">
      <ul className="flex items-center justify-around">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active = it.href === "/" ? pathname === "/" : pathname?.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center gap-1 text-xs ${
                  active ? "text-white" : "text-ink-400"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
