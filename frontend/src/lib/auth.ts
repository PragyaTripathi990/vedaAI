"use client";

import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  school: string;
  schoolCity: string;
}

// Clear any persisted user-scoped draft state from the browser.
// Called on login, signup, and logout so two accounts on the same browser
// don't see each other's drafts.
async function clearLocalDrafts() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("vedaai-form");
  } catch {}
  // Reset the in-memory store too — localStorage removal alone won't undo
  // the current React state.
  try {
    const { useFormStore, useStudentStore } = await import("./store");
    useFormStore.getState().reset();
    useStudentStore.getState().setStudent({ name: "", rollNumber: "", section: "" });
  } catch {}
  // Drop any cached socket so the next subscribe opens a fresh one carrying
  // the new auth cookie.
  try {
    const { resetSocket } = await import("./socket");
    resetSocket();
  } catch {}
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  setUser: (u: AuthUser | null) => void;
  setLoading: (b: boolean) => void;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u, loading: false }),
  setLoading: (b) => set({ loading: b }),
}));

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      msg = data.error || JSON.stringify(data);
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function apiSignup(p: {
  name: string;
  email: string;
  password: string;
  school?: string;
  schoolCity?: string;
}) {
  const res = await fetch(`${API}/api/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  });
  const user = await handle<AuthUser>(res);
  await clearLocalDrafts();
  return user;
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const user = await handle<AuthUser>(res);
  await clearLocalDrafts();
  return user;
}

export async function apiMe() {
  const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
  if (res.status === 401) return null;
  return handle<AuthUser>(res);
}

export async function apiLogout() {
  await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
  await clearLocalDrafts();
}
