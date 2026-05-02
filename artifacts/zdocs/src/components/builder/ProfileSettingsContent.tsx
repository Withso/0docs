import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, LogOut, Shield, Sun, Moon, Monitor } from "lucide-react";
import { usePlatformTheme } from "@/hooks/use-platform-theme";
import { useDebouncedCallback } from "@/hooks/use-debounce";

/**
 * Profile settings rendered INSIDE the workspace Settings area.
 * Same content as the standalone /settings/profile page, minus the
 * DashboardLayout shell and back button.
 */
const ProfileSettingsContent = () => {
  const { user, signOut } = useAuth();
  const api = useApi();
  const { preference, setPreference } = usePlatformTheme();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.get<any>("/profiles/me").catch(() => null);
        if (cancelled) return;
        if (data) {
          setDisplayName(data.displayName || data.display_name || user.displayName || "");
          setBio(data.bio || "");
          setIsAdmin(data.isAdmin || false);
        } else {
          setDisplayName(user.displayName || "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const saveProfile = async (name: string, bioVal: string) => {
    if (!user) return;
    await api.patch("/profiles/me", { displayName: name, bio: bioVal }).catch(() => {});
  };

  const debouncedSave = useDebouncedCallback((name: string, bioVal: string) => {
    saveProfile(name, bioVal);
  }, 800);

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val);
    debouncedSave(val, bio);
  };

  const handleBioChange = (val: string) => {
    setBio(val);
    debouncedSave(displayName, val);
  };

  const userInitial = displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Avatar header */}
      <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-accent/40">
        <div className="h-14 w-14 platform-avatar text-lg">{userInitial}</div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground text-[15px]">{displayName || "User"}</h3>
            {isAdmin && (
              <Badge variant="secondary" className="gap-1 text-[11px] bg-accent text-muted-foreground border-0">
                <Shield className="h-3 w-3" /> Admin
              </Badge>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Personal info */}
        <div className="rounded-xl bg-card p-5" style={{ border: "1px solid hsl(var(--border) / 0.4)" }}>
          <h3 className="font-medium text-foreground text-[14px] mb-5">Personal Information</h3>
          <div className="space-y-5">
            <div>
              <Label className="text-[13px] text-muted-foreground mb-1.5 block">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="Your display name"
                  className="pl-10 h-10 rounded-lg bg-accent/40 border-transparent focus-visible:border-border focus-visible:ring-1 focus-visible:ring-ring/30"
                />
              </div>
            </div>
            <div>
              <Label className="text-[13px] text-muted-foreground mb-1.5 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input value={user?.email || ""} disabled className="pl-10 h-10 rounded-lg bg-accent/30 border-transparent opacity-60" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Email cannot be changed</p>
            </div>
            <div>
              <Label className="text-[13px] text-muted-foreground mb-1.5 block">Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => handleBioChange(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className="flex w-full rounded-lg bg-accent/40 border border-transparent px-3 py-2.5 text-[13px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:border-border resize-none text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="rounded-xl bg-card p-5" style={{ border: "1px solid hsl(var(--border) / 0.4)" }}>
          <h3 className="font-medium text-foreground text-[14px] mb-1">Appearance</h3>
          <p className="text-[13px] text-muted-foreground mb-5">Choose your preferred theme for the platform</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "system" as const, label: "System", icon: Monitor, desc: "Follow OS" },
              { value: "light" as const, label: "Light", icon: Sun, desc: "Always light" },
              { value: "dark" as const, label: "Dark", icon: Moon, desc: "Always dark" },
            ]).map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                onClick={() => setPreference(value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                  preference === value
                    ? "bg-accent text-foreground"
                    : "bg-transparent hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[13px] font-medium">{label}</span>
                <span className="text-[11px] text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsContent;
