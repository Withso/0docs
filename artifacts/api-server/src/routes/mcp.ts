import { Router, Request, Response } from "express";
import { db, mcpSettingsTable, mcpTokensTable, projectsTable } from "@workspace/db";
import { and, eq, isNull, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { userOwnsProject } from "../lib/branches";
import { handleMcpHttp, handleMcpSseGet } from "../lib/mcp/server";
import { generateMcpToken, getMcpSettings } from "../lib/mcp/auth";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

// =============================================================================
// MCP transport endpoint — Streamable HTTP (with SSE fallback).
// =============================================================================
// POST: clients send JSON-RPC requests; response is JSON or SSE per Accept.
router.post("/mcp", handleMcpHttp);
// GET: SSE long-poll for server→client notifications (kept alive but currently no-op).
router.get("/mcp", handleMcpSseGet);

// =============================================================================
// Per-project settings + tokens (used by the in-app UI).
// All endpoints require the session-cookie auth + project ownership — these
// configure MCP, they aren't the MCP transport itself.
// =============================================================================

// GET /projects/:projectId/mcp/settings
router.get("/projects/:projectId/mcp/settings", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!isUuid(projectId) || !(await userOwnsProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const settings = await getMcpSettings(projectId);
      // Surface the bare endpoint URL so the UI can show the connect snippet.
      res.json({
        ...settings,
        endpoint: "/api/mcp",
      });
    } catch (err) {
      req.log.error({ err }, "Failed to read MCP settings");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// PUT /projects/:projectId/mcp/settings — upsert.
router.put("/projects/:projectId/mcp/settings", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!isUuid(projectId) || !(await userOwnsProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const body = req.body as {
        enabled?: boolean; allowAnonymous?: boolean; disabledTools?: string[];
      };
      const updates: Record<string, unknown> = {};
      if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
      if (typeof body.allowAnonymous === "boolean") updates.allowAnonymous = body.allowAnonymous;
      if (Array.isArray(body.disabledTools)) {
        updates.disabledTools = body.disabledTools.filter(s => typeof s === "string");
      }

      const [existing] = await db.select().from(mcpSettingsTable)
        .where(eq(mcpSettingsTable.projectId, projectId)).limit(1);
      let row;
      if (existing) {
        [row] = await db.update(mcpSettingsTable).set({ ...updates, updatedAt: new Date() })
          .where(eq(mcpSettingsTable.id, existing.id)).returning();
      } else {
        [row] = await db.insert(mcpSettingsTable).values({
          projectId,
          enabled: updates.enabled === undefined ? true : Boolean(updates.enabled),
          allowAnonymous: updates.allowAnonymous === undefined ? false : Boolean(updates.allowAnonymous),
          disabledTools: (updates.disabledTools as string[] | undefined) ?? [],
        }).returning();
      }
      res.json({
        enabled: row.enabled,
        allowAnonymous: row.allowAnonymous,
        disabledTools: row.disabledTools,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to update MCP settings");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// GET /projects/:projectId/mcp/tokens — list (raw token never returned).
router.get("/projects/:projectId/mcp/tokens", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!isUuid(projectId) || !(await userOwnsProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const rows = await db.select({
        id: mcpTokensTable.id, label: mcpTokensTable.label,
        lastFour: mcpTokensTable.lastFour, lastUsedAt: mcpTokensTable.lastUsedAt,
        createdAt: mcpTokensTable.createdAt, expiresAt: mcpTokensTable.expiresAt,
        revokedAt: mcpTokensTable.revokedAt,
      }).from(mcpTokensTable)
        .where(and(eq(mcpTokensTable.projectId, projectId), isNull(mcpTokensTable.revokedAt)))
        .orderBy(desc(mcpTokensTable.createdAt));
      res.json(rows);
    } catch (err) {
      req.log.error({ err }, "Failed to list MCP tokens");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// POST /projects/:projectId/mcp/tokens — create. Returns the raw token ONCE.
router.post("/projects/:projectId/mcp/tokens", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!isUuid(projectId) || !(await userOwnsProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const label = typeof req.body?.label === "string" ? String(req.body.label).slice(0, 100) : "";
      const expiresInDays = typeof req.body?.expiresInDays === "number" ? req.body.expiresInDays : null;
      const expiresAt = expiresInDays && expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;
      const { raw, hash, lastFour } = generateMcpToken();
      const [row] = await db.insert(mcpTokensTable).values({
        projectId, userId, label, tokenHash: hash, lastFour, expiresAt,
      }).returning({
        id: mcpTokensTable.id, label: mcpTokensTable.label,
        lastFour: mcpTokensTable.lastFour, createdAt: mcpTokensTable.createdAt,
        expiresAt: mcpTokensTable.expiresAt,
      });
      res.status(201).json({ ...row, token: raw });
    } catch (err) {
      req.log.error({ err }, "Failed to create MCP token");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// DELETE /projects/:projectId/mcp/tokens/:id — revoke.
router.delete("/projects/:projectId/mcp/tokens/:id", requireAuth,
  async (req: Request<{ projectId: string; id: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId, id } = req.params;
      if (!isUuid(projectId) || !isUuid(id) || !(await userOwnsProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      await db.update(mcpTokensTable)
        .set({ revokedAt: new Date() })
        .where(and(eq(mcpTokensTable.id, id), eq(mcpTokensTable.projectId, projectId)));
      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to revoke MCP token");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// GET /mcp/tools — public catalog (descriptions + readOnly flags), used by
// the settings UI to render the per-tool toggle list. No auth required (no
// data is exposed here, only static metadata).
router.get("/mcp/tools", async (_req: Request, res: Response) => {
  // Lazy import to avoid loading the tool implementations at module-scan time.
  const { TOOLS } = await import("../lib/mcp/tools");
  res.json(TOOLS.map(t => ({
    name: t.name, description: t.description, readOnly: t.readOnly, needsProject: t.needsProject,
  })));
});

export default router;
