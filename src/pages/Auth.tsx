import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

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
          await supabase.functions.invoke("seed-demo-project");
        } catch (e) {
          console.error("Demo seed failed:", e);
        }
      }
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="flex items-center gap-2.5 mb-10">
          <span className="font-semibold text-lg tracking-tight text-foreground">0colors</span>
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
                <Label htmlFor="displayName" className="text-[13px] text-muted-foreground">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1.5 h-10 rounded-lg bg-accent/40 border-transparent focus-visible:border-border focus-visible:ring-1 focus-visible:ring-ring/30"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-[13px] text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1.5 h-10 rounded-lg bg-accent/40 border-transparent focus-visible:border-border focus-visible:ring-1 focus-visible:ring-ring/30"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[13px] text-muted-foreground">
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
                  className="h-10 pr-10 rounded-lg bg-accent/40 border-transparent focus-visible:border-border focus-visible:ring-1 focus-visible:ring-ring/30"
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
  );
};

export default Auth;
