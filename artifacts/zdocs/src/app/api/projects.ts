import { apiFetch } from "@/lib/api-client";

export interface WorkspaceProject {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  updatedAt?: string;
  createdAt?: string;
  isHomepage?: boolean;
  customDomain?: string | null;
  publishedVersionId?: string | null;
}

export const listWorkspaceProjects = async (): Promise<WorkspaceProject[]> => {
  return apiFetch<WorkspaceProject[]>("/projects", { method: "GET" });
};
