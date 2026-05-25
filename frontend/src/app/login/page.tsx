"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { apiLogin, useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const user = await apiLogin(email, password);
      setUser(user);
      router.replace("/assignments");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-white text-sm font-bold">
            V
          </span>
          <span className="font-semibold text-xl">VedaAI</span>
        </Link>

        <div className="card p-7 sm:p-9">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h1 className="text-2xl">Welcome back</h1>
          </div>
          <p className="text-sm text-ink-500 mb-6">
            Sign in to continue creating assessments.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {err && (
              <div className="rounded-xl bg-rose-50 text-hard text-sm px-4 py-2.5">
                {err}
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Signing in…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Sign in
                </>
              )}
            </button>
          </form>

          <p className="text-sm text-ink-500 text-center mt-6">
            New here?{" "}
            <Link href="/signup" className="text-accent font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
