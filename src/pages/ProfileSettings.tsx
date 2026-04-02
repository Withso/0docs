import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Save, LogOut, Shield, Sun, Moon, Monitor } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { usePlatformTheme } from "@/hooks/use-platform-theme";

const ProfileSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { preference, setPreference } = usePlatformTheme();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data }, { data: roleData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
      ]);

      setIsAdmin(!!roleData);

      if (data) {
        setDisplayName(data.display_name || user.user_metadata?.display_name || "");
        setBio(data.bio || "");
      } else {
        setDisplayName(user.user_metadata?.display_name || "");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: displayName,
        bio,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.auth.updateUser({
        data: { display_name: displayName },
      });
      toast({ title: "Profile updated successfully" });
    }
    setSaving(false);
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
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Profile Settings</h1>
          </div>
          <p className="text-[14px] text-muted-foreground ml-11">Manage your account information</p>
        </div>

        {/* Avatar section */}
        <div className="platform-card mb-6 p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 platform-avatar text-xl">
              {userInitial}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-[15px]">{displayName || "User"}</h3>
                {isAdmin && (
                  <Badge variant="secondary" className="gap-1 text-[11px] bg-primary/10 text-primary border-primary/20">
                    <Shield className="h-3 w-3" /> Admin
                  </Badge>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div className="platform-card p-6">
          <h3 className="font-semibold text-foreground text-[15px] mb-5">Personal Information</h3>

          <div className="space-y-5">
            <div>
              <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="pl-10 h-11 rounded-lg"
                />
              </div>
            </div>

            <div>
              <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={user?.email || ""}
                  disabled
                  className="pl-10 h-11 rounded-lg opacity-60"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Email cannot be changed</p>
            </div>

            <div>
              <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[13px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={signOut} className="h-9 rounded-lg text-destructive hover:text-destructive">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-9 rounded-lg">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Theme Preference */}
        <div className="platform-card p-6 mt-6">
          <h3 className="font-semibold text-foreground text-[15px] mb-1.5">Appearance</h3>
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
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  preference === value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[13px] font-medium">{label}</span>
                <span className="text-[11px] text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
