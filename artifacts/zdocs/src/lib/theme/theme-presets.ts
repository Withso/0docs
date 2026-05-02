/**
 * Mintlify-style theme presets.
 *
 * Mintlify ships four "themes" that change layout/treatment + brand
 * accents. We map each preset to a coherent set of:
 *   - Mintlify-style brand `colors` ({ primary, light, dark })
 *   - per-mode `backgroundColors` (light/dark hex)
 *   - any per-mode color overrides that give the preset its character
 *
 * Reference: https://mintlify.com/docs/customize/themes
 */
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { MintlifyColors, PerModeColors } from "@/lib/theme/resolve-doc-theme";

export type ThemePresetId = "mint" | "maple" | "palm" | "willow";

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  /** A small hex used in pickers/cards to represent the theme. */
  swatch: string;
  /** Mintlify brand colors. */
  colors: MintlifyColors;
  /** Optional per-mode background tint (hex). */
  backgroundColors?: { light?: string; dark?: string };
  /** Optional per-mode color overrides — partial. */
  colorsLight?: Partial<PerModeColors>;
  colorsDark?: Partial<PerModeColors>;
}

/* ─── Preset definitions ──────────────────────────────────────────── */

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  /* Mint — the Mintlify default. Crisp neutral surfaces, green accent. */
  mint: {
    id: "mint",
    name: "Mint",
    description:
      "The classic Mintlify look. Crisp white surfaces, near-black text, subtle borders, green emphasis.",
    swatch: "#15B36E",
    colors: { primary: "#15B36E", light: "#4ADE80", dark: "#0E8A55" },
    backgroundColors: { light: "#ffffff", dark: "#0d0d0d" },
  },

  /* Maple — warm cream surfaces, amber emphasis, denser type. */
  maple: {
    id: "maple",
    name: "Maple",
    description:
      "Warm cream surfaces, amber emphasis. Cozy editorial feel reminiscent of long-form publications.",
    swatch: "#E0653F",
    colors: { primary: "#E0653F", light: "#F59E0B", dark: "#C2410C" },
    backgroundColors: { light: "#FBF7F2", dark: "#1A0F08" },
    colorsLight: {
      muted: "#F4EDE3",
      accent: "#F4EDE3",
      border: "#EDE3D3",
      sectionLine: "#E5D9C4",
      codeBg: "#F4EDE3",
      noteBg: "#FCF6EB",
      noteBorder: "#EDE3D3",
      sidebarBg: "#FBF7F2",
      mutedForeground: "#7C6A55",
      sidebarText: "#7C6A55",
      sidebarLabel: "#9C8770",
      sidebarSection: "#5C4D3E",
    },
    colorsDark: {
      muted: "#26170D",
      accent: "#2D1C10",
      border: "#3A2618",
      sectionLine: "#3A2618",
      codeBg: "#1F1209",
      noteBg: "#1F1209",
      noteBorder: "#3A2618",
      sidebarBg: "#1A0F08",
    },
  },

  /* Palm — tropical teal/turquoise with cool surfaces. */
  palm: {
    id: "palm",
    name: "Palm",
    description:
      "Tropical teal-to-turquoise gradient feel. Cool surfaces with vibrant accent for product docs that should pop.",
    swatch: "#0EA5A4",
    colors: { primary: "#0EA5A4", light: "#2DD4BF", dark: "#0F766E" },
    backgroundColors: { light: "#FBFEFE", dark: "#06151A" },
    colorsLight: {
      muted: "#ECF6F6",
      accent: "#E0F2F1",
      border: "#D6EAEA",
      sectionLine: "#CFE6E5",
      codeBg: "#ECF6F6",
      noteBg: "#F0FAFA",
      noteBorder: "#D6EAEA",
      sidebarBg: "#FBFEFE",
      mutedForeground: "#557172",
      sidebarText: "#557172",
      sidebarSection: "#3F5D5D",
    },
    colorsDark: {
      muted: "#0B2226",
      accent: "#0F2A2F",
      border: "#16383E",
      sectionLine: "#16383E",
      codeBg: "#0A1F23",
      noteBg: "#0A1F23",
      noteBorder: "#16383E",
      sidebarBg: "#06151A",
    },
  },

  /* Willow — cool indigo/violet for technical / API-heavy docs. */
  willow: {
    id: "willow",
    name: "Willow",
    description:
      "Cool indigo emphasis on neutral surfaces. Modern technical look popular with API and developer docs.",
    swatch: "#6366F1",
    colors: { primary: "#6366F1", light: "#818CF8", dark: "#4F46E5" },
    backgroundColors: { light: "#FCFCFE", dark: "#0A0B1A" },
    colorsLight: {
      muted: "#F2F2F7",
      accent: "#EEF0F8",
      border: "#E4E6F0",
      sectionLine: "#DDE0EE",
      codeBg: "#F2F2F7",
      noteBg: "#F6F7FC",
      noteBorder: "#E4E6F0",
      sidebarBg: "#FCFCFE",
    },
    colorsDark: {
      muted: "#15172A",
      accent: "#1B1E36",
      border: "#262A47",
      sectionLine: "#262A47",
      codeBg: "#0F1124",
      noteBg: "#0F1124",
      noteBorder: "#262A47",
      sidebarBg: "#0A0B1A",
    },
  },
};

export const THEME_PRESET_LIST: ThemePreset[] = [
  THEME_PRESETS.mint,
  THEME_PRESETS.maple,
  THEME_PRESETS.palm,
  THEME_PRESETS.willow,
];

/* ─── Application ────────────────────────────────────────────────── */

/**
 * Apply a preset on top of an existing DesignSettings, returning a new
 * DesignSettings object whose preset-managed fields (brand colors,
 * background tints, per-mode overrides) are REPLACED with the preset's
 * values — not merged.
 *
 * Replacing rather than merging is critical: switching from a rich preset
 * (Maple) to a minimal one (Mint) must drop Maple's per-mode overrides,
 * otherwise the new preset would render with stale color drift.
 *
 * The flat HSL color fields (backgroundColor, primaryColor, ...) are NOT
 * touched here — the existing `applyModeToSettings` resolver derives those
 * from the per-mode hex values when the user toggles light/dark.
 */
export function applyThemePreset(
  settings: DesignSettings,
  presetId: ThemePresetId,
): DesignSettings {
  const preset = THEME_PRESETS[presetId];
  if (!preset) return settings;

  return {
    ...settings,
    colors: { ...preset.colors },
    backgroundColors: { ...(preset.backgroundColors || {}) },
    colorsLight: { ...(preset.colorsLight || {}) },
    colorsDark: { ...(preset.colorsDark || {}) },
    themePreset: presetId,
  };
}

/** Read the preset id stored on settings (if any). */
export function getThemePreset(
  settings: DesignSettings & { themePreset?: ThemePresetId },
): ThemePresetId | undefined {
  return settings.themePreset;
}
