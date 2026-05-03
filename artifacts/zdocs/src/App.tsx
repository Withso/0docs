import { lazy, Suspense, forwardRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Builder from "./pages/Builder";
import AuthPage from "./pages/Auth";

const BuilderEntry = lazy(() => import("./pages/BuilderEntry"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const LazyFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const LegacyDesignRouteRedirect = () => {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return <Navigate to="/builder" replace />;
  return <Navigate to={`/builder/${projectId}/configurations`} replace />;
};

// /publish was removed in favour of an in-header dropdown (PublishPopover);
// keep the URL alive so old bookmarks land in the editor where the dropdown
// is reachable rather than 404'ing.
const LegacyPublishRouteRedirect = () => {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return <Navigate to="/builder" replace />;
  return <Navigate to={`/builder/${projectId}/editor`} replace />;
};

const App = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="contents">
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<LazyFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/docs" element={<Index />} />
                {/* Default published-doc URL — every project gets a free
                    shareable URL at <host>/p/<slug>. Index reads :slug from
                    useParams and looks the project up via /api/projects?slug=. */}
                <Route path="/p/:slug" element={<Index />} />
                {/* /auth is a thin redirect into /builder; ProtectedRoute
                    auto-triggers the OIDC sign-in flow when no user. Kept
                    as a route so existing links from Landing/Index that
                    point at "/auth" still work. */}
                {/* /auth renders the self-host email/password forms. In
                    Replit (OIDC) mode it auto-redirects to /api/login. */}
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/dashboard"
                  element={<Navigate to="/builder" replace />}
                />
                {/* /builder is a pure redirect entry-point. It must NOT be
                    wrapped in ProtectedRoute — signed-out visitors should
                    land on the Landing page, not the OIDC sign-in flow.
                    BuilderEntry handles the signed-out case itself. */}
                <Route path="/builder" element={<BuilderEntry />} />
                <Route
                  path="/builder/:projectId"
                  element={
                    <ProtectedRoute>
                      <Builder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/editor"
                  element={
                    <ProtectedRoute>
                      <Builder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/settings"
                  element={
                    <ProtectedRoute>
                      <Builder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/settings/:section"
                  element={
                    <ProtectedRoute>
                      <Builder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/mcp"
                  element={
                    <ProtectedRoute>
                      <Builder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/analytics"
                  element={
                    <ProtectedRoute>
                      <Builder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/configurations"
                  element={
                    <ProtectedRoute>
                      <Builder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/design"
                  element={
                    <ProtectedRoute>
                      <LegacyDesignRouteRedirect />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/publish"
                  element={
                    <ProtectedRoute>
                      <LegacyPublishRouteRedirect />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/code"
                  element={
                    <ProtectedRoute>
                      <Builder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder/:projectId/preview"
                  element={
                    <ProtectedRoute>
                      <Builder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/profile"
                  element={
                    <ProtectedRoute>
                      <ProfileSettings />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </div>
));

App.displayName = "App";

export default App;
