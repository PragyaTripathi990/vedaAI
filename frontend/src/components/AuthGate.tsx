"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiMe, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const PUBLIC_PATHS = ["/login", "/signup"];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, setUser, setLoading } = useAuth();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiMe()
      .then((u) => mounted && setUser(u))
      .catch(() => mounted && setUser(null));
    return () => {
      mounted = false;
    };
  }, [setUser, setLoading]);

  const isPublic = PUBLIC_PATHS.includes(pathname || "");

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.replace("/login");
    } else if (user && isPublic) {
      router.replace("/assignments");
    }
  }, [user, loading, isPublic, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-500">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!user && !isPublic) return null;
  if (user && isPublic) return null;

  return <>{children}</>;
}
