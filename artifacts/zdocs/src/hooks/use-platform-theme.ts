import { useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";
type ThemePreference = "dark" | "light" | "system";
const STORAGE_KEY = "zdocs_theme";
const CHANGE_EVENT = "zdocs:theme-change";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function resolveTheme(pref: ThemePreference): Theme {
  return pref === "system" ? getSystemTheme() : pref;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Fan-out a theme change to every hook instance + every other tab. */
function broadcast(pref: ThemePreference) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ThemePreference>(CHANGE_EVENT, { detail: pref }));
}

/** Initialise theme synchronously (call once before React renders to avoid flash) */
export function initPlatformTheme() {
  applyTheme(resolveTheme(getStoredPreference()));
}

/** React hook for reading / toggling the platform theme.
 *  Every instance subscribes to a window-level CustomEvent so a toggle in
 *  one component (e.g. ThemeToggleButton inside DocContentView) immediately
 *  re-renders every other consumer (e.g. useResolvedDesignSettings in Builder). */
export function usePlatformTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference);
  const [resolved, setResolved] = useState<Theme>(() => resolveTheme(getStoredPreference()));

  const setPreference = useCallback((pref: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, pref);
    const t = resolveTheme(pref);
    applyTheme(t);
    setPreferenceState(pref);
    setResolved(t);
    broadcast(pref);
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPreference]);

  // Sync ALL hook instances when ANY one toggles (single source of truth).
  useEffect(() => {
    const onChange = (e: Event) => {
      const pref = (e as CustomEvent<ThemePreference>).detail ?? getStoredPreference();
      setPreferenceState(pref);
      setResolved(resolveTheme(pref));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const pref = getStoredPreference();
      applyTheme(resolveTheme(pref));
      setPreferenceState(pref);
      setResolved(resolveTheme(pref));
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Listen for OS theme changes when preference is "system"
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      if (getStoredPreference() === "system") {
        const next: Theme = e.matches ? "light" : "dark";
        applyTheme(next);
        setResolved(next);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return { theme: resolved, preference, setPreference, toggle } as const;
}
