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

// Convert a File to base64 (without the data: prefix) for the JSON upload path.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

async function uploadViaBase64(file: File) {
  const content = await fileToBase64(file);
  const res = await fetch(`${API_URL}/api/assignments/upload-base64`, {
    method: "POST",
    credentials,
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ content, name: file.name, mime: file.type }),
  });
  return handle<{ text: string; originalName: string }>(res);
}

async function uploadViaMultipart(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/api/assignments/upload`, {
    method: "POST",
    credentials,
    headers: authHeaders(),
    body: fd,
  });
  return handle<{ text: string; originalName: string }>(res);
}

export async function uploadFile(file: File) {
  try {
    return await uploadViaMultipart(file);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isNetworkError =
      msg.toLowerCase().includes("failed to fetch") ||
      msg.toLowerCase().includes("network") ||
      msg.toLowerCase().includes("load failed"); // iOS Safari variant
    if (isNetworkError) {
      // First try waking the backend and retrying multipart.
      await waitForBackendAwake();
      try {
        return await uploadViaMultipart(file);
      } catch (e2) {
        // Multipart still failing on this device — fall back to base64 JSON
        // upload, which uses a simpler request shape that mobile browsers
        // handle more reliably with CORS + Authorization headers.
        const msg2 = e2 instanceof Error ? e2.message : String(e2);
        const stillNetwork =
          msg2.toLowerCase().includes("failed to fetch") ||
          msg2.toLowerCase().includes("network") ||
          msg2.toLowerCase().includes("load failed");
        if (stillNetwork) {
          return await uploadViaBase64(file);
        }
        throw e2;
      }
    }
    throw e;
  }
}
