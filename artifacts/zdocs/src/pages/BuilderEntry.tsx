import { useEffect, useState } from "react";
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
 * `/builder` is the app's main entry point.
 *
 * - Auth still loading → spinner.
 * - Signed-out → send to /auth (no marketing page in self-host mode).
 * - Signed-in → fetch projects, prefer the last-opened id (when it
 *   still exists in the list and isn't the homepage project), else the
 *   most-recently-updated non-homepage project. Zero projects falls
 *   back to the homepage demo project if one exists, otherwise renders
 *   an inline "create your first project" CTA.
 */
const BuilderEntry = () => {
  const { user, loading } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [needsFirstProject, setNeedsFirstProject] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("My documentation");
  const [slug, setSlug] = useState("docs");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user?.id) {
      navigate("/auth", { replace: true });
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
          // Fall back to the homepage demo project if one exists, so the
          // user sees something editable. Otherwise show inline empty
          // state so they can create their first project.
          const homepage = (projects || []).find((p) => p.isHomepage);
          if (homepage) {
            navigate(`/builder/${homepage.id}`, { replace: true });
            return;
          }
          setNeedsFirstProject(true);
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
        // API down or auth lost — bounce to /auth rather than loop.
        navigate("/auth", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user?.id]);

  async function createFirstProject(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setCreating(true);
    try {
      const created = await api.post<{ id: string }>("/projects", {
        name: name.trim(),
        slug: slug.trim(),
      });
      navigate(`/builder/${created.id}`, { replace: true });
    } catch (e) {
      setErr((e as Error).message || "Could not create project.");
    } finally {
      setCreating(false);
    }
  }

  if (needsFirstProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md border border-border rounded-lg p-6 bg-card">
          <h1 className="text-xl font-semibold mb-1">Create your first project</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Every doc lives inside a project. Pick a name and a URL slug
            — you can change both later.
          </p>
          <form onSubmit={createFirstProject} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                URL slug (lowercase, letters/numbers/hyphens)
              </label>
              <input
                type="text"
                required
                pattern="[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {err && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                {err}
              </div>
            )}
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create project"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
};

export default BuilderEntry;
