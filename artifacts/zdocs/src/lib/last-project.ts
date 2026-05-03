const KEY = "0docs:last-project-id";

export function getLastProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastProjectId(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function clearLastProjectId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
