import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SignIn, SignUp } from "@clerk/react";
import { useState } from "react";

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="flex items-center gap-2.5 mb-10">
          <span className="font-semibold text-lg tracking-tight text-foreground">0docs</span>
        </div>
        <div className="flex justify-center">
          {isSignUp ? (
            <SignUp
              fallbackRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border border-border/40 rounded-xl bg-card p-6",
                  headerTitle: "text-xl font-bold text-foreground",
                  headerSubtitle: "text-muted-foreground text-sm",
                  formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                  footerActionLink: "text-primary font-medium",
                },
              }}
            />
          ) : (
            <SignIn
              fallbackRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border border-border/40 rounded-xl bg-card p-6",
                  headerTitle: "text-xl font-bold text-foreground",
                  headerSubtitle: "text-muted-foreground text-sm",
                  formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                  footerActionLink: "text-primary font-medium",
                },
              }}
            />
          )}
        </div>
        <div className="mt-6 text-center">
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
