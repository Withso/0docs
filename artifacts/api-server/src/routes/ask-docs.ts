import { Router, Request, Response } from "express";

const router = Router();

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 32_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /ask-docs — AI chat about documentation
// Streams back proper SSE format matching what AskDocsChat.tsx expects
router.post("/ask-docs", async (req: Request, res: Response) => {
  try {
    const { messages, projectId } = req.body as {
      messages?: unknown;
      projectId?: unknown;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages required" });
      return;
    }
    if (messages.length > MAX_MESSAGES) {
      res.status(400).json({ error: `too many messages (max ${MAX_MESSAGES})` });
      return;
    }
    let total = 0;
    for (const m of messages) {
      if (
        !m || typeof m !== "object" ||
        ((m as { role?: unknown }).role !== "user" && (m as { role?: unknown }).role !== "assistant") ||
        typeof (m as { content?: unknown }).content !== "string"
      ) {
        res.status(400).json({ error: "each message must be { role: 'user'|'assistant', content: string }" });
        return;
      }
      const content = (m as { content: string }).content;
      if (content.length > MAX_MESSAGE_CHARS) {
        res.status(400).json({ error: `message exceeds ${MAX_MESSAGE_CHARS} chars` });
        return;
      }
      total += content.length;
    }
    if (total > MAX_TOTAL_CHARS) {
      res.status(400).json({ error: `total content exceeds ${MAX_TOTAL_CHARS} chars` });
      return;
    }
    let safeProjectId: string | undefined;
    if (projectId != null) {
      if (typeof projectId !== "string" || !UUID_RE.test(projectId)) {
        res.status(400).json({ error: "projectId must be a UUID" });
        return;
      }
      safeProjectId = projectId;
    }
    const safeMessages = messages as Array<{ role: "user" | "assistant"; content: string }>;

    const apiKey = process.env.REPLIT_AI_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = (process.env.REPLIT_AI_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

    if (!apiKey) {
      // No AI key — send a well-formed SSE response so the client can display it
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      const stubChunk = JSON.stringify({ choices: [{ delta: { content: "AI chat is not configured for this site." } }] });
      res.write(`data: ${stubChunk}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const systemPrompt = `You are a helpful documentation assistant for project "${safeProjectId || "this site"}". Answer questions about the documentation clearly and concisely.`;

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...safeMessages,
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      res.status(502).json({ error: "AI service error", details: errText });
      return;
    }

    // Forward SSE stream directly — the AI returns OpenAI SSE format which the client already parses
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = aiRes.body?.getReader();
    if (!reader) {
      res.status(502).json({ error: "No stream from AI service" });
      return;
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Forward raw SSE bytes — already in `data: {...}\n\n` format
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (!res.headersSent) res.status(500).json({ error: message });
    else res.end();
  }
});

export default router;
