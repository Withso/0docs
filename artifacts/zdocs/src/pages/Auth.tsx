import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Auth = () => {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/builder", { replace: true });
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(60rem 40rem at 80% -10%, hsl(var(--primary) / 0.06), transparent 60%), radial-gradient(48rem 32rem at -10% 110%, hsl(var(--platform-accent-blue, var(--primary)) / 0.05), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.06) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 75%)",
        }}
      />

      <header className="px-6 py-5 sm:px-10">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-foreground text-background text-[12px] font-semibold tracking-tight">
            0
          </span>
          <span className="font-semibold text-[15px] tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
            0docs
          </span>
        </Link>
      </header>

      <main className="px-6 pt-6 pb-16 sm:pt-12">
        <div className="mx-auto w-full max-w-[420px] animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-foreground leading-[1.15]">
              Welcome to 0docs
            </h1>
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              Sign in to start shipping beautiful documentation in minutes.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <Button
              onClick={signIn}
              className="w-full h-11 text-[14px] font-medium"
            >
              Log in to continue
            </Button>
            <p className="mt-4 text-center text-[12px] text-muted-foreground">
              You'll be redirected to authenticate, then brought right back.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
