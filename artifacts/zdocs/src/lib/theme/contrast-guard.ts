/**
 * WCAG AA contrast guard for the live preview.
 *
 * Used by DesignSettingsWrapper to make sure that even if a project
 * picks a low-contrast custom background or foreground, body text and
 * muted text remain readable. When a chosen pair fails AA, we fall back
 * to a safe default for that mode.
 *
 * All inputs are HSL strings of the form "H S% L%" (the format used
 * throughout `DesignSettings`). Outputs are the same.
 */

const AA_BODY = 4.5; // body text
const AA_LARGE = 3.0; // large text / non-text UI

function parseHsl(hsl: string): { h: number; s: number; l: number } | null {
  if (typeof hsl !== "string") return null;
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if ([h, s, l].some(Number.isNaN)) return null;
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4)];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Compute the WCAG contrast ratio between two HSL strings. */
export function contrastRatio(fg: string, bg: string): number {
  const f = parseHsl(fg);
  const b = parseHsl(bg);
  if (!f || !b) return 1;
  const L1 = relativeLuminance(hslToRgb(f.h, f.s, f.l));
  const L2 = relativeLuminance(hslToRgb(b.h, b.s, b.l));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns `fg` if it passes AA against `bg`, otherwise `fallback`. */
export function ensureAa(fg: string, bg: string, fallback: string, large = false): string {
  const min = large ? AA_LARGE : AA_BODY;
  if (contrastRatio(fg, bg) >= min) return fg;
  return fallback;
}

export const WCAG = { AA_BODY, AA_LARGE } as const;
