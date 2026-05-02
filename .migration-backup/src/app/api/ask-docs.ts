import { getFunctionsUrl } from "@/app/runtime-config";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const fallbackFunctionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function sendAskDocsRequest(projectId: string, messages: Message[]) {
  const baseUrl = getFunctionsUrl() || fallbackFunctionsUrl;
  return fetch(`${baseUrl}/ask-docs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publishableKey}`,
    },
    body: JSON.stringify({ messages, projectId }),
  });
}
