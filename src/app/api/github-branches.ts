import { getFunctionsUrl } from "@/app/runtime-config";

const fallbackFunctionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function fetchGitHubBranches(projectId: string, accessToken?: string) {
  const baseUrl = getFunctionsUrl() || fallbackFunctionsUrl;
  const response = await fetch(`${baseUrl}/github-branches?projectId=${projectId}`, {
    headers: {
      Authorization: `Bearer ${accessToken || ""}`,
      apikey: publishableKey,
    },
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Failed");
  return payload as { branches?: string[]; default?: string };
}
