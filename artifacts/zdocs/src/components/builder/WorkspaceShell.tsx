import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check, ChevronsUpDown, FileText, Home, Inbox, Plus, Search } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import { useAuth } from "@/contexts/AuthContext";
import { listWorkspaceProjects, type WorkspaceProject } from "@/app/api/projects";
import { useAuth as useClerkAuth } from "@clerk/react";

import type { BuilderMode } from "./BuilderHeader";
import ProjectRail from "./ProjectRail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkspaceShellProps {
  project: WorkspaceProject;
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  hasUnpublishedChanges?: boolean;
  children: ReactNode;
}

const WorkspaceShell = ({ project, mode, onModeChange, hasUnpublishedChanges, children }: WorkspaceShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getToken } = useClerkAuth();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    listWorkspaceProjects(getToken)
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [user?.id]);

  const hideTopHeader = ["editor", "code", "preview", "configurations", "publish", "settings"].includes(mode);

  return (
    /* h-screen + overflow-hidden makes the workspace fit the viewport.
       Only inner scroll containers (content column, side panel) scroll —
       the rails stay pinned. */
    <div className="h-screen bg-background flex overflow-hidden">
      <aside className="w-[224px] shrink-0 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border flex flex-col min-h-0">
        <div className="h-[48px] px-2 flex items-center border-b border-sidebar-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full h-8 rounded-md flex items-center gap-2 px-2 text-left hover:bg-sidebar-accent transition-colors">
                <div className="h-5.5 w-5.5 rounded bg-sidebar-accent flex items-center justify-center shrink-0">
                  <FileText className="h-3.5 w-3.5 text-sidebar-accent-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-sidebar-accent-foreground truncate">{project.name}</p>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {projects.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => navigate(`/builder/${item.id}`)} className="gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="truncate flex-1">{item.name}</span>
                  {item.id === project.id && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard")} className="gap-2">
                <Home className="h-3.5 w-3.5" /> Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard")} className="gap-2">
                <Plus className="h-3.5 w-3.5" /> New project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ProjectRail mode={mode} onModeChange={onModeChange} hasUnpublishedChanges={hasUnpublishedChanges} />
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {!hideTopHeader && (
          <header className="h-[48px] shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl px-3 flex items-center justify-between">
            <div className="min-w-0">
              {mode === "settings" ? (() => {
                const match = location.pathname.match(/\/settings\/([^/?#]+)/);
                const section = match?.[1] || "general";
                const label = section.replace(/-/g, " ");
                return (
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <span className="text-muted-foreground">Settings</span>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="text-foreground font-medium capitalize">{label}</span>
                  </div>
                );
              })() : (
                <>
                  <p className="text-[13px] font-medium text-foreground truncate">{project.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{project.slug}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Inbox" aria-label="Inbox">
                <Inbox className="h-4 w-4" />
              </button>
              <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Search" aria-label="Search">
                <Search className="h-4 w-4" />
              </button>
              <ProfileMenu projectId={project.id} />
            </div>
          </header>
        )}
        <div className="flex-1 min-h-0 min-w-0 flex">{children}</div>
      </div>
    </div>
  );
};

export default WorkspaceShell;
