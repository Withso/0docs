/**
 * Mintlify-style per-mode theme resolver for user documentation.
 *
 * Mintlify model:
 *   colors: { primary, light, dark }       // hex
 *   appearance: { default: 'system'|'light'|'dark', strict: boolean }
 *   background.color: { light, dark }      // hex
 *
 * 0docs additionally supports per-mode palettes (colorsLight/colorsDark)
 * for power users — when set they override the derived recipe.
 *
 * The resolver returns a fully-populated DesignSettings whose flat
 * color fields match the requested mode, so every existing renderer
 * (DesignSettingsWrapper, exporter CSS, doc components) keeps working.
 */
import type { DesignSettings } from "@/hooks/use-design-settings";

export type DocMode = "light" | "dark";

export interface AppearanceSettings {
  default: "system" | "light" | "dark";
  strict: boolean;
}

export interface MintlifyColors {
  /** Primary brand colour (hex). Used for emphasis in light mode. */
  primary?: string;
  /** Brand accent for dark mode emphasis (hex). */
  light?: string;
  /** Brand colour for buttons / hover states (hex). */
  dark?: string;
}

export interface PerModeColors {
  background: string;        // hex
  foreground: string;        // hex
  primary: string;           // hex
  primaryForeground: string; // hex
  muted: string;             // hex
  mutedForeground: string;   // hex
  accent: string;            // hex
  border: string;            // hex
  link: string;              // hex
  sectionLine: string;       // hex
  codeBg: string;            // hex
  noteBg: string;            // hex
  noteBorder: string;        // hex
  sidebarBg: string;         // hex
  sidebarText: string;       // hex
  sidebarActive: string;     // hex
  sidebarIndicator: string;  // hex
  sidebarLabel: string;      // hex
  sidebarSection: string;    // hex
}

/* ─── Default Mintlify-style palettes ─────────────────────────────── */

export const DEFAULT_LIGHT: PerModeColors = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  primary: "#0a0a0a",
  primaryForeground: "#ffffff",
  muted: "#f4f4f5",
  mutedForeground: "#71717a",
  accent: "#f4f4f5",
  border: "#ececee",
  link: "#3b82f6",
  sectionLine: "#e4e4e7",
  codeBg: "#f4f4f5",
  noteBg: "#fafafa",
  noteBorder: "#e4e4e7",
  sidebarBg: "#ffffff",
  sidebarText: "#71717a",
  sidebarActive: "#0a0a0a",
  sidebarIndicator: "#0a0a0a",
  sidebarLabel: "#a1a1aa",
  sidebarSection: "#52525b",
};

export const DEFAULT_DARK: PerModeColors = {
  background: "#0d0d0d",
  foreground: "#f0f0f0",
  primary: "#ffffff",
  primaryForeground: "#0d0d0d",
  muted: "#1e1e1e",
  mutedForeground: "#707070",
  accent: "#1e1e1e",
  border: "#2a2a2a",
  link: "#a1a1aa",
  sectionLine: "#303030",
  codeBg: "#161616",
  noteBg: "#161616",
  noteBorder: "#2a2a2a",
  sidebarBg: "#0a0a0a",
  sidebarText: "#707070",
  sidebarActive: "#f0f0f0",
  sidebarIndicator: "#f0f0f0",
  sidebarLabel: "#707070",
  sidebarSection: "#707070",
};

/* ─── Hex ↔ HSL helpers (HSL in our settings is "h s% l%") ────────── */

export function hexToHslString(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return "0 0% 0%";
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      default: h = ((r - g) / d + 4) * 60;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function hslStringToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#000000";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/* ─── Resolution ──────────────────────────────────────────────────── */

/** Pick the colour for a given mode: explicit per-mode override > Mintlify-derived > default. */
function deriveModeColors(
  mode: DocMode,
  mintlify: MintlifyColors | undefined,
  override: Partial<PerModeColors> | undefined,
): PerModeColors {
  const base = mode === "light" ? DEFAULT_LIGHT : DEFAULT_DARK;
  const out: PerModeColors = { ...base };

  // Mintlify primary mapping:
  //   light mode: emphasis = colors.primary
  //   dark mode:  emphasis = colors.light (falls back to primary)
  //   colors.dark drives link/button hover across both modes
  if (mintlify) {
    const emphasis = mode === "light"
      ? (mintlify.primary || mintlify.dark || base.primary)
      : (mintlify.light || mintlify.primary || base.primary);
    out.primary = emphasis;
    out.link = mintlify.dark || mintlify.primary || base.link;
    out.sidebarIndicator = emphasis;
    out.sidebarActive = mode === "light" ? "#0a0a0a" : "#f0f0f0";
  }

  if (override) Object.assign(out, override);
  return out;
}

export interface ResolveOptions {
  /** Mintlify-style brand colors. */
  colors?: MintlifyColors;
  /** Per-mode background overrides ({ light, dark } hex). */
  backgroundColors?: { light?: string; dark?: string };
  /** Power-user per-mode overrides (hex values). */
  colorsLight?: Partial<PerModeColors>;
  colorsDark?: Partial<PerModeColors>;
}

/** Resolve per-mode color values (still hex) for a given mode. */
export function resolveModeColors(mode: DocMode, opts: ResolveOptions): PerModeColors {
  const override = mode === "light" ? opts.colorsLight : opts.colorsDark;
  const colors = deriveModeColors(mode, opts.colors, override);
  const bgOverride = mode === "light" ? opts.backgroundColors?.light : opts.backgroundColors?.dark;
  if (bgOverride) colors.background = bgOverride;
  return colors;
}

/**
 * Apply per-mode colors to a DesignSettings object, returning a new object
 * whose flat color fields (HSL strings) reflect the requested mode.
 *
 * Existing single-mode settings remain the source of truth when the new
 * appearance fields are absent — guaranteeing zero behaviour change for
 * legacy projects.
 */
export function applyModeToSettings(
  settings: DesignSettings,
  mode: DocMode,
): DesignSettings {
  const ext = settings as DesignSettings & {
    appearance?: AppearanceSettings;
    colors?: MintlifyColors;
    backgroundColors?: { light?: string; dark?: string };
    colorsLight?: Partial<PerModeColors>;
    colorsDark?: Partial<PerModeColors>;
  };

  // If no appearance config is set AND user is asking for the natural mode,
  // we still want to honour their existing flat values.
  const hasAppearanceModel =
    !!ext.colors || !!ext.colorsLight || !!ext.colorsDark || !!ext.backgroundColors;

  // Legacy projects (no Mintlify-style appearance config): infer the
  // project's "natural" mode from the saved background lightness. The natural
  // mode keeps the user's existing colours (they're the source of truth);
  // the opposite mode falls back to the Mintlify default palette so toggling
  // never breaks the layout.
  if (!hasAppearanceModel) {
    const lightness = parseFloat(
      (settings.backgroundColor || "0 0% 100%").split(/\s+/)[2] || "100",
    );
    const naturalMode: DocMode = lightness >= 50 ? "light" : "dark";
    if (mode === naturalMode) return settings;
    const fallback = mode === "light" ? DEFAULT_LIGHT : DEFAULT_DARK;
    return {
      ...settings,
      backgroundColor: hexToHslString(fallback.background),
      foregroundColor: hexToHslString(fallback.foreground),
      primaryColor: hexToHslString(fallback.primary),
      primaryForegroundColor: hexToHslString(fallback.primaryForeground),
      mutedColor: hexToHslString(fallback.muted),
      mutedForegroundColor: hexToHslString(fallback.mutedForeground),
      accentColor: hexToHslString(fallback.accent),
      borderColor: hexToHslString(fallback.border),
      linkColor: hexToHslString(fallback.link),
      sectionLineColor: hexToHslString(fallback.sectionLine),
      codeBlockBg: hexToHslString(fallback.codeBg),
      noteBg: hexToHslString(fallback.noteBg),
      noteBorderColor: hexToHslString(fallback.noteBorder),
      sidebarBg: hexToHslString(fallback.sidebarBg),
      sidebarTextColor: hexToHslString(fallback.sidebarText),
      sidebarActiveColor: hexToHslString(fallback.sidebarActive),
      sidebarIndicatorColor: hexToHslString(fallback.sidebarIndicator),
      sidebarLabelColor: hexToHslString(fallback.sidebarLabel),
      sidebarSectionColor: hexToHslString(fallback.sidebarSection),
      sectionBorderColor: hexToHslString(fallback.sectionLine),
    };
  }

  const c = resolveModeColors(mode, {
    colors: ext.colors,
    backgroundColors: ext.backgroundColors,
    colorsLight: ext.colorsLight,
    colorsDark: ext.colorsDark,
  });

  return {
    ...settings,
    backgroundColor: hexToHslString(c.background),
    foregroundColor: hexToHslString(c.foreground),
    primaryColor: hexToHslString(c.primary),
    primaryForegroundColor: hexToHslString(c.primaryForeground),
    mutedColor: hexToHslString(c.muted),
    mutedForegroundColor: hexToHslString(c.mutedForeground),
    accentColor: hexToHslString(c.accent),
    borderColor: hexToHslString(c.border),
    linkColor: hexToHslString(c.link),
    sectionLineColor: hexToHslString(c.sectionLine),
    codeBlockBg: hexToHslString(c.codeBg),
    noteBg: hexToHslString(c.noteBg),
    noteBorderColor: hexToHslString(c.noteBorder),
    sidebarBg: hexToHslString(c.sidebarBg),
    sidebarTextColor: hexToHslString(c.sidebarText),
    sidebarActiveColor: hexToHslString(c.sidebarActive),
    sidebarIndicatorColor: hexToHslString(c.sidebarIndicator),
    sidebarLabelColor: hexToHslString(c.sidebarLabel),
    sidebarSectionColor: hexToHslString(c.sidebarSection),
    sectionBorderColor: hexToHslString(c.sectionLine),
  };
}

/** Read the appearance config (with sane defaults). */
export function getAppearance(settings: DesignSettings): AppearanceSettings {
  const ext = settings as DesignSettings & { appearance?: AppearanceSettings };
  return {
    default: ext.appearance?.default ?? "system",
    strict: ext.appearance?.strict ?? false,
  };
}
