import { apiFetch } from "@/lib/api-client";

export interface ActivityEntry {
  id: string;
  versionNumber: string;
  notes: string | null;
  publishedAt: string;
  isActive: boolean;
  publishedBy: string | null;
  pagesCount: number;
  sectionsCount: number;
  blocksCount: number;
  publisherName?: string | null;
}

export const listProjectActivity = async (
  projectId: string,
  limit = 10,
): Promise<ActivityEntry[]> => {
  return apiFetch<ActivityEntry[]>(
    `/versions?projectId=${projectId}&limit=${limit}`,
    { method: "GET" },
  );
};
