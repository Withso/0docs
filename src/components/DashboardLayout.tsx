import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, FolderOpen, LogOut, User } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userInitial = user?.user_metadata?.display_name?.[0]?.toUpperCase()
    || user?.email?.[0]?.toUpperCase()
    || "U";

  const isProjectsActive = location.pathname === "/dashboard";
  const isProfileActive = location.pathname === "/settings/profile";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — borderless, uses background separation */}
      <div className="hidden md:flex shrink-0">
        <aside className="w-[var(--platform-sidebar-width)] bg-background flex flex-col overflow-hidden border-r border-border/40">
          {/* Logo */}
          <div className="h-[52px] flex items-center gap-2.5 px-5">
            <div className="h-7 w-7 rounded-lg bg-foreground/10 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-foreground" />
            </div>
            <span className="font-semibold text-[14px] tracking-tight text-foreground">0docs</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-1 space-y-0.5">
            <div
              className={`platform-nav-item ${isProjectsActive ? "active" : ""} cursor-pointer`}
              onClick={() => navigate("/dashboard")}
            >
              <FolderOpen className="h-4 w-4" />
              <span>Projects</span>
            </div>
            <div
              className={`platform-nav-item ${isProfileActive ? "active" : ""} cursor-pointer`}
              onClick={() => navigate("/settings/profile")}
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </div>
          </nav>

          {/* User section */}
          <div className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/60 transition-colors">
                  <div className="h-7 w-7 platform-avatar text-[11px]">
                    {userInitial}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {user?.user_metadata?.display_name || "User"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden h-[52px] border-b border-border/40 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-[15px] text-foreground">0docs</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 platform-avatar text-[11px]">
                {userInitial}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
                <User className="h-4 w-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
