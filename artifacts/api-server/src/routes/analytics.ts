import { Router, Request, Response } from "express";
import { db, analyticsEventsTable, projectsTable } from "@workspace/db";
import { and, eq, sql, gte, lte, desc, count, countDistinct } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { isAgentUserAgent, getRequestHost } from "../lib/analytics";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["page_view", "search", "feedback", "assistant_message"]);
const MAX_STR = 2000;

function clip(v: unknown, max = MAX_STR): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Public ingest endpoint. No auth — called from every published docs
 * page in the visitor's browser via fetch / sendBeacon. We trust the
 * client's `visitorId`/`sessionId`/`pagePath`, and combine that with
 * server-derived `userAgent`/`host`/`referrer` so spoofing is limited
 * to the visitor's own row.
 *
 * Always returns 204 (even on validation failure) so a misbehaving
 * tracker can never throw a console error in the docs reader's browser.
 */
router.post("/track", async (req: Request, res: Response) => {
  // Respond immediately so client navigation isn't blocked by the insert.
  res.status(204).end();
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const eventType = typeof body.eventType === "string" ? body.eventType : "";
    if (!UUID_RE.test(projectId) || !ALLOWED_TYPES.has(eventType)) return;

    // Cheap project-existence check so spammers can't fill the table with
    // junk projectIds. Cached per-process by the DB query plan.
    const [p] = await db.select({ id: projectsTable.id })
      .from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
    if (!p) return;

    const ua = (req.headers["user-agent"] as string | undefined) || null;
    const isAgent = typeof body.isAgent === "boolean" ? body.isAgent : isAgentUserAgent(ua);

    const pageId = typeof body.pageId === "string" && UUID_RE.test(body.pageId) ? body.pageId : null;

    await db.insert(analyticsEventsTable).values({
      projectId,
      eventType,
      visitorId: clip(body.visitorId, 64),
      sessionId: clip(body.sessionId, 64),
      isAgent,
      pagePath: clip(body.pagePath, 512),
      pageId,
      referrer: clip(body.referrer, 1024),
      host: clip(body.host, 256) || getRequestHost(req),
      userAgent: ua,
      country: clip(body.country, 8),
      query: clip(body.query, 512),
      helpful: typeof body.helpful === "boolean" ? body.helpful : null,
      metadata: body.metadata && typeof body.metadata === "object" ? (body.metadata as any) : null,
    });
  } catch (err) {
    req.log.warn({ err }, "analytics: /track insert failed");
  }
});

interface RangeOpts { from: Date; to: Date }

function parseRange(req: Request): RangeOpts {
  const now = new Date();
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const to   = typeof req.query.to   === "string" ? new Date(req.query.to)   : now;
  // Guard against bogus dates → fall back to the last 7 days.
  const safeFrom = isNaN(from.getTime()) ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : from;
  const safeTo   = isNaN(to.getTime())   ? now : to;
  return { from: safeFrom, to: safeTo };
}

/**
 * Owner-only aggregate dashboard endpoint. Returns headline counts,
 * a per-day visitor series, top pages, and top referrers — both for
 * the current window and the immediately-preceding window of equal
 * length so the UI can render delta percentages.
 *
 * `audience=humans` (default) excludes rows where `is_agent=true`.
 * `audience=agents` returns only those rows so the Agents tab can
 * surface bot / LLM / MCP traffic separately.
 */
router.get("/projects/:projectId/analytics", requireAuth, async (req: Request<{ projectId: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    const { projectId } = req.params;
    if (!UUID_RE.test(projectId)) { res.status(404).json({ error: "Not found" }); return; }

    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
      .limit(1);
    if (!project) { res.status(404).json({ error: "Not found" }); return; }

    const { from, to } = parseRange(req);
    const audience = req.query.audience === "agents" ? "agents" : "humans";
    const isAgentFilter = audience === "agents"
      ? eq(analyticsEventsTable.isAgent, true)
      : eq(analyticsEventsTable.isAgent, false);

    // Previous window of equal length, immediately preceding the current one.
    const winMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - winMs);
    const prevTo = from;

    const baseFilter = (lo: Date, hi: Date) => and(
      eq(analyticsEventsTable.projectId, projectId),
      isAgentFilter,
      gte(analyticsEventsTable.createdAt, lo),
      lte(analyticsEventsTable.createdAt, hi),
    );

    const totalsForWindow = async (lo: Date, hi: Date) => {
      const rows = await db.select({
        eventType: analyticsEventsTable.eventType,
        count: count().as("count"),
        uniqueVisitors: countDistinct(analyticsEventsTable.visitorId).as("uniqueVisitors"),
        helpfulYes: sql<number>`SUM(CASE WHEN ${analyticsEventsTable.helpful} = true THEN 1 ELSE 0 END)`.as("helpfulYes"),
        helpfulNo: sql<number>`SUM(CASE WHEN ${analyticsEventsTable.helpful} = false THEN 1 ELSE 0 END)`.as("helpfulNo"),
      })
        .from(analyticsEventsTable)
        .where(baseFilter(lo, hi))
        .groupBy(analyticsEventsTable.eventType);

      let visitors = 0, views = 0, searches = 0, assistant = 0, feedback = 0, helpfulYes = 0, helpfulNo = 0;
      for (const r of rows) {
        const c = Number(r.count) || 0;
        if (r.eventType === "page_view") {
          views += c;
          visitors = Math.max(visitors, Number(r.uniqueVisitors) || 0);
        } else if (r.eventType === "search") {
          searches += c;
        } else if (r.eventType === "assistant_message") {
          assistant += c;
        } else if (r.eventType === "feedback") {
          feedback += c;
          helpfulYes += Number(r.helpfulYes) || 0;
          helpfulNo  += Number(r.helpfulNo)  || 0;
        }
      }
      return { visitors, views, searches, assistant, feedback, helpfulYes, helpfulNo };
    };

    const [current, previous] = await Promise.all([
      totalsForWindow(from, to),
      totalsForWindow(prevFrom, prevTo),
    ]);

    // Daily visitor series for the current window. Buckets to YYYY-MM-DD UTC.
    const dailyRows = await db.select({
      day: sql<string>`to_char(date_trunc('day', ${analyticsEventsTable.createdAt}), 'YYYY-MM-DD')`.as("day"),
      visitors: countDistinct(analyticsEventsTable.visitorId).as("visitors"),
      views: count().as("views"),
    })
      .from(analyticsEventsTable)
      .where(and(
        baseFilter(from, to),
        eq(analyticsEventsTable.eventType, "page_view"),
      ))
      .groupBy(sql`day`)
      .orderBy(sql`day`);

    // Top pages and referrers (page_view only).
    const topPages = await db.select({
      path: analyticsEventsTable.pagePath,
      views: count().as("views"),
    })
      .from(analyticsEventsTable)
      .where(and(
        baseFilter(from, to),
        eq(analyticsEventsTable.eventType, "page_view"),
      ))
      .groupBy(analyticsEventsTable.pagePath)
      .orderBy(desc(count()))
      .limit(10);

    const topReferrers = await db.select({
      referrer: analyticsEventsTable.referrer,
      views: count().as("views"),
    })
      .from(analyticsEventsTable)
      .where(and(
        baseFilter(from, to),
        eq(analyticsEventsTable.eventType, "page_view"),
      ))
      .groupBy(analyticsEventsTable.referrer)
      .orderBy(desc(count()))
      .limit(10);

    // Distinct hosts the events were captured on. Lets the UI show
    // "tracking traffic from <custom_domain> + your default URL".
    const hostsRows = await db.selectDistinct({ host: analyticsEventsTable.host })
      .from(analyticsEventsTable)
      .where(and(
        eq(analyticsEventsTable.projectId, projectId),
        gte(analyticsEventsTable.createdAt, from),
        lte(analyticsEventsTable.createdAt, to),
      ));

    res.json({
      audience,
      range: { from: from.toISOString(), to: to.toISOString() },
      previousRange: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
      project: {
        id: project.id,
        slug: project.slug,
        customDomain: project.customDomain,
        customDomainStatus: project.customDomainStatus,
        customDomainBasePath: project.customDomainBasePath,
      },
      totals: current,
      previousTotals: previous,
      daily: dailyRows.map((r) => ({
        day: r.day,
        visitors: Number(r.visitors) || 0,
        views: Number(r.views) || 0,
      })),
      topPages: topPages
        .filter((r) => r.path)
        .map((r) => ({ path: r.path as string, views: Number(r.views) || 0 })),
      topReferrers: topReferrers
        .map((r) => ({ referrer: r.referrer || "(direct)", views: Number(r.views) || 0 })),
      hosts: hostsRows.map((h) => h.host).filter((h): h is string => !!h),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute analytics");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
