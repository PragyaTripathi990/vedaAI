"use client";

import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuth.getState().user?.wsToken;
    socket = io(SOCKET_URL, {
      // Polling first so the HTTP handshake carries the auth cookie (when same-site),
      // then upgrade to websocket. For cross-origin, the `auth.token` covers us.
      transports: ["polling", "websocket"],
      withCredentials: true,
      reconnection: true,
      auth: token ? { token } : undefined,
    });
  }
  return socket;
}

// Drop the cached socket so the next call to getSocket() opens a fresh
// connection. Used on login + logout so the new auth token is picked up.
export function resetSocket() {
  if (socket) {
    try {
      socket.disconnect();
    } catch {}
    socket = null;
  }
}

export function subscribeToAssignment(
  assignmentId: string,
  handlers: {
    onUpdate?: (e: { status: string; progress: number; message?: string; error?: string }) => void;
    onPartial?: (paper: unknown) => void;
    onComplete?: () => void;
  }
) {
  const s = getSocket();
  const join = () => s.emit("subscribe", assignmentId);
  if (s.connected) join();
  else s.once("connect", join);
  // Re-join on every (re)connect — covers transport upgrades and drops.
  s.on("connect", join);

  const onUpdate = (e: { assignmentId: string; status: string; progress: number; message?: string; error?: string }) => {
    if (e.assignmentId === assignmentId) handlers.onUpdate?.(e);
  };
  const onPartial = (e: { assignmentId: string; paper: unknown }) => {
    if (e.assignmentId === assignmentId) handlers.onPartial?.(e.paper);
  };
  const onComplete = (e: { assignmentId: string }) => {
    if (e.assignmentId === assignmentId) handlers.onComplete?.();
  };

  s.on("assignment:update", onUpdate);
  s.on("assignment:partial", onPartial);
  s.on("assignment:complete", onComplete);

  return () => {
    s.off("connect", join);
    s.off("assignment:update", onUpdate);
    s.off("assignment:partial", onPartial);
    s.off("assignment:complete", onComplete);
  };
}
