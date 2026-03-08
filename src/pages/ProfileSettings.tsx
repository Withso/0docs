import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Save, FileText } from "lucide-react";

const ProfileSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

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
      // Also update auth metadata
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="platform-header">
        <div className="h-full max-w-3xl mx-auto px-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Settings</span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-sm text-muted-foreground">Profile</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Profile Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account information</p>
        </div>

        {/* Avatar section */}
        <div className="platform-card mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 platform-avatar text-xl">
              {userInitial}
            </div>
            <div>
              <h3 className="font-medium text-foreground">{displayName || "User"}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div className="platform-card">
          <h3 className="font-medium text-foreground mb-4">Personal Information</h3>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="pl-10 h-10"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={user?.email || ""}
                  disabled
                  className="pl-10 h-10 opacity-60"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={signOut} className="text-destructive hover:text-destructive">
              Sign Out
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileSettings;
