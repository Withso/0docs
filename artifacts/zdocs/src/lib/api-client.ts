import { useAuth } from "@clerk/react";

const API_BASE = "/api";

export async function apiRequest(
  path: string,
  options: RequestInit = {},
  getToken?: () => Promise<string | null>,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (getToken) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  getToken?: () => Promise<string | null>,
): Promise<T> {
  const res = await apiRequest(path, options, getToken);
  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${errText}`);
  }
  return res.json() as Promise<T>;
}

// Hook that returns a bound fetch helper with auth
export function useApi() {
  const { getToken } = useAuth();

  async function get<T>(path: string): Promise<T> {
    return apiFetch<T>(path, { method: "GET" }, getToken);
  }

  async function post<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(
      path,
      { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined },
      getToken,
    );
  }

  async function patch<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(
      path,
      { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined },
      getToken,
    );
  }

  async function put<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(
      path,
      { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined },
      getToken,
    );
  }

  async function del(path: string): Promise<void> {
    const res = await apiRequest(path, { method: "DELETE" }, getToken);
    if (!res.ok && res.status !== 204) {
      throw new Error(`API DELETE ${res.status}`);
    }
  }

  return { get, post, patch, put, del };
}
