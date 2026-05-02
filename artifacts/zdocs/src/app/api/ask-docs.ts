import { apiFetch } from "@/lib/api-client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function sendAskDocsRequest(projectId: string, messages: Message[]) {
  return fetch("/api/ask-docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, projectId }),
  });
}
