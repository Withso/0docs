import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiRequest } from "@/lib/api-client";

export interface Branch {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  parentBranchId: string | null;
  baseCommitId: string | null;
  headCommitId: string | null;
  createdBy: string | null;
  createdAt: string;
  deletedAt: string | null;
}

// Fetch + manage the list of branches for a project. Kept in-component so the
// switcher always reflects the latest server state after a create/rename/delete.
export function useBranches(projectId: string | undefined) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) { setBranches([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      // Don't auto-inject X-Branch-Id when listing branches — we want the full
      // project list regardless of which branch is currently active.
      const res = await apiRequest(`/projects/${projectId}/branches`, { method: "GET" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const rows = (await res.json()) as Branch[];
      setBranches(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branches");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const createBranch = useCallback(async (name: string, sourceBranchId?: string) => {
    if (!projectId) return null;
    const created = await apiFetch<Branch>(`/projects/${projectId}/branches`, {
      method: "POST",
      body: JSON.stringify({ name, sourceBranchId }),
    });
    // Optimistically append — saves a full round-trip GET that just to read
    // back what we already have in the response. The list reorders by
    // createdAt server-side, but new branches always sort last.
    setBranches(prev => [...prev, created]);
    return created;
  }, [projectId]);

  const renameBranch = useCallback(async (branchId: string, name: string) => {
    const updated = await apiFetch<Branch>(`/branches/${branchId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    setBranches(prev => prev.map(b => b.id === branchId ? updated : b));
    return updated;
  }, []);

  const deleteBranch = useCallback(async (branchId: string) => {
    const res = await apiRequest(`/branches/${branchId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error(`API ${res.status}`);
    setBranches(prev => prev.filter(b => b.id !== branchId));
  }, []);

  return { branches, loading, error, reload, createBranch, renameBranch, deleteBranch };
}
