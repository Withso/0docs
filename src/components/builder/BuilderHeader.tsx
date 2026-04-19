import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Settings, ChevronRight, Upload, Eye, Code2 } from "lucide-react";
import BranchSelector from "./BranchSelector";

export type BuilderMode = "editor" | "design" | "preview" | "analytics" | "settings" | "publish" | "configurations" | "code";
export type EditorTab = "navigation" | "files";
export type DesignSubMode = "live" | "examples";

interface BuilderHeaderProps {
  projectId: string;
  projectName: string;
  activePageTitle?: string;
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  designSubMode?: DesignSubMode;
  onDesignSubModeChange?: (sub: DesignSubMode) => void;
  onPublishClick?: () => void;
  hasUnpublishedChanges?: boolean;
  // Branch selector
  currentBranch?: string;
  hasGithub?: boolean;
  onBranchChange?: (branch: string) => void;
}

/** Visual / Code / Preview toggle — only shown in editor-related modes. */
const ViewToggle = ({ value, onChange }: { value: BuilderMode; onChange: (v: BuilderMode) => void }) => {
  const options: { label: string; value: BuilderMode; icon: typeof Eye }[] = [
    { label: "Visual", value: "editor", icon: FileText },
    { label: "Code", value: "code", icon: Code2 },
    { label: "Preview", value: "preview", icon: Eye },
  ];
  const activeValue = ["editor", "code", "preview"].includes(value) ? value : null;

  return (
    <div className="flex items-center rounded-full bg-muted p-0.5">
      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${
              activeValue === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

const BuilderHeader = ({
  projectId,
  projectName,
  activePageTitle,
  mode,
  onModeChange,
  onPublishClick,
  hasUnpublishedChanges,
  currentBranch = "main",
  hasGithub = false,
  onBranchChange,
}: BuilderHeaderProps) => {
  const navigate = useNavigate();
  const showEditorTools = ["editor", "code", "preview"].includes(mode);

  return (
    <div className="sticky top-0 z-50 p-1.5 backdrop-blur-xl" style={{ backgroundColor: "hsl(var(--background) / 0.5)" }}>
      <header
        className="rounded-2xl backdrop-blur-xl"
        style={{ backgroundColor: "hsl(var(--background) / 0.85)", borderBottom: "1px solid hsl(var(--border) / 0.4)" }}
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
              {activePageTitle && showEditorTools && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[12px] text-muted-foreground truncate">{activePageTitle}</span>
                </>
              )}
            </div>
            {showEditorTools && onBranchChange && (
              <BranchSelector
                projectId={projectId}
                currentBranch={currentBranch}
                hasGithub={hasGithub}
                onBranchChange={onBranchChange}
              />
            )}
          </div>

          {/* Center */}
          <div className="flex items-center justify-center gap-3">
            {showEditorTools && <ViewToggle value={mode} onChange={onModeChange} />}
          </div>

          {/* Right */}
          <div className="flex items-center gap-1 flex-1 justify-end">
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

            {onPublishClick && (
              <Button
                size="sm"
                className="h-8 rounded-xl px-4 text-[12px] font-medium ml-2 relative"
                onClick={onPublishClick}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Publish
                {hasUnpublishedChanges && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-background" />
                )}
              </Button>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};

export default BuilderHeader;
