import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setActiveBranchIdGetter } from "@/lib/api-client";
import { useBranches, type Branch } from "@/hooks/useBranches";

interface BranchContextValue {
  projectId: string;
  branches: Branch[];
  activeBranch: Branch | null;
  activeBranchId: string | null;
  setActiveBranchId: (id: string) => void;
  loading: boolean;
  reload: () => Promise<void>;
  createBranch: (name: string, sourceBranchId?: string) => Promise<Branch | null>;
  renameBranch: (id: string, name: string) => Promise<Branch>;
  deleteBranch: (id: string) => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | null>(null);

const storageKey = (projectId: string) => `zdocs:activeBranch:${projectId}`;

export function BranchProvider({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const { branches, loading, reload, createBranch, renameBranch, deleteBranch } = useBranches(projectId);

  // Per-project active branch persisted to localStorage so a refresh keeps you
  // on the branch you were editing.
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(storageKey(projectId)); } catch { return null; }
  });

  // Once branches load, ensure activeBranchId points at a real branch
  // (default to the project's main branch).
  useEffect(() => {
    if (branches.length === 0) return;
    const stillValid = activeBranchId && branches.some(b => b.id === activeBranchId);
    if (!stillValid) {
      const main = branches.find(b => b.isDefault) ?? branches[0];
      setActiveBranchIdState(main.id);
    }
  }, [branches, activeBranchId]);

  // Register the getter so api-client adds X-Branch-Id to every request.
  useEffect(() => {
    setActiveBranchIdGetter(() => activeBranchId);
    return () => setActiveBranchIdGetter(() => null);
  }, [activeBranchId]);

  const setActiveBranchId = (id: string) => {
    setActiveBranchIdState(id);
    try { localStorage.setItem(storageKey(projectId), id); } catch { /* quota / private mode */ }
  };

  const activeBranch = useMemo(
    () => branches.find(b => b.id === activeBranchId) ?? null,
    [branches, activeBranchId],
  );

  const value: BranchContextValue = {
    projectId,
    branches,
    activeBranch,
    activeBranchId,
    setActiveBranchId,
    loading,
    reload,
    createBranch,
    renameBranch,
    deleteBranch,
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranchContext(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranchContext must be used inside a <BranchProvider>");
  return ctx;
}

// Optional accessor — returns null when used outside a provider so components
// rendered both inside and outside the editor (e.g. landing page) don't crash.
export function useOptionalBranch(): BranchContextValue | null {
  return useContext(BranchContext);
}
