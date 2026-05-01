import { useNavigate } from "react-router-dom";
import { BookOpen, LogOut, MessageCircle, Monitor, Moon, Sun, UserCog, UserPlus, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformTheme } from "@/hooks/use-platform-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileMenuProps {
  projectId?: string;
}

const ProfileMenu = ({ projectId }: ProfileMenuProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { preference, setPreference } = usePlatformTheme();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const initial = displayName[0]?.toUpperCase() || "U";

  const goSettings = (section: string) => {
    if (projectId) navigate(`/builder/${projectId}/settings/${section}`);
  };

  const themeOptions: { value: "system" | "light" | "dark"; icon: typeof Monitor; label: string }[] = [
    { value: "system", icon: Monitor, label: "System theme" },
    { value: "light", icon: Sun, label: "Light theme" },
    { value: "dark", icon: Moon, label: "Dark theme" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-8 w-8 platform-avatar text-[11px]" title="Profile" aria-label="Profile">
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        {/* Account header */}
        <div className="px-3 py-3 border-b border-border/60">
          <p className="text-[13px] font-semibold text-foreground truncate">{displayName}</p>
          {email && <p className="text-[12px] text-muted-foreground truncate">{email}</p>}
        </div>

        {/* Account actions */}
        <div className="py-1.5">
          <MenuRow icon={UserCog} label="Your profile" onClick={() => goSettings("profile")} />
          <MenuRow icon={UserPlus} label="Invite members" onClick={() => goSettings("members")} />
          <MenuRow icon={Receipt} label="Billing" onClick={() => goSettings("billing")} />
        </div>

        {/* Theme selector */}
        <div className="border-t border-border/60 px-3 py-2.5 flex items-center justify-between">
          <span className="text-[13px] font-medium text-foreground">Theme</span>
          <div className="flex items-center rounded-full bg-muted/60 border border-border/40 p-0.5">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = preference === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setPreference(opt.value)}
                  title={opt.label}
                  aria-label={opt.label}
                  aria-pressed={active}
                  className={`h-6 w-7 rounded-full flex items-center justify-center transition-colors ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Help */}
        <div className="border-t border-border/60 py-1.5">
          <MenuRow
            icon={BookOpen}
            label="Documentation"
            onClick={() => window.open("https://docs.0docs.dev", "_blank", "noreferrer")}
          />
          <MenuRow
            icon={MessageCircle}
            label="Contact support"
            onClick={() => window.open("mailto:support@0docs.dev", "_blank", "noreferrer")}
          />
        </div>

        {/* Logout */}
        <div className="border-t border-border/60 p-2">
          <button
            onClick={signOut}
            className="w-full h-9 rounded-lg border border-border/60 flex items-center justify-center gap-2 text-[13px] text-foreground hover:bg-muted/40 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MenuRow = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Monitor;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-foreground hover:bg-muted/40 transition-colors"
  >
    <Icon className="h-4 w-4 text-muted-foreground" />
    <span>{label}</span>
  </button>
);

export default ProfileMenu;
