import { Assignment, AssignmentSummary } from "./types";

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
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<{ id: string; status: string }>(res);
}

export async function regenerateAssignment(id: string) {
  const res = await fetch(`${API_URL}/api/assignments/${id}/regenerate`, {
    method: "POST",
    credentials,
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sectionIndex, questionIndex }),
  });
  return handle<{ ok: boolean }>(res);
}

export async function createVariant(id: string) {
  const res = await fetch(`${API_URL}/api/assignments/${id}/variants`, {
    method: "POST",
    credentials,
  });
  return handle<{ ok: boolean; label: string }>(res);
}

export async function setActiveVariant(id: string, index: number) {
  const res = await fetch(`${API_URL}/api/assignments/${id}/active-variant`, {
    method: "POST",
    credentials,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ index }),
  });
  return handle<{ ok: boolean }>(res);
}

export async function deleteAssignment(id: string) {
  const res = await fetch(`${API_URL}/api/assignments/${id}`, {
    method: "DELETE",
    credentials,
  });
  return handle<{ ok: boolean }>(res);
}

export async function getAssignment(id: string) {
  const res = await fetch(`${API_URL}/api/assignments/${id}`, {
    cache: "no-store",
    credentials,
  });
  return handle<Assignment>(res);
}

export async function listAssignments() {
  const res = await fetch(`${API_URL}/api/assignments`, {
    cache: "no-store",
    credentials,
  });
  return handle<AssignmentSummary[]>(res);
}

export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/api/assignments/upload`, {
    method: "POST",
    credentials,
    body: fd,
  });
  return handle<{ text: string; originalName: string }>(res);
}
