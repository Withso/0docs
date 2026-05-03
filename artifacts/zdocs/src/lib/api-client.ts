const API_BASE = "/api";

// Branch routing: BranchContext registers a getter here so every API request
// transparently carries the active branch via X-Branch-Id. The api-server's
// resolveBranchId() reads either ?branchId=… or X-Branch-Id, so existing
// callers that don't append the query param still target the right branch.
let branchIdGetter: () => string | null = () => null;
export function setActiveBranchIdGetter(getter: () => string | null): void {
  branchIdGetter = getter;
}

export async function apiRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  const branchId = branchIdGetter();
  if (branchId && !headers["X-Branch-Id"]) headers["X-Branch-Id"] = branchId;

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await apiRequest(path, options);
  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${errText}`);
  }
  return res.json() as Promise<T>;
}

// Hook that returns a bound fetch helper. Auth is handled by browser cookies,
// so no token wiring is needed.
export function useApi() {
  async function get<T>(path: string): Promise<T> {
    return apiFetch<T>(path, { method: "GET" });
  }

  async function post<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function patch<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function put<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function del(path: string): Promise<void> {
    const res = await apiRequest(path, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      throw new Error(`API DELETE ${res.status}`);
    }
  }

  return { get, post, patch, put, del };
}
