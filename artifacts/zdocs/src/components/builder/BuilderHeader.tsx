import { Eye, Play, Code2, FileText, Search } from "lucide-react";

export type BuilderMode = "home" | "editor" | "preview" | "analytics" | "settings" | "configurations" | "code";
export type EditorTab = "navigation" | "files";

interface BuilderHeaderProps {
  projectId: string;
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  /** Render slot for the Publish dropdown (Mintlify-style). When provided,
   *  replaces the default no-op button. */
  publishSlot?: React.ReactNode;
  onSearchClick?: () => void;
  /** Optional slot rendered next to the view toggle (e.g. the version switcher). */
  leftSlot?: React.ReactNode;
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
            aria-pressed={isActive}
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
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
 * Left:  Visual / Code icon toggle (Configurations now lives in the project rail)
 * Right: Search bar, Preview icon button, Publish button
 */
const BuilderHeader = ({
  mode,
  onModeChange,
  publishSlot,
  onSearchClick,
  leftSlot,
}: BuilderHeaderProps) => {
  const isPreview = mode === "preview";

  return (
    <div className="sticky top-0 z-40 px-4 pt-3 pb-2 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center justify-between gap-3">
        {/* Left — view toggle + optional slot (e.g. version switcher) */}
        <div className="flex items-center gap-2 min-w-0">
          <ViewToggle value={mode} onChange={onModeChange} />
          {leftSlot}
        </div>

        {/* Right — search + preview + publish */}
        <div className="flex items-center gap-2">
          {onSearchClick && (
            <>
              {/* Wide search pill — only shown when there's room (≥ lg). */}
              <button
                onClick={onSearchClick}
                aria-label="Search"
                className="hidden lg:flex items-center gap-2 h-8 px-3 rounded-lg bg-muted/60 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[12px] w-[200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">Search</span>
                <kbd className="text-[10px] font-mono opacity-70">⌘K</kbd>
              </button>
              {/* Compact icon-only search — shown below lg so the header never overflows. */}
              <button
                onClick={onSearchClick}
                aria-label="Search"
                title="Search (⌘K)"
                className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center bg-muted/60 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => onModeChange(isPreview ? "editor" : "preview")}
            title={isPreview ? "Back to editor" : "Preview"}
            aria-label={isPreview ? "Back to editor" : "Preview"}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
              isPreview
                ? "bg-foreground text-background border-foreground"
                : "bg-muted/60 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
          </button>

          {publishSlot}
        </div>
      </div>
    </div>
  );
};

export default BuilderHeader;
