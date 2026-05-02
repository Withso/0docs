import { Router, Request, Response } from "express";

const router = Router();

// POST /ask-docs — AI chat about documentation
// Streams back proper SSE format matching what AskDocsChat.tsx expects
router.post("/ask-docs", async (req: Request, res: Response) => {
  try {
    const { messages, projectId } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      projectId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages required" });
      return;
    }

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

    const systemPrompt = `You are a helpful documentation assistant for project "${projectId || "this site"}". Answer questions about the documentation clearly and concisely.`;

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
          ...messages,
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
