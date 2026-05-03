import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/lib/api-client";
import { hslStringToHex, type AppearanceSettings, type MintlifyColors, type PerModeColors } from "@/lib/theme/resolve-doc-theme";
import type { ThemePresetId } from "@/lib/theme/theme-presets";

export interface BlockStyleSettings {
  color: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  padding: number;
  headerBg: string;
  showCellBorders: boolean;
  cellPadding: number;
  headerFontWeight: string;
  stripedRows: boolean;
  stripedRowBg: string;
  methodBadgeRadius: number;
  headerBgColor: string;
  responseBg: string;
  paramFontSize: number;
  circleSize: number;
  circleBg: string;
  circleColor: string;
  connectorColor: string;
  connectorWidth: number;
  borderWidth: number;
  italic: boolean;
  attributionColor: string;
  thickness: number;
  dividerStyle: string;
  spacing: number;
  titleFontSize: number;
  titleWeight: string;
  showShadow: boolean;
  headerBgAccordion: string;
  contentBg: string;
  iconSize: number;
  activeColor: string;
  inactiveColor: string;
  indicatorColor: string;
  tabPadding: number;
  tabBarBg: string;
  activeTabColor: string;
  showLineNumbers: boolean;
}

export interface DesignSettings {
  headingFont: string;
  bodyFont: string;
  codeFont: string;
  baseFontSize: number;
  headingFontSize: number;
  lineHeight: number;
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
  contentMaxWidth: number;
  sidebarWidth: number;
  sectionSpacing: number;
  pageTitleSize: number;
  headingWeight: string;
  paragraphSpacing: number;
  codeBlockBorderRadius: number;
  noteBorderWidth: number;
  imageRounded: boolean;
  sidebarBg: string;
  sidebarTextColor: string;
  sidebarActiveColor: string;
  sidebarFontSize: number;
  sidebarPageGap: number;
  sidebarIndicatorColor: string;
  sidebarShowSectionTracker: boolean;
  sidebarShowPageArrows: boolean;
  sidebarActivePageBg: boolean;
  sidebarLabelFontSize: number;
  sidebarLabelColor: string;
  sidebarSectionFontSize: number;
  sidebarSectionColor: string;
  tocVisible: boolean;
  tocGap: number;
  sectionBorderVisible: boolean;
  sectionBorderColor: string;
  sectionBorderThickness: number;
  colors?: MintlifyColors;
  appearance?: AppearanceSettings;
  backgroundColors?: { light?: string; dark?: string };
  colorsLight?: Partial<PerModeColors>;
  colorsDark?: Partial<PerModeColors>;
  /** Optional Mintlify-style theme preset marker (Mint / Maple / Palm / Willow). */
  themePreset?: ThemePresetId;
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
  heading: {}, paragraph: {}, code_block: {}, image: {}, video: {}, youtube: {},
  ordered_list: {}, unordered_list: {}, note: {}, callout: {}, tabs: {}, accordion: {},
  card: {}, steps: {}, table: {}, divider: {}, quote: {}, api_endpoint: {}, code_tabs: {}, inline_editor: {},
};

export const defaultDesignSettings: DesignSettings = {
  headingFont: "Inter", bodyFont: "Inter", codeFont: "JetBrains Mono",
  baseFontSize: 16, headingFontSize: 24, lineHeight: 1.65,
  backgroundColor: "0 0% 100%", foregroundColor: "0 0% 4%",
  primaryColor: "152 78% 40%", primaryForegroundColor: "0 0% 100%",
  mutedColor: "240 5% 96%", mutedForegroundColor: "240 4% 46%",
  accentColor: "240 5% 96%", borderColor: "240 6% 93%",
  linkColor: "152 78% 40%", sectionLineColor: "240 6% 90%",
  codeBlockBg: "240 5% 96%", noteBg: "152 60% 97%", noteBorderColor: "152 50% 88%",
  contentMaxWidth: 720, sidebarWidth: 280, sectionSpacing: 48, pageTitleSize: 36,
  headingWeight: "600", paragraphSpacing: 18, codeBlockBorderRadius: 10, noteBorderWidth: 0, imageRounded: true,
  sidebarBg: "0 0% 98%", sidebarTextColor: "240 4% 32%", sidebarActiveColor: "152 78% 40%",
  sidebarFontSize: 14, sidebarPageGap: 2, sidebarIndicatorColor: "152 78% 40%",
  sidebarShowSectionTracker: true, sidebarShowPageArrows: false, sidebarActivePageBg: false,
  sidebarLabelFontSize: 12, sidebarLabelColor: "0 0% 4%",
  sidebarSectionFontSize: 13, sidebarSectionColor: "240 4% 46%",
  tocVisible: true, tocGap: 32,
  sectionBorderVisible: false, sectionBorderColor: "240 6% 90%", sectionBorderThickness: 1,
  appearance: { default: "system", strict: false },
  colors: { primary: "#15B36E", light: "#4ADE80", dark: "#15B36E" },
  backgroundColors: { light: "#ffffff", dark: "#0a0a0a" },
  blockStyles: emptyBlockStyles,
};

export function useDesignSettings(projectId: string | undefined) {
  const api = useApi();
  const [settings, setSettings] = useState<DesignSettings>(defaultDesignSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        const data = await api.get<any>(`/projects/${projectId}/design`);
        if (data?.settings) {
          const loaded = data.settings as any;
          const merged: DesignSettings = {
            ...defaultDesignSettings, ...loaded,
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

  const saveSettings = useCallback(async (newSettings: DesignSettings) => {
    if (!projectId) return;
    setSaving(true);
    setSettings(newSettings);
    try {
      await api.put(`/projects/${projectId}/design`, { settings: newSettings });
    } catch (e) {
      console.error("Failed to save design settings", e);
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  const resetSettings = useCallback(() => {
    saveSettings(defaultDesignSettings);
  }, [saveSettings]);

  return { settings, loading, saving, saveSettings, resetSettings };
}

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
