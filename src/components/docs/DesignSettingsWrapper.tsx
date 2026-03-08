import { useMemo } from "react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { designSettingsToCSSVars } from "@/hooks/use-design-settings";

/** Wraps children with CSS custom properties derived from design settings */
const DesignSettingsWrapper = ({
  settings,
  children,
  className = "",
}: {
  settings: DesignSettings;
  children: React.ReactNode;
  className?: string;
}) => {
  const cssVars = useMemo(() => designSettingsToCSSVars(settings), [settings]);

  const style: React.CSSProperties = {
    ...Object.fromEntries(Object.entries(cssVars)),
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
    fontFamily: `'${settings.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    fontSize: cssVars["--ds-base-font-size"],
    lineHeight: cssVars["--ds-line-height"],
    backgroundColor: `hsl(${settings.backgroundColor})`,
    color: `hsl(${settings.foregroundColor})`,
  } as React.CSSProperties;

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
};

export default DesignSettingsWrapper;
