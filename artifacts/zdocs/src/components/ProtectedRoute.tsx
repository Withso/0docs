import { useAuth } from "@/contexts/AuthContext";
import { ReactNode, useEffect, useRef } from "react";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading, signIn } = useAuth();
  // Guard against React-StrictMode double-invocation triggering two
  // simultaneous OIDC redirects.
  const triggered = useRef(false);

  useEffect(() => {
    if (!loading && !user && !triggered.current) {
      triggered.current = true;
      signIn();
    }
  }, [loading, user, signIn]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
