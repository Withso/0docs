import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hslStringToHex, type AppearanceSettings, type MintlifyColors, type PerModeColors } from "@/lib/theme/resolve-doc-theme";

export interface BlockStyleSettings {
  color: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  padding: number;

  // Table-specific
  headerBg: string;
  showCellBorders: boolean;
  cellPadding: number;
  headerFontWeight: string;
  stripedRows: boolean;
  stripedRowBg: string;

  // API Endpoint-specific
  methodBadgeRadius: number;
  headerBgColor: string;
  responseBg: string;
  paramFontSize: number;

  // Steps-specific
  circleSize: number;
  circleBg: string;
  circleColor: string;
  connectorColor: string;
  connectorWidth: number;

  // Quote-specific
  borderWidth: number;
  italic: boolean;
  attributionColor: string;

  // Divider-specific
  thickness: number;
  dividerStyle: string; // solid, dashed, dotted
  spacing: number;

  // Card-specific
  titleFontSize: number;
  titleWeight: string;
  showShadow: boolean;

  // Accordion-specific
  headerBgAccordion: string;
  contentBg: string;
  iconSize: number;

  // Tabs-specific
  activeColor: string;
  inactiveColor: string;
  indicatorColor: string;
  tabPadding: number;

  // Code Tabs-specific
  tabBarBg: string;
  activeTabColor: string;
  showLineNumbers: boolean;
}

export interface DesignSettings {
  // Typography
  headingFont: string;
  bodyFont: string;
  codeFont: string;
  baseFontSize: number;
  headingFontSize: number;
  lineHeight: number;

  // Colors (HSL strings like "0 0% 13%")
  backgroundColor: string;
  foregroundColor: string;
  primaryColor: string;
  primaryForegroundColor: string;
  mutedColor: string;
  mutedForegroundColor: string;
  accentColor: string;
  borderColor: string;
  linkColor: string;
  sectionLineColor: string;
  codeBlockBg: string;
  noteBg: string;
  noteBorderColor: string;

  // Layout
  contentMaxWidth: number;
  sidebarWidth: number;
  sectionSpacing: number;
  pageTitleSize: number;

  // Block styles
  headingWeight: string;
  paragraphSpacing: number;
  codeBlockBorderRadius: number;
  noteBorderWidth: number;
  imageRounded: boolean;

  // Sidebar
  sidebarBg: string;
  sidebarTextColor: string;
  sidebarActiveColor: string;
  sidebarFontSize: number;
  sidebarPageGap: number;
  sidebarIndicatorColor: string;
  sidebarShowSectionTracker: boolean;
  sidebarShowPageArrows: boolean;
  sidebarActivePageBg: boolean;

  // Sidebar label/section/group font controls
  sidebarLabelFontSize: number;
  sidebarLabelColor: string;
  sidebarSectionFontSize: number;
  sidebarSectionColor: string;

  // Table of Contents (right sidebar)
  tocVisible: boolean;
  tocGap: number;

  // Section title border
  sectionBorderVisible: boolean;
  sectionBorderColor: string;
  sectionBorderThickness: number;

  // ─── Mintlify-style appearance model (optional, additive) ─────
  /** Brand colours (hex). When set, drives per-mode emphasis. */
  colors?: MintlifyColors;
  /** Light/dark mode behaviour for published docs. */
  appearance?: AppearanceSettings;
  /** Per-mode background overrides (hex). */
  backgroundColors?: { light?: string; dark?: string };
  /** Power-user per-mode palette overrides (hex). */
  colorsLight?: Partial<PerModeColors>;
  colorsDark?: Partial<PerModeColors>;

  // Per-block overrides
  blockStyles: {
    heading: Partial<BlockStyleSettings>;
    paragraph: Partial<BlockStyleSettings>;
    code_block: Partial<BlockStyleSettings>;
    image: Partial<BlockStyleSettings>;
    video: Partial<BlockStyleSettings>;
    youtube: Partial<BlockStyleSettings>;
    ordered_list: Partial<BlockStyleSettings>;
    unordered_list: Partial<BlockStyleSettings>;
    note: Partial<BlockStyleSettings>;
    callout: Partial<BlockStyleSettings>;
    tabs: Partial<BlockStyleSettings>;
    accordion: Partial<BlockStyleSettings>;
    card: Partial<BlockStyleSettings>;
    steps: Partial<BlockStyleSettings>;
    table: Partial<BlockStyleSettings>;
    divider: Partial<BlockStyleSettings>;
    quote: Partial<BlockStyleSettings>;
    api_endpoint: Partial<BlockStyleSettings>;
    code_tabs: Partial<BlockStyleSettings>;
    inline_editor: Partial<BlockStyleSettings>;
  };
}

const emptyBlockStyles: DesignSettings["blockStyles"] = {
  heading: {},
  paragraph: {},
  code_block: {},
  image: {},
  video: {},
  youtube: {},
  ordered_list: {},
  unordered_list: {},
  note: {},
  callout: {},
  tabs: {},
  accordion: {},
  card: {},
  steps: {},
  table: {},
  divider: {},
  quote: {},
  api_endpoint: {},
  code_tabs: {},
  inline_editor: {},
};

/**
 * MINTLIFY "MINT" THEME — Default for all new docs.
 * Sage green primary on pure white. Inter typography. Hairline borders.
 * Mirrors https://www.mintlify.com/docs visual baseline.
 */
export const defaultDesignSettings: DesignSettings = {
  headingFont: "Inter",
  bodyFont: "Inter",
  codeFont: "JetBrains Mono",
  baseFontSize: 16,
  headingFontSize: 24,
  lineHeight: 1.65,

  // Light-mode palette (mirrored to colorsLight below for theme toggle)
  backgroundColor: "0 0% 100%",         // #ffffff
  foregroundColor: "0 0% 4%",           // #0a0a0a
  primaryColor: "152 78% 40%",          // #15B36E mint
  primaryForegroundColor: "0 0% 100%",
  mutedColor: "240 5% 96%",             // #f4f4f5
  mutedForegroundColor: "240 4% 46%",   // #71717a
  accentColor: "240 5% 96%",
  borderColor: "240 6% 93%",            // #ececee hairline
  linkColor: "152 78% 40%",             // mint links
  sectionLineColor: "240 6% 90%",
  codeBlockBg: "240 5% 96%",
  noteBg: "152 60% 97%",
  noteBorderColor: "152 50% 88%",

  contentMaxWidth: 720,
  sidebarWidth: 280,
  sectionSpacing: 48,
  pageTitleSize: 36,

  headingWeight: "600",
  paragraphSpacing: 18,
  codeBlockBorderRadius: 10,
  noteBorderWidth: 0,
  imageRounded: true,

  sidebarBg: "0 0% 100%",
  sidebarTextColor: "240 4% 46%",       // #71717a
  sidebarActiveColor: "152 78% 40%",    // mint for active page
  sidebarFontSize: 14,
  sidebarPageGap: 1,
  sidebarIndicatorColor: "152 78% 40%", // mint indicator bar
  sidebarShowSectionTracker: true,
  sidebarShowPageArrows: false,
  sidebarActivePageBg: false,

  sidebarLabelFontSize: 12,
  sidebarLabelColor: "0 0% 4%",         // black, semibold group heading
  sidebarSectionFontSize: 13,
  sidebarSectionColor: "240 4% 46%",

  tocVisible: true,
  tocGap: 32,

  // Mintlify never shows a section divider line by default
  sectionBorderVisible: false,
  sectionBorderColor: "240 6% 90%",
  sectionBorderThickness: 1,

  // Mintlify appearance: defaults to system, supports light + dark
  appearance: { default: "system", strict: false },
  colors: { primary: "#15B36E", light: "#4ADE80", dark: "#15B36E" },
  backgroundColors: { light: "#ffffff", dark: "#0a0a0a" },

  blockStyles: emptyBlockStyles,
};

export function useDesignSettings(projectId: string | undefined) {
  const [settings, setSettings] = useState<DesignSettings>(defaultDesignSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("project_design_settings")
          .select("*")
          .eq("project_id", projectId)
          .maybeSingle();

        if (error) throw error;

        if (data?.settings) {
          const loaded = data.settings as any;
          const merged: DesignSettings = {
            ...defaultDesignSettings,
            ...loaded,
            blockStyles: { ...emptyBlockStyles, ...(loaded.blockStyles || {}) },
          };
          if (!loaded.colorsDark && !loaded.colorsLight && loaded.borderColor) {
            const pickHsl = (value: unknown, fallback: string) =>
              typeof value === "string" && value.trim().length > 0 ? value : fallback;

            const seed = {
              background: hslStringToHex(pickHsl(loaded.backgroundColor, merged.backgroundColor)),
              foreground: hslStringToHex(pickHsl(loaded.foregroundColor, merged.foregroundColor)),
              primary: hslStringToHex(pickHsl(loaded.primaryColor, merged.primaryColor)),
              primaryForeground: hslStringToHex(pickHsl(loaded.primaryForegroundColor, merged.primaryForegroundColor)),
              muted: hslStringToHex(pickHsl(loaded.mutedColor, merged.mutedColor)),
              mutedForeground: hslStringToHex(pickHsl(loaded.mutedForegroundColor, merged.mutedForegroundColor)),
              accent: hslStringToHex(pickHsl(loaded.accentColor, merged.accentColor)),
              border: hslStringToHex(pickHsl(loaded.borderColor, merged.borderColor)),
              link: hslStringToHex(pickHsl(loaded.linkColor, merged.linkColor)),
              sectionLine: hslStringToHex(pickHsl(loaded.sectionLineColor, merged.sectionLineColor)),
              codeBg: hslStringToHex(pickHsl(loaded.codeBlockBg, merged.codeBlockBg)),
              noteBg: hslStringToHex(pickHsl(loaded.noteBg, merged.noteBg)),
              noteBorder: hslStringToHex(pickHsl(loaded.noteBorderColor, merged.noteBorderColor)),
              sidebarBg: hslStringToHex(pickHsl(loaded.sidebarBg, merged.sidebarBg)),
              sidebarText: hslStringToHex(pickHsl(loaded.sidebarTextColor, merged.sidebarTextColor)),
              sidebarActive: hslStringToHex(pickHsl(loaded.sidebarActiveColor, merged.sidebarActiveColor)),
              sidebarIndicator: hslStringToHex(pickHsl(loaded.sidebarIndicatorColor, merged.sidebarIndicatorColor)),
              sidebarLabel: hslStringToHex(pickHsl(loaded.sidebarLabelColor, merged.sidebarLabelColor)),
              sidebarSection: hslStringToHex(pickHsl(loaded.sidebarSectionColor, merged.sidebarSectionColor)),
            };
            const lightness = parseFloat((loaded.backgroundColor || "0 0% 100%").split(/\s+/)[2] || "100");
            if (lightness >= 50) merged.colorsLight = seed;
            else merged.colorsDark = seed;
          }

          setSettings(merged);
        } else {
          setSettings(defaultDesignSettings);
        }
      } catch (error) {
        console.error("Failed to load design settings", error);
        setSettings(defaultDesignSettings);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId]);

  const saveSettings = useCallback(
    async (newSettings: DesignSettings) => {
      if (!projectId) return;
      setSaving(true);
      setSettings(newSettings);

      await supabase
        .from("project_design_settings")
        .upsert(
          { project_id: projectId, settings: newSettings as any, updated_at: new Date().toISOString() },
          { onConflict: "project_id" }
        );

      setSaving(false);
    },
    [projectId]
  );

  const resetSettings = useCallback(() => {
    saveSettings(defaultDesignSettings);
  }, [saveSettings]);

  return { settings, loading, saving, saveSettings, resetSettings };
}

/** Convert DesignSettings to CSS custom properties for injection */
export function designSettingsToCSSVars(s: DesignSettings): Record<string, string> {
  return {
    "--ds-bg": s.backgroundColor,
    "--ds-fg": s.foregroundColor,
    "--ds-primary": s.primaryColor,
    "--ds-primary-fg": s.primaryForegroundColor,
    "--ds-muted": s.mutedColor,
    "--ds-muted-fg": s.mutedForegroundColor,
    "--ds-accent": s.accentColor,
    "--ds-border": s.borderColor,
    "--ds-link": s.linkColor,
    "--ds-section-line": s.sectionLineColor,
    "--ds-code-bg": s.codeBlockBg,
    "--ds-note-bg": s.noteBg,
    "--ds-note-border": s.noteBorderColor,
    "--ds-heading-font": s.headingFont,
    "--ds-body-font": s.bodyFont,
    "--ds-code-font": s.codeFont,
    "--ds-base-font-size": `${s.baseFontSize}px`,
    "--ds-heading-font-size": `${s.headingFontSize}px`,
    "--ds-line-height": String(s.lineHeight),
    "--ds-content-max": `${s.contentMaxWidth}px`,
    "--ds-sidebar-width": `${s.sidebarWidth}px`,
    "--ds-heading-weight": s.headingWeight,
    "--ds-paragraph-spacing": `${s.paragraphSpacing}px`,
    "--ds-code-radius": `${s.codeBlockBorderRadius}px`,
    "--ds-note-border-width": `${s.noteBorderWidth}px`,
    "--ds-image-rounded": s.imageRounded ? "8px" : "0px",
    "--ds-section-spacing": `${s.sectionSpacing}px`,
    "--ds-page-title-size": `${s.pageTitleSize}px`,
    "--ds-sidebar-page-gap": `${s.sidebarPageGap}px`,
  };
}
