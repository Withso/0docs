import { lazy, Suspense, forwardRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Builder from "./pages/Builder";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
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

  if (!projectId) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to={`/builder/${projectId}/configurations`} replace />;
};

const App = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="contents">
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
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
                    <Builder />
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
