import { supabase } from "@/integrations/supabase/client";

export interface WorkspaceProject {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  updated_at?: string;
  created_at?: string;
  is_homepage?: boolean;
  custom_domain?: string | null;
  github_repo?: string | null;
  github_branch?: string | null;
  published_version_id?: string | null;
}

export const listWorkspaceProjects = async (userId: string): Promise<WorkspaceProject[]> => {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,slug,description,updated_at,created_at,is_homepage,custom_domain,github_repo,github_branch,published_version_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []) as WorkspaceProject[];
};
