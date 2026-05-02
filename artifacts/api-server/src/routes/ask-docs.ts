import { Router } from "express";

const router = Router();

// POST /ask-docs — AI chat about documentation
// Returns a streaming response using server-sent events / text stream
router.post("/ask-docs", async (req: any, res) => {
  try {
    const { messages, projectId } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      projectId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages required" });
    }

    // Use Replit AI Integrations (OpenAI-compatible) if available, otherwise return a stub
    const apiKey = process.env.REPLIT_AI_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.REPLIT_AI_OPENAI_BASE_URL || "https://api.openai.com/v1";

    if (!apiKey) {
      // No AI key configured — return a helpful message
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.write("AI chat is not configured for this documentation site.");
      return res.end();
    }

    const systemPrompt = `You are a helpful documentation assistant. Answer questions about the documentation clearly and concisely. Project ID: ${projectId || "unknown"}.`;

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
      const err = await aiRes.text();
      return res.status(502).json({ error: "AI service error", details: err });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const reader = aiRes.body?.getReader();
    if (!reader) return res.status(502).json({ error: "No stream from AI service" });

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE lines and forward delta content
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) res.write(content);
        } catch {
          // skip malformed lines
        }
      }
    }
    res.end();
  } catch (err: any) {
    req.log?.error({ err }, "ask-docs error");
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
});

export default router;
