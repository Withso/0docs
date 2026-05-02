import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Mail, LogOut, Sun, Moon, Monitor } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { usePlatformTheme } from "@/hooks/use-platform-theme";
import { useDebouncedCallback } from "@/hooks/use-debounce";

const ProfileSettings = () => {
  const { user, signOut } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const { preference, setPreference } = usePlatformTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await api.get<any>("/profiles/me");
        if (data) {
          setDisplayName(data.displayName || data.display_name || user.displayName || "");
          setBio(data.bio || "");
        } else {
          setDisplayName(user.displayName || "");
        }
      } catch (e) {
        setDisplayName(user.displayName || "");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const saveProfile = async (name: string, bioVal: string) => {
    if (!user) return;
    try {
      await api.put("/profiles/me", { displayName: name, bio: bioVal });
    } catch (e) {
      console.error("Failed to save profile", e);
    }
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
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center py-20">
          <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1.5">
            <button
              onClick={() => navigate("/dashboard")}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Profile Settings</h1>
          </div>
          <p className="text-[14px] text-muted-foreground ml-11">Manage your account information</p>
        </div>

        <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-accent/40">
          <div className="h-14 w-14 platform-avatar text-lg">
            {userInitial}
          </div>
          <div>
            <h3 className="font-medium text-foreground text-[15px]">{displayName || "User"}</h3>
            <p className="text-[13px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-card p-5" style={{ border: '1px solid hsl(var(--border) / 0.4)' }}>
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
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="pl-10 h-10 rounded-lg bg-accent/30 border-transparent opacity-60"
                  />
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

          <div className="rounded-xl bg-card p-5" style={{ border: '1px solid hsl(var(--border) / 0.4)' }}>
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

          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={signOut} className="h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
