import { forwardRef } from "react";
import { Home, Pencil, BarChart3, Settings, SlidersHorizontal } from "lucide-react";
import type { BuilderMode } from "./BuilderHeader";

interface ProjectRailProps {
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  hasUnpublishedChanges?: boolean;
}

type RailItem = {
  id: BuilderMode;
  label: string;
  icon: typeof Home;
  target: BuilderMode;
};

const items: RailItem[] = [
  { id: "home", label: "Home", icon: Home, target: "home" },
  { id: "editor", label: "Editor", icon: Pencil, target: "editor" },
  { id: "configurations", label: "Configurations", icon: SlidersHorizontal, target: "configurations" },
  { id: "analytics", label: "Analytics", icon: BarChart3, target: "analytics" },
  { id: "settings", label: "Settings", icon: Settings, target: "settings" },
];

const ProjectRail = forwardRef<HTMLElement, ProjectRailProps>(({ mode, onModeChange, hasUnpublishedChanges }, ref) => {
  // map current mode → which rail item is active
  const activeId: string =
    mode === "editor" || mode === "preview" || mode === "publish" || mode === "code"
      ? "editor"
      : mode;

  return (
    <aside
      ref={ref}
      className="shrink-0 bg-sidebar-background flex flex-col px-2 py-1.5 gap-0.5 transition-all"
    >
      <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
        Workspace
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.target)}
            title={item.label}
            className={`group relative w-full h-8 rounded-md flex items-center gap-2.5 px-2.5 text-[12.5px] font-medium transition-all ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70"
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r bg-sidebar-primary" />
            )}
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.id === "editor" && hasUnpublishedChanges && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
            )}
          </button>
        );
      })}
    </aside>
  );
});

ProjectRail.displayName = "ProjectRail";

export default ProjectRail;
