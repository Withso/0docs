import { Button } from "@/components/ui/button";
import { Upload, Eye, Code2, FileText, Search, SlidersHorizontal, Sun, Moon } from "lucide-react";
import BranchSelector from "./BranchSelector";
import { usePlatformTheme } from "@/hooks/use-platform-theme";

/** Sun/moon platform theme toggle (also drives the doc preview via DesignSettingsWrapper). */
const PlatformThemeToggle = () => {
  const { theme, toggle } = usePlatformTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      aria-label="Toggle theme"
      className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted/60 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
};

export type BuilderMode = "home" | "editor" | "design" | "preview" | "analytics" | "settings" | "publish" | "configurations" | "code";
export type EditorTab = "navigation" | "files";
export type DesignSubMode = "live" | "examples";

interface BuilderHeaderProps {
  projectId: string;
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  onPublishClick?: () => void;
  hasUnpublishedChanges?: boolean;
  onSearchClick?: () => void;
  // Branch selector
  currentBranch?: string;
  hasGithub?: boolean;
  onBranchChange?: (branch: string) => void;
}

/** Icon-only Visual / Code toggle (Mintlify style). */
const ViewToggle = ({ value, onChange }: { value: BuilderMode; onChange: (v: BuilderMode) => void }) => {
  const options: { value: BuilderMode; icon: typeof Eye; title: string }[] = [
    { value: "editor", icon: FileText, title: "Visual editor" },
    { value: "code", icon: Code2, title: "Code (MDX)" },
  ];
  const activeValue = ["editor", "code"].includes(value) ? value : null;

  return (
    <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/40">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeValue === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            title={opt.title}
            aria-label={opt.title}
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
};

/**
 * Header scoped to the CONTENT AREA only (Mintlify parity).
 * Left:  Visual/Code icon toggle, Branch selector
 * Right: Search bar, Preview icon button, Publish button
 */
const BuilderHeader = ({
  projectId,
  mode,
  onModeChange,
  onPublishClick,
  hasUnpublishedChanges,
  onSearchClick,
  currentBranch = "main",
  hasGithub = false,
  onBranchChange,
}: BuilderHeaderProps) => {
  const isPreview = mode === "preview";

  return (
    <div className="sticky top-0 z-40 px-4 pt-3 pb-2 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center justify-between gap-3">
        {/* Left — view toggle + branch */}
        <div className="flex items-center gap-2 min-w-0">
          <ViewToggle value={mode} onChange={onModeChange} />
          <button
            onClick={() => onModeChange("design")}
            title="Design"
            aria-label="Design"
            className="h-8 w-8 rounded-lg flex items-center justify-center border border-border/40 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onModeChange("configurations")}
            title="Configurations"
            aria-label="Configurations"
            className="h-8 w-8 rounded-lg flex items-center justify-center border border-border/40 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
          {onBranchChange && (
            <BranchSelector
              projectId={projectId}
              currentBranch={currentBranch}
              hasGithub={hasGithub}
              onBranchChange={onBranchChange}
            />
          )}
        </div>

        {/* Right — search + preview + publish */}
        <div className="flex items-center gap-2">
          {onSearchClick && (
            <button
              onClick={onSearchClick}
              className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg bg-muted/60 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[12px] min-w-[180px]"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">Search</span>
              <kbd className="text-[10px] font-mono opacity-70">⌘K</kbd>
            </button>
          )}

          <PlatformThemeToggle />

          <button
            onClick={() => onModeChange(isPreview ? "editor" : "preview")}
            title={isPreview ? "Back to editor" : "Preview"}
            aria-label={isPreview ? "Back to editor" : "Preview"}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all border ${
              isPreview
                ? "bg-foreground text-background border-foreground"
                : "bg-muted/60 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {onPublishClick && (
            <Button
              size="sm"
              className="h-8 rounded-lg px-4 text-[12px] font-medium relative"
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
    </div>
  );
};

export default BuilderHeader;
