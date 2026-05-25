"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { apiSignup, useAuth } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    school: "",
    schoolCity: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const user = await apiSignup({
        name: form.name,
        email: form.email,
        password: form.password,
        school: form.school || undefined,
        schoolCity: form.schoolCity || undefined,
      });
      setUser(user);
      router.replace("/assignments");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Signup failed");
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
            <h1 className="text-2xl">Create your account</h1>
          </div>
          <p className="text-sm text-ink-500 mb-6">
            Start designing assessments in minutes.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Jane Sharma"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="input"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="teacher@school.edu"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="input"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">School (optional)</label>
                <input
                  className="input"
                  value={form.school}
                  onChange={(e) => set("school", e.target.value)}
                  placeholder="e.g. Springfield High"
                />
              </div>
              <div>
                <label className="label">City (optional)</label>
                <input
                  className="input"
                  value={form.schoolCity}
                  onChange={(e) => set("schoolCity", e.target.value)}
                  placeholder="e.g. Mumbai"
                />
              </div>
            </div>
            {err && (
              <div className="rounded-xl bg-rose-50 text-hard text-sm px-4 py-2.5">
                {err}
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Creating…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Create account
                </>
              )}
            </button>
          </form>

          <p className="text-sm text-ink-500 text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-accent font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
