import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DocVersion {
  id: string;
  project_id: string;
  version_label: string;
  is_default: boolean;
  created_at: string;
}

export function useVersions(projectId: string | undefined) {
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<DocVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("doc_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      const rows = (data || []) as DocVersion[];
      setVersions(rows);
      const defaultV = rows.find((v) => v.is_default) || rows[0] || null;
      setActiveVersion(defaultV);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const addVersion = async (label: string) => {
    if (!projectId) return;
    const { data } = await supabase
      .from("doc_versions" as any)
      .insert({ project_id: projectId, version_label: label, is_default: versions.length === 0 })
      .select()
      .single();
    if (data) {
      const row = data as unknown as DocVersion;
      setVersions((v) => [row, ...v]);
      if (versions.length === 0) setActiveVersion(row);
    }
  };

  const setDefault = async (versionId: string) => {
    if (!projectId) return;
    // Unset all defaults
    await supabase.from("doc_versions" as any).update({ is_default: false }).eq("project_id", projectId);
    // Set new default
    await supabase.from("doc_versions" as any).update({ is_default: true }).eq("id", versionId);
    setVersions((v) => v.map((ver) => ({ ...ver, is_default: ver.id === versionId })));
  };

  const deleteVersion = async (versionId: string) => {
    await supabase.from("doc_versions").delete().eq("id", versionId);
    setVersions((prev) => {
      const remaining = prev.filter((ver) => ver.id !== versionId);
      if (activeVersion?.id === versionId) {
        setActiveVersion(remaining[0] || null);
      }
      return remaining;
    });
  };

  return { versions, activeVersion, setActiveVersion, loading, addVersion, setDefault, deleteVersion };
}
