import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = isSignUp
      ? await signUp(email, password, displayName)
      : await signIn(email, password);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      if (isSignUp) {
        try {
          await supabase.functions.invoke("seed-demo-project", {
            body: { user_id: (await supabase.auth.getUser()).data.user?.id },
          });
        } catch (e) {
          console.error("Demo seed failed:", e);
        }
      }
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] relative overflow-hidden flex-col justify-between p-10"
        style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12)_0%,transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">DocBuilder</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-[2rem] font-bold tracking-tight leading-[1.15] text-white">
            Build beautiful<br />documentation,<br />visually.
          </h2>
          <p className="text-white/70 text-[15px] leading-relaxed max-w-sm">
            Create clean, structured docs with a WYSIWYG editor. 
            What you see is what your readers get.
          </p>
          <div className="flex items-center gap-4 pt-2">
            {["AI Search", "19 Block Types", "API Docs", "Analytics"].map((feature) => (
              <div key={feature} className="flex items-center gap-1.5 text-xs text-white/50">
                <Sparkles className="h-3 w-3" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} DocBuilder
        </p>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px] animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-platform-sm">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-foreground">DocBuilder</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-[14px] text-muted-foreground mt-2">
              {isSignUp
                ? "Start building beautiful documentation today"
                : "Sign in to continue to your projects"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <Label htmlFor="displayName" className="text-[13px] font-medium text-foreground">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1.5 h-11 rounded-lg"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1.5 h-11 rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
                Password
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-11 pr-10 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 rounded-lg text-[14px]" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-medium hover:underline underline-offset-4"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
