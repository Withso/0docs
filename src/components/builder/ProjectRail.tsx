import { useNavigate } from "react-router-dom";
import { Home, Pencil, BarChart3, Settings, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { BuilderMode } from "./BuilderHeader";

interface ProjectRailProps {
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  hasUnpublishedChanges?: boolean;
}

type RailItem = {
  id: BuilderMode | "home";
  label: string;
  icon: typeof Home;
  action: "navigate" | "mode";
  target?: BuilderMode;
};

const items: RailItem[] = [
  { id: "home", label: "Home", icon: Home, action: "navigate" },
  { id: "editor", label: "Editor", icon: Pencil, action: "mode", target: "editor" },
  { id: "configurations", label: "Configurations", icon: SlidersHorizontal, action: "mode", target: "configurations" },
  { id: "analytics", label: "Analytics", icon: BarChart3, action: "mode", target: "analytics" },
  { id: "settings", label: "Settings", icon: Settings, action: "mode", target: "settings" },
];

const ProjectRail = ({ mode, onModeChange }: ProjectRailProps) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  // map current mode → which rail item is active
  const activeId: string =
    mode === "editor" || mode === "design" || mode === "preview" || mode === "publish"
      ? "editor"
      : mode;

  const handleClick = (item: RailItem) => {
    if (item.action === "navigate") {
      navigate("/dashboard");
    } else if (item.target) {
      onModeChange(item.target);
    }
  };

  return (
    <aside
      className="shrink-0 border-r border-border/40 bg-background/60 backdrop-blur-xl flex flex-col items-center py-3 gap-1 transition-all"
      style={{ width: collapsed ? 56 : 180 }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            title={item.label}
            className={`group relative w-[calc(100%-12px)] h-9 rounded-lg flex items-center gap-2.5 px-2.5 text-[12.5px] font-medium transition-all ${
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {isActive && collapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r bg-primary" />
            )}
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expand" : "Collapse"}
        className="w-[calc(100%-12px)] h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
};

export default ProjectRail;
