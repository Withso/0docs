import { supabase } from "@/integrations/supabase/client";

export interface ActivityEntry {
  id: string;
  version_number: string;
  notes: string | null;
  published_at: string;
  is_active: boolean;
  published_by: string | null;
  pages_count: number;
  sections_count: number;
  blocks_count: number;
  publisher_name?: string | null;
}

/**
 * Fetch activity feed for a project (latest published versions).
 * Mirrors Mintlify's "Activity" table.
 */
export const listProjectActivity = async (
  projectId: string,
  limit = 10,
): Promise<ActivityEntry[]> => {
  const { data, error } = await supabase
    .from("published_versions")
    .select("id,version_number,notes,published_at,is_active,published_by,pages_snapshot,sections_snapshot,blocks_snapshot")
    .eq("project_id", projectId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data || []) as any[];
  const publisherIds = Array.from(new Set(rows.map((r) => r.published_by).filter(Boolean)));

  let nameMap: Record<string, string> = {};
  if (publisherIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", publisherIds);
    (profiles || []).forEach((p: any) => {
      nameMap[p.id] = p.display_name || "";
    });
  }

  return rows.map((r) => ({
    id: r.id,
    version_number: r.version_number,
    notes: r.notes,
    published_at: r.published_at,
    is_active: r.is_active,
    published_by: r.published_by,
    publisher_name: r.published_by ? nameMap[r.published_by] || null : null,
    pages_count: Array.isArray(r.pages_snapshot) ? r.pages_snapshot.length : 0,
    sections_count: Array.isArray(r.sections_snapshot) ? r.sections_snapshot.length : 0,
    blocks_count: Array.isArray(r.blocks_snapshot) ? r.blocks_snapshot.length : 0,
  }));
};
