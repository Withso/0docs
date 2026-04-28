import { Home, Pencil, BarChart3, Settings, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
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

const ProjectRail = ({ mode, onModeChange }: ProjectRailProps) => {
  const [collapsed, setCollapsed] = useState(true);

  // map current mode → which rail item is active
  const activeId: string =
    mode === "editor" || mode === "design" || mode === "preview" || mode === "publish" || mode === "code"
      ? "editor"
      : mode;

  return (
    <aside
      className="shrink-0 bg-sidebar-background flex flex-col items-center px-2 py-2 gap-1 transition-all"
      style={{ width: collapsed ? 56 : 180 }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.target)}
            title={item.label}
            className={`group relative w-full h-9 rounded-lg flex items-center gap-2.5 px-2.5 text-[12.5px] font-medium transition-all ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {isActive && collapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r bg-sidebar-primary" />
            )}
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expand" : "Collapse"}
        className="w-full h-8 rounded-lg flex items-center justify-center text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70 transition-all"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
};

export default ProjectRail;
