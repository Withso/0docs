import type { Request } from "express";
import { db, analyticsEventsTable, type InsertAnalyticsEvent } from "@workspace/db";

/**
 * Heuristic bot/AI-agent detection based on User-Agent. Not foolproof —
 * crawlers can spoof a browser UA — but catches the obvious cases
 * (search engines, social previewers, headless tools, popular LLM
 * fetchers). Used to bucket traffic into the Humans / Agents tabs on
 * the Analytics dashboard.
 */
const AGENT_UA_RE = new RegExp(
  [
    // Generic
    "bot", "spider", "crawler", "crawling", "preview", "fetcher",
    // Search engines
    "googlebot", "bingbot", "yandex", "baiduspider", "duckduckbot",
    "slurp", "facebot", "ia_archiver",
    // Social previewers
    "facebookexternalhit", "twitterbot", "linkedinbot", "slackbot",
    "discordbot", "telegrambot", "whatsapp",
    // AI agents / LLM scrapers
    "gptbot", "chatgpt-user", "oai-searchbot", "openai", "anthropic",
    "claude-web", "claudebot", "perplexitybot", "perplexity",
    "youbot", "ccbot", "google-extended", "applebot", "amazonbot",
    "bytespider", "diffbot", "cohere-ai", "ai2bot", "meta-externalagent",
    // Tooling
    "headlesschrome", "phantomjs", "puppeteer", "playwright",
    "curl/", "wget/", "python-requests", "httpie", "node-fetch", "axios/",
    // MCP / agentic clients
    "mcp", "modelcontextprotocol",
  ].join("|"),
  "i",
);

export function isAgentUserAgent(ua: string | undefined | null): boolean {
  if (!ua) return true; // missing UA → treat as bot/script, not a real human
  return AGENT_UA_RE.test(ua);
}

/** Pull the publicly-visible host the request hit (handles proxies). */
export function getRequestHost(req: Request): string | null {
  const xfh = req.headers["x-forwarded-host"];
  if (typeof xfh === "string" && xfh) return xfh.split(",")[0]!.trim();
  if (Array.isArray(xfh) && xfh.length) return xfh[0]!.split(",")[0]!.trim();
  const h = req.headers["host"];
  return typeof h === "string" ? h : null;
}

/**
 * Best-effort fire-and-forget event recorder used by server-side handlers
 * (feedback POST, ask-docs POST). Failures are logged but never thrown so
 * a broken analytics insert can't break the user's actual action.
 */
export async function recordEvent(
  req: Request,
  partial: Partial<InsertAnalyticsEvent> & { projectId: string; eventType: string },
): Promise<void> {
  try {
    const ua = req.headers["user-agent"] || null;
    const host = getRequestHost(req);
    const referrer = (req.headers["referer"] || req.headers["referrer"] || null) as string | null;
    await db.insert(analyticsEventsTable).values({
      projectId: partial.projectId,
      eventType: partial.eventType,
      visitorId: partial.visitorId ?? null,
      sessionId: partial.sessionId ?? null,
      isAgent: partial.isAgent ?? isAgentUserAgent(ua as string | null),
      pagePath: partial.pagePath ?? null,
      pageId: partial.pageId ?? null,
      referrer: partial.referrer ?? referrer,
      host: partial.host ?? host,
      userAgent: partial.userAgent ?? (ua as string | null),
      country: partial.country ?? null,
      query: partial.query ?? null,
      helpful: partial.helpful ?? null,
      durationMs: partial.durationMs ?? null,
      metadata: partial.metadata ?? null,
    });
  } catch (err) {
    req.log?.warn?.({ err }, "analytics: failed to record event");
  }
}
