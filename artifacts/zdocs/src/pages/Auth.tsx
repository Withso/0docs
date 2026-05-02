import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SignIn, SignUp } from "@clerk/react";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Hide Clerk's built-in header & footer — our wrapper provides them, and
  // showing both creates duplicated "Welcome back" / "Don't have an account?".
  const clerkAppearance = {
    elements: {
      rootBox: "w-full",
      card: "shadow-none border border-border/60 rounded-2xl bg-card p-6",
      header: "hidden",
      footer: "hidden",
      socialButtonsBlockButton:
        "border-border/60 hover:bg-accent rounded-lg h-10 text-[13px] font-medium",
      formFieldInput:
        "border-border/60 rounded-lg h-10 text-[13px] focus:ring-2 focus:ring-ring/30",
      formFieldLabel: "text-[12.5px] font-medium text-foreground",
      formButtonPrimary:
        "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-10 text-[13px] font-medium shadow-sm",
      dividerLine: "bg-border/60",
      dividerText: "text-muted-foreground text-[12px]",
    },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient backdrop — matches landing aesthetic */}
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

      {/* Top bar */}
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

      {/* Centered card */}
      <main className="px-6 pt-6 pb-16 sm:pt-12">
        <div className="mx-auto w-full max-w-[420px] animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-foreground leading-[1.15]">
              {isSignUp ? "Create your workspace" : "Welcome back"}
            </h1>
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              {isSignUp
                ? "Start shipping beautiful documentation in minutes."
                : "Sign in to continue building your docs."}
            </p>
          </div>

          <div className="flex justify-center">
            {isSignUp ? (
              <SignUp fallbackRedirectUrl="/dashboard" appearance={clerkAppearance} />
            ) : (
              <SignIn fallbackRedirectUrl="/dashboard" appearance={clerkAppearance} />
            )}
          </div>

          <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
            {isSignUp ? "Already have an account?" : "New to 0docs?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-foreground font-medium hover:underline underline-offset-4"
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
