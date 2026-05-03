import { forwardRef } from "react";
import {
  Home, Pencil, BarChart3, Settings,
  Bot, Sparkles, Plug,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

// "Configurations" was previously a top-level workspace rail item. It has
// moved to the bottom of the inner Navigation/Files sidebar (Mintlify-
// style), so it's no longer listed here. Routing to /configurations is
// still handled by Builder.tsx; the rail just doesn't surface it.
const workspaceItems: RailItem[] = [
  { id: "home", label: "Home", icon: Home, target: "home" },
  { id: "editor", label: "Editor", icon: Pencil, target: "editor" },
  { id: "analytics", label: "Analytics", icon: BarChart3, target: "analytics" },
  { id: "settings", label: "Settings", icon: Settings, target: "settings" },
];

// Aspirational items from the Faithful Mintlify clone — wired but disabled until backend exists.
type AgentItem = { id: string; label: string; icon: typeof Bot };
const agentItems: AgentItem[] = [
  { id: "assistant", label: "Assistant", icon: Sparkles },
  { id: "mcp",       label: "MCP",       icon: Plug },
];

const ProjectRail = forwardRef<HTMLElement, ProjectRailProps>(({ mode, onModeChange, hasUnpublishedChanges }, ref) => {
  // map current mode → which rail item is active
  const activeId: string =
    mode === "editor" || mode === "preview" || mode === "code"
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
      {workspaceItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.target)}
            title={item.label}
            className={`group relative w-full h-8 rounded-md flex items-center gap-2.5 px-2.5 text-[12.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background ${
              isActive
                ? "bg-primary/10 text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/70"
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r bg-sidebar-primary" />
            )}
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
            <span className="truncate">{item.label}</span>
            {item.id === "editor" && hasUnpublishedChanges && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
            )}
          </button>
        );
      })}

      {/* ─── Agents section (placeholder — wired but not yet active) ─── */}
      <div className="mt-3 px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
        Agents
      </div>
      {agentItems.map((item) => {
        const Icon = item.icon;
        return (
          <Tooltip key={item.id} delayDuration={250}>
            <TooltipTrigger asChild>
              {/* aria-disabled (not `disabled`) keeps the item keyboard-focusable so
                  screen-reader/keyboard users can discover the "Coming soon" tooltip. */}
              <button
                type="button"
                role="link"
                aria-disabled="true"
                onClick={(e) => e.preventDefault()}
                className="group relative w-full h-8 rounded-md flex items-center gap-2.5 px-2.5 text-[12.5px] font-medium text-sidebar-foreground/45 cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-sidebar-foreground/40">soon</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[11px]">
              {item.label} — coming soon
            </TooltipContent>
          </Tooltip>
        );
      })}
    </aside>
  );
});

ProjectRail.displayName = "ProjectRail";

export default ProjectRail;
