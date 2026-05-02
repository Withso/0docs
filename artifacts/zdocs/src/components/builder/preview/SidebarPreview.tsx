import type { DesignSettings } from "@/hooks/use-design-settings";
import { PreviewSurface } from "./BlockPreview";

const SidebarItem = ({
  label,
  active,
  settings: s,
}: {
  label: string;
  active?: boolean;
  settings: DesignSettings;
}) => (
  <div
    className="relative flex items-center"
    style={{
      fontSize: `${s.sidebarFontSize}px`,
      fontFamily: `'${s.bodyFont}', sans-serif`,
      color: active
        ? `hsl(${s.sidebarActiveColor})`
        : `hsl(${s.sidebarTextColor})`,
      padding: "5px 10px 5px 14px",
      borderRadius: 6,
      background: active ? `hsl(${s.sidebarActiveColor} / 0.10)` : undefined,
      fontWeight: active ? 500 : 400,
    }}
  >
    {active && (
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 6,
          bottom: 6,
          width: 2,
          backgroundColor: `hsl(${s.sidebarIndicatorColor})`,
          borderRadius: 1,
        }}
      />
    )}
    {label}
  </div>
);

export const SidebarPreview = ({ settings: s }: { settings: DesignSettings }) => {
  const labelStyle: React.CSSProperties = {
    fontSize: `${s.sidebarLabelFontSize || 12}px`,
    color: `hsl(${s.sidebarLabelColor || s.foregroundColor})`,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontFamily: `'${s.bodyFont}', sans-serif`,
  };
  const sectionStyle: React.CSSProperties = {
    fontSize: `${s.sidebarSectionFontSize || s.sidebarFontSize - 1}px`,
    color: `hsl(${s.sidebarSectionColor || s.sidebarTextColor})`,
    fontWeight: 600,
    fontFamily: `'${s.bodyFont}', sans-serif`,
  };

  return (
    <PreviewSurface settings={s} height={260}>
      <div
        style={{
          backgroundColor: `hsl(${s.sidebarBg})`,
          padding: 14,
          borderRadius: 8,
          border: `1px solid hsl(${s.borderColor})`,
        }}
      >
        <div style={{ ...labelStyle, marginBottom: 10 }}>Get started</div>
        <div style={{ display: "flex", flexDirection: "column", gap: `${s.sidebarPageGap}px` }}>
          <SidebarItem label="Introduction" active settings={s} />
          <SidebarItem label="Quickstart" settings={s} />
          <SidebarItem label="Configuration" settings={s} />
        </div>

        <div style={{ ...sectionStyle, marginTop: 18, marginBottom: 6, paddingLeft: 10 }}>
          API reference
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: `${s.sidebarPageGap}px` }}>
          <SidebarItem label="Authentication" settings={s} />
          <SidebarItem label="Endpoints" settings={s} />
        </div>

        <div style={{ ...labelStyle, marginTop: 18, marginBottom: 10 }}>Resources</div>
        <SidebarItem label="Changelog" settings={s} />
      </div>
    </PreviewSurface>
  );
};

export default SidebarPreview;
