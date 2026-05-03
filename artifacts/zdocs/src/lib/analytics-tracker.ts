/**
 * Lightweight client-side tracker for the public docs reader.
 *
 * Every published docs page calls `track()` to record page views and
 * search queries. `visitorId` is a long-lived UUID stored in
 * localStorage (used for unique-visitor counts) and `sessionId` is a
 * sliding-window ID kept in sessionStorage. We POST as `keepalive` so
 * navigations don't drop the request, with a `sendBeacon` fallback for
 * pagehide / unload.
 *
 * The endpoint always 204s so a broken tracker can never throw in the
 * reader's browser. Failures here are logged via console.debug only.
 *
 * Custom-domain note: this tracker fires from whatever host the docs are
 * served on (custom_domain when connected, default *.replit.app
 * otherwise). The server stores `host` so the dashboard can show which
 * domains are sending traffic.
 */

const VISITOR_KEY = "0docs:analytics:visitor";
const SESSION_KEY = "0docs:analytics:session";
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min sliding window

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "v4-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const cur = localStorage.getItem(VISITOR_KEY);
    if (cur) return cur;
    const id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return "anon";
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const now = Date.now();
    if (raw) {
      const [id, lastSeen] = raw.split("|");
      if (id && lastSeen && now - Number(lastSeen) < SESSION_TTL_MS) {
        sessionStorage.setItem(SESSION_KEY, `${id}|${now}`);
        return id;
      }
    }
    const id = uuid();
    sessionStorage.setItem(SESSION_KEY, `${id}|${now}`);
    return id;
  } catch {
    return "anon";
  }
}

export interface TrackPayload {
  projectId: string;
  eventType: "page_view" | "search" | "feedback" | "assistant_message";
  pagePath?: string | null;
  pageId?: string | null;
  query?: string | null;
  helpful?: boolean | null;
  metadata?: Record<string, unknown> | null;
}

let trackEndpointBase = "";

/**
 * Set the base URL for the tracker. The published docs are usually
 * served from the same origin as the API, so the default empty string
 * (= same-origin /api/track) is correct. Exported so a future
 * cross-origin embed can point this at the canonical API host.
 */
export function setTrackEndpointBase(base: string) {
  trackEndpointBase = base.replace(/\/$/, "");
}

export function track(payload: TrackPayload): void {
  if (typeof window === "undefined") return;
  if (!payload.projectId) return;
  const body = {
    ...payload,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    pagePath: payload.pagePath ?? window.location.pathname,
    referrer: document.referrer || null,
    host: window.location.host,
  };
  const url = `${trackEndpointBase}/api/track`;
  try {
    const data = JSON.stringify(body);
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(url, new Blob([data], { type: "application/json" }));
      if (ok) return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data,
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  } catch (err) {
    if (typeof console !== "undefined") console.debug?.("analytics: track failed", err);
  }
}
