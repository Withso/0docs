import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The root route on a self-hosted 0docs instance is the app itself, not
 * a marketing page. Send signed-in users into the builder; everyone
 * else lands on /auth, which picks signin vs signup based on whether
 * the instance has any users yet (see Auth.tsx).
 */
export default function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <Navigate to={user ? "/builder" : "/auth"} replace />;
}
