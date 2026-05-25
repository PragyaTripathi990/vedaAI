"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { MobileHeader } from "./MobileHeader";

const PUBLIC_PATHS = ["/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname || "");

  if (isPublic) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1400px] p-4 lg:p-4">
        <div className="flex gap-4">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-24 lg:pb-4">
            <MobileHeader />
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
