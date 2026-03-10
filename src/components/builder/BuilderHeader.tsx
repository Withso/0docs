import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, BarChart3, Settings, ChevronRight } from "lucide-react";

type BuilderMode = "editor" | "design" | "preview";

interface BuilderHeaderProps {
  projectId: string;
  projectName: string;
  activePageTitle?: string;
  mode?: BuilderMode;
  onModeChange?: (mode: BuilderMode) => void;
  activeTool?: "analytics" | "settings" | null;
}

const SegmentedControl = ({ value, onChange }: { value: BuilderMode; onChange: (v: BuilderMode) => void }) => {
  const options: { label: string; value: BuilderMode }[] = [
    { label: "Editor", value: "editor" },
    { label: "Design", value: "design" },
    { label: "Preview", value: "preview" },
  ];

  return (
    <div className="flex items-center rounded-full bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1 rounded-full text-[12px] font-medium transition-all ${
            value === opt.value
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

const BuilderHeader = ({
  projectId,
  projectName,
  activePageTitle,
  mode,
  onModeChange,
  activeTool,
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
              {activePageTitle && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[12px] text-muted-foreground truncate">{activePageTitle}</span>
                </>
              )}
            </div>
          </div>

          {/* Center - Segmented Control (only in builder modes) */}
          <div className="flex items-center justify-center">
            {mode && onModeChange ? (
              <SegmentedControl value={mode} onChange={onModeChange} />
            ) : null}
          </div>

          {/* Right - icon nav */}
          <div className="flex items-center gap-0.5 flex-1 justify-end">
            <button
              className={`h-8 rounded-lg px-2 flex items-center gap-1.5 text-[12px] font-medium transition-all ${
                activeTool === "analytics"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title="Analytics"
              onClick={() => navigate(`/builder/${projectId}/analytics`)}
            >
              <BarChart3 className="h-4 w-4" />
              {activeTool === "analytics" && <span>Analytics</span>}
            </button>
            <button
              className="h-8 rounded-lg px-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              title="Import API"
              onClick={onImportAPI}
            >
              <FileJson className="h-4 w-4" />
            </button>
            <button
              className={`h-8 rounded-lg px-2 flex items-center gap-1.5 text-[12px] font-medium transition-all ${
                activeTool === "settings"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              title="Project Settings"
              onClick={() => navigate(`/builder/${projectId}/settings`)}
            >
              <Settings className="h-4 w-4" />
              {activeTool === "settings" && <span>Settings</span>}
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default BuilderHeader;
