import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const defaultDesignSettings: DesignSettings = {
  headingFont: "Inter",
  bodyFont: "Inter",
  codeFont: "JetBrains Mono",
  baseFontSize: 15,
  headingFontSize: 18,
  lineHeight: 1.7,

  backgroundColor: "0 0% 100%",
  foregroundColor: "0 0% 13%",
  primaryColor: "0 0% 13%",
  primaryForegroundColor: "0 0% 100%",
  mutedColor: "0 0% 96%",
  mutedForegroundColor: "0 0% 45%",
  accentColor: "0 0% 96%",
  borderColor: "0 0% 90%",
  linkColor: "214 100% 50%",
  sectionLineColor: "20 70% 55%",
  codeBlockBg: "0 0% 97%",
  noteBg: "40 60% 97%",
  noteBorderColor: "40 60% 85%",

  contentMaxWidth: 680,
  sidebarWidth: 240,
  sectionSpacing: 40,
  pageTitleSize: 24,

  headingWeight: "600",
  paragraphSpacing: 16,
  codeBlockBorderRadius: 8,
  noteBorderWidth: 3,
  imageRounded: true,

  sidebarBg: "0 0% 100%",
  sidebarTextColor: "0 0% 45%",
  sidebarActiveColor: "0 0% 13%",
  sidebarFontSize: 14,
  sidebarPageGap: 2,
  sidebarIndicatorColor: "0 0% 13%",
  sidebarShowSectionTracker: true,
  sidebarShowPageArrows: false,
  sidebarActivePageBg: false,

  sidebarLabelFontSize: 10,
  sidebarLabelColor: "0 0% 45%",
  sidebarSectionFontSize: 13,
  sidebarSectionColor: "0 0% 45%",

  tocVisible: true,
  tocGap: 24,

  sectionBorderVisible: true,
  sectionBorderColor: "20 70% 55%",
  sectionBorderThickness: 1,

  blockStyles: emptyBlockStyles,
};

export function useDesignSettings(projectId: string | undefined) {
  const [settings, setSettings] = useState<DesignSettings>(defaultDesignSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      const { data } = await supabase
        .from("project_design_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (data?.settings) {
        const loaded = data.settings as any;
        setSettings({
          ...defaultDesignSettings,
          ...loaded,
          blockStyles: { ...emptyBlockStyles, ...(loaded.blockStyles || {}) },
        });
      } else {
        setSettings(defaultDesignSettings);
      }
      setLoading(false);
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
