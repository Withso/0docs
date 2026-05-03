import { pgTable, text, boolean, timestamp, uuid, integer, jsonb, index } from "drizzle-orm/pg-core";

/**
 * Single fact table for every public-docs interaction we want to count
 * later — page views, search queries, "was this helpful" votes, and
 * Assistant chat messages. One table keeps the ingest path trivial
 * (one INSERT) and the dashboard queries simple (filter on event_type).
 *
 * Visitor identity:
 *   - `visitor_id` is a long-lived random UUID stored in localStorage on
 *     the docs reader's browser. Stable across sessions for the same
 *     browser; used for Unique-Visitors counts.
 *   - `session_id` rotates after ~30 min of inactivity (sessionStorage).
 *
 * Bot/agent traffic (`is_agent = true`) is bucketed separately so the
 * humans-only chart isn't polluted by crawlers and AI scrapers, while
 * still letting docs owners see how often bots / LLMs hit their docs.
 *
 * `host` records the actual hostname the request came in on so the
 * dashboard can show "tracking from <custom_domain>" with a fallback to
 * the default served URL when no custom domain is connected.
 */
export const analyticsEventsTable = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  // page_view | search | feedback | assistant_message
  eventType: text("event_type").notNull(),
  visitorId: text("visitor_id"),
  sessionId: text("session_id"),
  isAgent: boolean("is_agent").notNull().default(false),
  pagePath: text("page_path"),
  pageId: uuid("page_id"),
  referrer: text("referrer"),
  host: text("host"),
  userAgent: text("user_agent"),
  country: text("country"),
  // For event_type='search': the raw query. For 'feedback': the comment.
  // For 'assistant_message': first ~200 chars of the user prompt.
  query: text("query"),
  // For event_type='feedback': true=helpful, false=not helpful.
  helpful: boolean("helpful"),
  // Reserved for future time-on-page tracking; nullable now.
  durationMs: integer("duration_ms"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byProjectTime: index("analytics_events_project_time_idx").on(t.projectId, t.createdAt),
  byProjectTypeTime: index("analytics_events_project_type_time_idx").on(t.projectId, t.eventType, t.createdAt),
}));

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEventsTable.$inferInsert;
