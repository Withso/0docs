import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

// CORS allow-list. In dev we accept any origin (so Vite preview & tunnel work);
// in production we only accept Replit-served domains plus configurable extras
// from CORS_ALLOWLIST (comma-separated).
const corsAllowlist = (process.env.CORS_ALLOWLIST ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const isProd = process.env.NODE_ENV === "production";
app.use(cors({
  credentials: true,
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / curl / server-to-server
    if (!isProd) return cb(null, true);
    try {
      const u = new URL(origin);
      const host = u.hostname;
      const ok =
        host.endsWith(".replit.dev") ||
        host.endsWith(".replit.app") ||
        host.endsWith(".repl.co") ||
        corsAllowlist.includes(origin);
      return cb(null, ok);
    } catch {
      return cb(null, false);
    }
  },
}));
app.use(cookieParser());
// Cap JSON bodies at 5 MB so we can't be DoS'd with huge OpenAPI specs / nav
// snapshots; raise via env if a project legitimately needs more.
const JSON_LIMIT = process.env.JSON_BODY_LIMIT || "5mb";
app.use(express.json({ limit: JSON_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_LIMIT }));

app.use(authMiddleware);

app.use("/api", router);

export default app;
