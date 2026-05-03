import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/api-client";
import { getLastProjectId, clearLastProjectId } from "@/lib/last-project";

interface Project {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
  isHomepage?: boolean;
}

/**
 * `/builder` is a pure redirect entry-point — we never render an empty state
 * or force OIDC sign-in here.
 *
 * - Auth still loading → spinner.
 * - Signed-out → home (`/`). The Landing page is responsible for the sign-in
 *   CTA; visiting `/builder` directly should not pop the auth flow.
 * - Signed-in → fetch projects, prefer the last-opened id (when it still
 *   exists in the list and isn't the homepage project), else the most-
 *   recently-updated non-homepage project. Zero projects (or any failure)
 *   falls back to home (`/`).
 */
const BuilderEntry = () => {
  const { user, loading } = useAuth();
  const api = useApi();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user?.id) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const projects = await api.get<Project[]>("/projects");
        if (cancelled) return;
        const visible = (projects || []).filter((p) => !p.isHomepage);
        if (visible.length === 0) {
          clearLastProjectId();
          navigate("/", { replace: true });
          return;
        }

        const lastId = getLastProjectId();
        const lastStillExists =
          lastId && visible.some((p) => p.id === lastId);
        if (lastStillExists) {
          navigate(`/builder/${lastId}`, { replace: true });
          return;
        }

        const sorted = [...visible].sort((a, b) => {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tb - ta;
        });
        navigate(`/builder/${sorted[0].id}`, { replace: true });
      } catch {
        if (cancelled) return;
        navigate("/", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user?.id]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
};

export default BuilderEntry;
