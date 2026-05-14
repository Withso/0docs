import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { ensureSessionSecret } from "./lib/auth/secret";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the built frontend's dist directory. We check (in order):
 *   1. WEB_DIST_DIR env (lets operators point at any location).
 *   2. `public/` next to the api-server bundle — what the Dockerfile
 *      produces when it bundles the frontend into the api image.
 *   3. The monorepo source layout — useful when running the built
 *      api-server from a checkout (e.g. `pnpm --filter api-server start`
 *      after building both packages).
 * If none resolve, static serving is skipped. That's the right default in
 * dev where Vite serves the frontend on a separate port.
 */
function resolveWebDistDir(): string | null {
  const fromEnv = process.env.WEB_DIST_DIR;
  if (fromEnv) {
    return fs.existsSync(path.join(fromEnv, "index.html")) ? fromEnv : null;
  }
  const candidates = [
    path.join(__dirname, "public"),
    path.join(__dirname, "..", "..", "zdocs", "dist", "public"),
  ];
  return candidates.find((c) => fs.existsSync(path.join(c, "index.html"))) ?? null;
}

/**
 * Build the Express app. Async because cookie-parser needs a secret that
 * may live in the database (auto-generated on first boot — see
 * lib/auth/secret.ts). Call once at bootstrap, after migrations.
 */
export async function buildApp(): Promise<Express> {
  const app: Express = express();

  // Trust one reverse-proxy hop (Railway, nginx, Caddy, Fly, etc).
  // Required so req.secure / req.protocol respect X-Forwarded-Proto and
  // the session cookie's Secure flag works behind HTTPS termination.
  app.set("trust proxy", 1);

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );

  // CORS allow-list. In dev we accept any origin (so Vite preview &
  // tunnel work); in production we accept localhost plus origins
  // explicitly listed in CORS_ALLOWLIST (comma-separated). When the API
  // and web share the same host (the single-service deployment default)
  // CORS is a no-op.
  const corsAllowlist = (process.env.CORS_ALLOWLIST ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const isProd = process.env.NODE_ENV === "production";
  app.use(cors({
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (!isProd) return cb(null, true);
      try {
        const u = new URL(origin);
        const host = u.hostname;
        const ok =
          host === "localhost" ||
          host === "127.0.0.1" ||
          corsAllowlist.includes(origin);
        return cb(null, ok);
      } catch {
        return cb(null, false);
      }
    },
  }));

  // Cookie parser with a real secret. The secret is sourced from
  // SESSION_SECRET when set, otherwise auto-generated on first boot and
  // persisted in `system_settings` so it survives restarts. This lets
  // zero-config deploys (Railway, fresh docker compose) "just work".
  const sessionSecret = await ensureSessionSecret();
  app.use(cookieParser(sessionSecret));

  // Cap JSON bodies at 5 MB so we can't be DoS'd with huge OpenAPI
  // specs / nav snapshots; raise via env if a project legitimately
  // needs more.
  const JSON_LIMIT = process.env.JSON_BODY_LIMIT || "5mb";
  app.use(express.json({ limit: JSON_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: JSON_LIMIT }));

  app.use(authMiddleware);

  app.use("/api", router);

  const webDistDir = resolveWebDistDir();
  if (webDistDir) {
    logger.info({ webDistDir }, "Serving frontend from disk");

    // Hashed asset files (e.g. /assets/index-abc123.js) are immutable —
    // long-cache them. index.html stays no-cache so deploys take effect.
    app.use(
      express.static(webDistDir, {
        index: false,
        maxAge: "1y",
        immutable: true,
        setHeaders(res, filePath) {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      }),
    );

    // SPA fallback. Anything that isn't /api/* or an asset above gets
    // index.html so client-side routing works. POST/PUT/DELETE to
    // unknown paths still 404 (we explicitly only handle GET / HEAD).
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(webDistDir, "index.html"), {
        headers: { "Cache-Control": "no-cache" },
      });
    });
  } else {
    logger.info(
      "No frontend dist found — running API-only (dev mode or split deployment)",
    );
  }

  return app;
}
