import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, BarChart3, Settings, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BuilderMode = "editor" | "design" | "preview" | "analytics" | "settings";
export type DesignSubMode = "live" | "examples";

interface BuilderHeaderProps {
  projectId: string;
  projectName: string;
  activePageTitle?: string;
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  designSubMode?: DesignSubMode;
  onDesignSubModeChange?: (sub: DesignSubMode) => void;
}

const SegmentedControl = ({ value, onChange }: { value: BuilderMode; onChange: (v: BuilderMode) => void }) => {
  const options: { label: string; value: BuilderMode }[] = [
    { label: "Editor", value: "editor" },
    { label: "Design", value: "design" },
    { label: "Preview", value: "preview" },
  ];

  // Map analytics/settings to no active segment in the toggle
  const activeValue = ["editor", "design", "preview"].includes(value) ? value : null;

  return (
    <div className="flex items-center rounded-full bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1 rounded-full text-[12px] font-medium transition-all ${
            activeValue === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

const DesignSubSelect = ({ value, onChange }: { value: DesignSubMode; onChange: (v: DesignSubMode) => void }) => (
  <Select value={value} onValueChange={(v) => onChange(v as DesignSubMode)}>
    <SelectTrigger className="h-7 w-[110px] rounded-full text-[12px] font-medium border-border bg-muted">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="live" className="text-[12px]">Live</SelectItem>
      <SelectItem value="examples" className="text-[12px]">Examples</SelectItem>
    </SelectContent>
  </Select>
);

const BuilderHeader = ({
  projectId,
  projectName,
  activePageTitle,
  mode,
  onModeChange,
  designSubMode = "live",
  onDesignSubModeChange,
}: BuilderHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 p-1.5 backdrop-blur-xl" style={{ backgroundColor: "hsl(var(--background) / 0.5)" }}>
      <header
        className="border rounded-2xl backdrop-blur-xl shadow-sm"
        style={{ backgroundColor: "hsl(var(--background) / 0.85)", borderColor: "hsl(var(--border))" }}
      >
        <div className="px-4 h-[48px] flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-lg bg-platform-accent-soft flex items-center justify-center shrink-0">
                <FileText className="h-3 w-3 text-primary" />
              </div>
              <span className="font-semibold text-foreground text-[13px] truncate">{projectName}</span>
              {activePageTitle && mode !== "analytics" && mode !== "settings" && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[12px] text-muted-foreground truncate">{activePageTitle}</span>
                </>
              )}
            </div>
          </div>

          {/* Center - Segmented Control (always visible) */}
          <div className="flex items-center justify-center gap-3">
            <SegmentedControl value={mode} onChange={onModeChange} />
            {mode === "design" && onDesignSubModeChange && (
              <DesignSubToggle value={designSubMode} onChange={onDesignSubModeChange} />
            )}
          </div>

          {/* Right - icon nav */}
          <div className="flex items-center gap-0.5 flex-1 justify-end">
            <button
              className={`h-8 rounded-lg px-2 flex items-center gap-1.5 text-[12px] font-medium transition-all ${
                mode === "analytics"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title="Analytics"
              onClick={() => onModeChange("analytics")}
            >
              <BarChart3 className="h-4 w-4" />
              {mode === "analytics" && <span>Analytics</span>}
            </button>
            <button
              className={`h-8 rounded-lg px-2 flex items-center gap-1.5 text-[12px] font-medium transition-all ${
                mode === "settings"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title="Project Settings"
              onClick={() => onModeChange("settings")}
            >
              <Settings className="h-4 w-4" />
              {mode === "settings" && <span>Settings</span>}
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default BuilderHeader;
