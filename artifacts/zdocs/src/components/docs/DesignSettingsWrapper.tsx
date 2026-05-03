import { forwardRef, useMemo } from "react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { designSettingsToCSSVars } from "@/hooks/use-design-settings";
import { applyModeToSettings, getAppearance } from "@/lib/theme/resolve-doc-theme";
import { usePlatformTheme } from "@/hooks/use-platform-theme";
import {
  derivePreviewSurfaces,
  previewSurfacesToCssVars,
  safeSurfaces,
} from "@/lib/theme/derive-preview-surfaces";
import { ensureAa } from "@/lib/theme/contrast-guard";

/** Wraps children with CSS custom properties derived from design settings.
 *
 *  - Resolves the doc colours to match the current platform theme (light/dark)
 *    so the editor surface and the doc preview always agree.
 *  - The `forceMode` prop overrides this — used by the published doc viewer's
 *    sun/moon toggle.
 *  - Emits a scoped `--docs-*` token contract (bg / surface / sidebarBg /
 *    headerBg / border / muted / foreground / accent / ring / codeBg /
 *    callout) consumed by downstream preview components. The legacy
 *    `--ds-*` and shadcn `--background` etc. tokens are still emitted so
 *    existing consumers keep working until they're migrated.
 *  - Runs a WCAG AA contrast guard on (foreground vs bg) and (muted-fg
 *    vs bg). Failing combos fall back to the safe per-mode scale so a
 *    low-contrast custom palette can never produce unreadable text.
 */
interface DesignSettingsWrapperProps {
  settings: DesignSettings;
  children: React.ReactNode;
  className?: string;
  /** Force a specific mode (overrides platform theme). */
  forceMode?: "light" | "dark";
}

const DesignSettingsWrapper = forwardRef<HTMLDivElement, DesignSettingsWrapperProps>(({
  settings,
  children,
  className = "",
  forceMode,
}, ref) => {
  const { resolved, mode } = useResolvedDesignSettings(settings, forceMode);
  const cssVars = useMemo(() => designSettingsToCSSVars(resolved), [resolved]);

  // Derive layered preview surfaces and run contrast guards. These are
  // memoised on the resolved settings so theme toggles are cheap.
  const docsVars = useMemo(() => {
    const safe = safeSurfaces(mode);
    const surfaces = derivePreviewSurfaces(resolved, mode);
    surfaces.foreground = ensureAa(surfaces.foreground, surfaces.bg, safe.foreground);
    surfaces.mutedForeground = ensureAa(
      surfaces.mutedForeground,
      surfaces.bg,
      safe.mutedForeground,
    );
    return previewSurfacesToCssVars(surfaces);
  }, [resolved, mode]);

  const style: React.CSSProperties = {
    ...Object.fromEntries(Object.entries(cssVars)),
    ...docsVars,
    // Override core CSS variables so themed components pick them up
    "--background": cssVars["--ds-bg"],
    "--foreground": cssVars["--ds-fg"],
    "--primary": cssVars["--ds-primary"],
    "--primary-foreground": cssVars["--ds-primary-fg"],
    "--muted": cssVars["--ds-muted"],
    "--muted-foreground": cssVars["--ds-muted-fg"],
    "--accent": cssVars["--ds-accent"],
    "--border": cssVars["--ds-border"],
    "--doc-link": cssVars["--ds-link"],
    "--doc-section-line": cssVars["--ds-section-line"],
    "--doc-code-bg": cssVars["--ds-code-bg"],
    "--doc-note-bg": cssVars["--ds-note-bg"],
    "--doc-note-border": cssVars["--ds-note-border"],
    fontFamily: `'${resolved.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    fontSize: cssVars["--ds-base-font-size"],
    lineHeight: cssVars["--ds-line-height"],
    backgroundColor: `hsl(${resolved.backgroundColor})`,
    color: `hsl(${resolved.foregroundColor})`,
    transition: "background-color 200ms ease, color 200ms ease",
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      style={style}
      className={`docs-preview-root theme-${mode} ${className}`}
      data-doc-mode={mode}
    >
      {children}
    </div>
  );
});

DesignSettingsWrapper.displayName = "DesignSettingsWrapper";

export function useResolvedDesignSettings(settings: DesignSettings, forceMode?: "light" | "dark") {
  const { theme } = usePlatformTheme();
  const appearance = getAppearance(settings);

  const mode = forceMode
    ?? (appearance.strict
      ? (appearance.default === "system" ? theme : appearance.default)
      : theme);

  const resolved = useMemo(() => applyModeToSettings(settings, mode), [settings, mode]);

  return { resolved, mode } as const;
}

export default DesignSettingsWrapper;
