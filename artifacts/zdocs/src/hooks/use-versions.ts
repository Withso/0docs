import { useState, useEffect, useMemo } from "react";
import { useApi } from "@/lib/api-client";

export interface DocVersion {
  id: string;
  project_id: string;
  version_label: string;
  is_default: boolean;
  created_at: string;
}

function normDocVersion(r: any): DocVersion {
  return {
    id: r.id,
    project_id: r.projectId ?? r.project_id,
    version_label: r.versionLabel ?? r.version_label,
    is_default: r.isDefault ?? r.is_default,
    created_at: r.createdAt ?? r.created_at,
  };
}

export function useVersions(projectId: string | undefined) {
  const api = useApi();
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<DocVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const load = async () => {
      try {
        const data = await api.get<any[]>(`/projects/${projectId}/doc-versions`);
        const rows = (data || []).map(normDocVersion);
        setVersions(rows);
        const defaultV = rows.find((v) => v.is_default) || rows[0] || null;
        setActiveVersion(defaultV);
      } catch (e) {
        console.error("Failed to load doc versions", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const defaultVersion = useMemo(() => versions.find((v) => v.is_default) || null, [versions]);

  const addVersion = async (label: string) => {
    if (!projectId) return null;
    const data = await api.post<any>(`/projects/${projectId}/doc-versions`, { versionLabel: label, isDefault: versions.length === 0 });
    if (!data) return null;
    const row = normDocVersion(data);
    setVersions((v) => [row, ...v]);
    if (versions.length === 0) setActiveVersion(row);
    return row;
  };

  const cloneVersion = async (sourceId: string, label: string) => {
    if (!projectId) return null;
    const data = await api.post<any>(`/doc-versions/${sourceId}/clone`, { versionLabel: label, isDefault: false });
    if (!data) return null;
    const row = normDocVersion(data);
    setVersions((v) => [row, ...v]);
    return row;
  };

  const setDefault = async (versionId: string) => {
    if (!projectId) return;
    await api.post(`/doc-versions/${versionId}/set-default`, {});
    setVersions((v) => v.map((ver) => ({ ...ver, is_default: ver.id === versionId })));
  };

  const deleteVersion = async (versionId: string) => {
    await api.del(`/doc-versions/${versionId}`);
    setVersions((prev) => {
      const remaining = prev.filter((ver) => ver.id !== versionId);
      if (activeVersion?.id === versionId) setActiveVersion(remaining[0] || null);
      return remaining;
    });
  };

  return {
    versions,
    activeVersion,
    setActiveVersion,
    defaultVersion,
    loading,
    addVersion,
    cloneVersion,
    setDefault,
    deleteVersion,
  };
}
