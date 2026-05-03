/**
 * Derive the layered preview surface tokens from a resolved DesignSettings.
 *
 * The live preview needs a small, well-defined token contract so the
 * sidebar, header, content, and "on this page" rail each sit on a
 * visibly distinct surface. Downstream component refactors (sidebar,
 * header, search, content) read these tokens instead of poking at
 * individual `settings.*` fields.
 *
 * Output values are HSL strings ("H S% L%") so they can be dropped
 * straight into `hsl(var(--docs-*))`.
 */
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { DocMode } from "./resolve-doc-theme";
import { hexToHslString } from "./resolve-doc-theme";

export interface PreviewSurfaceTokens {
  bg: string;             // page background
  surface: string;        // raised surface (cards, code blocks)
  sidebarBg: string;      // sidebar pane
  headerBg: string;       // header bar (typically same as bg)
  border: string;         // hairline border between regions
  borderStrong: string;   // stronger border (cards, dividers)
  muted: string;          // soft tinted surface for chips/pills
  mutedForeground: string;// muted text on bg/surface (AA against bg)
  foreground: string;     // primary text on bg
  accent: string;         // brand accent surface
  accentForeground: string;
  ring: string;           // focus ring color
  codeBg: string;         // code block background
  calloutBg: string;
  calloutBorder: string;
}

/* Safe layered defaults, AA against their respective backgrounds.
   Light: white page, hairline borders, near-black text.
   Dark:  near-black page, slightly raised surfaces, near-white text.   */
const SAFE_LIGHT: PreviewSurfaceTokens = {
  bg: "0 0% 100%",
  surface: "240 5% 98%",
  sidebarBg: "240 5% 98%",
  headerBg: "0 0% 100%",
  border: "240 6% 92%",
  borderStrong: "240 6% 86%",
  muted: "240 5% 96%",
  mutedForeground: "240 4% 42%",
  foreground: "240 10% 6%",
  accent: "240 5% 96%",
  accentForeground: "240 10% 6%",
  ring: "152 78% 40%",
  codeBg: "240 5% 96%",
  calloutBg: "152 60% 97%",
  calloutBorder: "152 50% 88%",
};

const SAFE_DARK: PreviewSurfaceTokens = {
  bg: "240 6% 5%",
  surface: "240 5% 9%",
  sidebarBg: "240 5% 7%",
  headerBg: "240 6% 5%",
  border: "240 5% 14%",
  borderStrong: "240 5% 18%",
  muted: "240 5% 11%",
  mutedForeground: "240 4% 64%",
  foreground: "240 5% 96%",
  accent: "240 5% 13%",
  accentForeground: "240 5% 96%",
  ring: "152 78% 50%",
  codeBg: "240 5% 8%",
  calloutBg: "240 5% 9%",
  calloutBorder: "240 5% 16%",
};

export function safeSurfaces(mode: DocMode): PreviewSurfaceTokens {
  return mode === "dark" ? { ...SAFE_DARK } : { ...SAFE_LIGHT };
}

/* Helpers — adjust an HSL string by a lightness delta, clamped 0..100. */
function shiftL(hsl: string, deltaPct: number): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return hsl;
  const h = parts[0];
  const s = parts[1];
  const l = Math.max(0, Math.min(100, parseFloat(parts[2]) + deltaPct));
  return `${h} ${s} ${Math.round(l)}%`;
}

function lightnessOf(hsl: string): number {
  const parts = hsl.trim().split(/\s+/);
  return parts.length >= 3 ? parseFloat(parts[2]) : 0;
}

/** Build the layered surface contract from resolved DesignSettings. */
export function derivePreviewSurfaces(
  settings: DesignSettings,
  mode: DocMode,
): PreviewSurfaceTokens {
  const safe = safeSurfaces(mode);
  const isDark = mode === "dark";

  const bg = settings.backgroundColor || safe.bg;
  const fg = settings.foregroundColor || safe.foreground;

  // Sidebar: prefer designer choice. If it's identical to bg (or within
  // 1% lightness — the cause of the "no contrast" complaint), nudge it
  // to a distinct surface so the pane is visible against content.
  let sidebarBg = settings.sidebarBg || safe.sidebarBg;
  if (Math.abs(lightnessOf(sidebarBg) - lightnessOf(bg)) < 1.5) {
    sidebarBg = isDark ? shiftL(bg, +2) : shiftL(bg, -2);
  }

  const surface = isDark ? shiftL(bg, +4) : shiftL(bg, -2);
  const muted = settings.mutedColor || safe.muted;
  const border = settings.borderColor || safe.border;
  const borderStrong = isDark ? shiftL(border, +4) : shiftL(border, -6);

  // Header bar: matches page bg by default (Mintlify pattern). The header
  // component will overlay a blurred surface on scroll, defined later.
  const headerBg = bg;

  // Code/callout: prefer designer values, fall back to layered surfaces.
  const codeBg = settings.codeBlockBg || (isDark ? shiftL(bg, +3) : shiftL(bg, -3));
  const calloutBg = settings.noteBg || (isDark ? shiftL(bg, +4) : shiftL(bg, -2));
  const calloutBorder = settings.noteBorderColor || border;

  return {
    bg,
    surface,
    sidebarBg,
    headerBg,
    border,
    borderStrong,
    muted,
    mutedForeground: settings.mutedForegroundColor || safe.mutedForeground,
    foreground: fg,
    accent: settings.accentColor || safe.accent,
    accentForeground: fg,
    ring: settings.primaryColor || safe.ring,
    codeBg,
    calloutBg,
    calloutBorder,
  };
}

/** CSS variable map for `--docs-*` tokens (HSL string values, no `hsl()`). */
export function previewSurfacesToCssVars(t: PreviewSurfaceTokens): Record<string, string> {
  return {
    "--docs-bg": t.bg,
    "--docs-surface": t.surface,
    "--docs-sidebar-bg": t.sidebarBg,
    "--docs-header-bg": t.headerBg,
    "--docs-border": t.border,
    "--docs-border-strong": t.borderStrong,
    "--docs-muted": t.muted,
    "--docs-muted-foreground": t.mutedForeground,
    "--docs-foreground": t.foreground,
    "--docs-accent": t.accent,
    "--docs-accent-foreground": t.accentForeground,
    "--docs-ring": t.ring,
    "--docs-code-bg": t.codeBg,
    "--docs-callout-bg": t.calloutBg,
    "--docs-callout-border": t.calloutBorder,
  };
}

// Re-export hex helper for callers that still hold hex values.
export { hexToHslString };
