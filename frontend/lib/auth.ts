import { API_BASE } from "./api";

const TOKEN_KEY = "dc_token";
const USER_KEY = "dc_user";

export interface User {
  id: number;
  email: string;
  name: string;
}

// ── token storage ──

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── API calls ──

async function authFetch(path: string, body: object): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(data.detail || "Request failed");
  }
  const data = await res.json();
  saveSession(data.token, data.user);
  return data;
}

export function register(email: string, name: string, password: string) {
  return authFetch("/auth/register", { email, name, password });
}

export function login(email: string, password: string) {
  return authFetch("/auth/login", { email, password });
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
