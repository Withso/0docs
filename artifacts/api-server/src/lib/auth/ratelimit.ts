import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Tiny in-memory rate limiter, scoped per-process. Good enough for self-hosted
 * single-instance deployments to slow brute-force on the auth endpoints. For
 * multi-instance setups, put a real reverse proxy (nginx, Caddy) in front and
 * rate-limit there.
 */
export function rateLimit(opts: { windowMs: number; max: number; key?: (req: Request) => string }) {
  const keyFn =
    opts.key ??
    ((req: Request) =>
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown");

  return (req: Request, res: Response, next: NextFunction) => {
    const k = `${req.method}:${req.path}:${keyFn(req)}`;
    const now = Date.now();
    const b = buckets.get(k);
    if (!b || b.resetAt <= now) {
      buckets.set(k, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }
    if (b.count >= opts.max) {
      res
        .status(429)
        .json({ error: "Too many requests. Please try again later." });
      return;
    }
    b.count += 1;
    next();
  };
}

// Periodic cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();
