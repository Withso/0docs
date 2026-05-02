import { useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";
type ThemePreference = "dark" | "light" | "system";
const STORAGE_KEY = "zdocs_theme";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  if (stored === "system") return "system";
  return "system";
}

function resolveTheme(pref: ThemePreference): Theme {
  return pref === "system" ? getSystemTheme() : pref;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Initialise theme synchronously (call once before React renders to avoid flash) */
export function initPlatformTheme() {
  applyTheme(resolveTheme(getStoredPreference()));
}

/** React hook for reading / toggling the platform theme */
export function usePlatformTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference);
  const [resolved, setResolved] = useState<Theme>(() => resolveTheme(getStoredPreference()));

  const setPreference = useCallback((pref: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, pref);
    const t = resolveTheme(pref);
    applyTheme(t);
    setPreferenceState(pref);
    setResolved(t);
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPreference]);

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
