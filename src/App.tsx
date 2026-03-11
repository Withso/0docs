import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Builder = lazy(() => import("./pages/Builder"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const PublicDocs = lazy(() => import("./pages/PublicDocs"));
const NotFound = lazy(() => import("./pages/NotFound"));

const LazyFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
                path="/builder/:projectId/design"
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
                path="/builder/:projectId/settings"
                element={
                  <ProtectedRoute>
                    <Builder />
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
                path="/settings/profile"
                element={
                  <ProtectedRoute>
                    <ProfileSettings />
                  </ProtectedRoute>
                }
              />
              <Route path="/docs/:slug" element={<PublicDocs />} />
              <Route path="/docs/:slug/:pageSlug" element={<PublicDocs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
