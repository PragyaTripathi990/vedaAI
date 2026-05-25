import { Assignment, AssignmentSummary } from "./types";
import { authHeaders } from "./auth";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

const credentials: RequestCredentials = "include";

export async function createAssignment(payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/api/assignments`, {
    method: "POST",
    credentials,
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handle<{ id: string; status: string }>(res);
}

export async function regenerateAssignment(id: string) {
  const res = await fetch(`${API_URL}/api/assignments/${id}/regenerate`, {
    method: "POST",
    credentials,
    headers: authHeaders(),
  });
  return handle<{ id: string; status: string }>(res);
}

export async function regenerateQuestion(
  id: string,
  sectionIndex: number,
  questionIndex: number
) {
  const res = await fetch(`${API_URL}/api/assignments/${id}/regenerate-question`, {
    method: "POST",
    credentials,
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ sectionIndex, questionIndex }),
  });
  return handle<{ ok: boolean }>(res);
}

export async function createVariant(id: string) {
  const res = await fetch(`${API_URL}/api/assignments/${id}/variants`, {
    method: "POST",
    credentials,
    headers: authHeaders(),
  });
  return handle<{ ok: boolean; label: string }>(res);
}

export async function setActiveVariant(id: string, index: number) {
  const res = await fetch(`${API_URL}/api/assignments/${id}/active-variant`, {
    method: "POST",
    credentials,
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ index }),
  });
  return handle<{ ok: boolean }>(res);
}

export async function deleteAssignment(id: string) {
  const res = await fetch(`${API_URL}/api/assignments/${id}`, {
    method: "DELETE",
    credentials,
    headers: authHeaders(),
  });
  return handle<{ ok: boolean }>(res);
}

export async function getAssignment(id: string) {
  const res = await fetch(`${API_URL}/api/assignments/${id}`, {
    cache: "no-store",
    credentials,
    headers: authHeaders(),
  });
  return handle<Assignment>(res);
}

export async function listAssignments() {
  const res = await fetch(`${API_URL}/api/assignments`, {
    cache: "no-store",
    credentials,
    headers: authHeaders(),
  });
  return handle<AssignmentSummary[]>(res);
}

// Wait for the backend to be reachable. Render free tier sleeps after 15 min
// of idle and cold starts can take 30-60s; uploading a multipart payload
// against a sleeping server produces a generic "Failed to fetch" because the
// connection is killed before the server is ready.
async function waitForBackendAwake(timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${API_URL}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export async function uploadFile(file: File) {
  const send = async () => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/api/assignments/upload`, {
      method: "POST",
      credentials,
      headers: authHeaders(),
      body: fd,
    });
    return handle<{ text: string; originalName: string }>(res);
  };
  try {
    return await send();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
      await waitForBackendAwake();
      return await send();
    }
    throw e;
  }
}
