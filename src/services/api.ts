/**
 * API Service — talks to Flask/SQLite backend at /api
 */

const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function logout() {
  const res = await fetch(`${BASE}/auth/logout`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function getMe() {
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() });
  return handleResponse(res);
}

// ─── Clarifications ──────────────────────────────

export async function fetchClarifications() {
  const res = await fetch(`${BASE}/clarifications`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createClarification(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/clarifications`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateClarification(id: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/clarifications/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteClarification(id: string) {
  const res = await fetch(`${BASE}/clarifications/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function searchClarificationsApi(q: string) {
  const res = await fetch(
    `${BASE}/clarifications/search?q=${encodeURIComponent(q)}`,
    { headers: authHeaders() }
  );
  return handleResponse(res);
}

// ─── Users (admin) ───────────────────────────────

export async function fetchUsers() {
  const res = await fetch(`${BASE}/users`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createUser(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteUser(uid: string) {
  const res = await fetch(`${BASE}/users/${uid}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Upload History ──────────────────────────────

export async function fetchUploadHistory() {
  const res = await fetch(`${BASE}/upload-history`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function addUploadHistory(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/upload-history`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// ─── Chatbot streaming URL ───────────────────────

export function getChatUrl() {
  return `${BASE}/chat`;
}

export function getChatToken() {
  return getToken() ?? "";
}
