import { Router, Request, Response, NextFunction } from "express";
import { db, tabsTable, navGroupsTable, projectsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and } from "drizzle-orm";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);



async function isProjectPublished(projectId: string): Promise<boolean> {
  const [p] = await db
    .select({ publishedVersionId: projectsTable.publishedVersionId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  return p?.publishedVersionId != null;
}

// GET /tabs?projectId=...
// Public for published projects; requires auth + ownership for unpublished.
// Used by the public docs viewer to render the top-level tab navigator.
router.get("/tabs", async (req: Request, res: Response) => {
  try {
    const projectId = req.query["projectId"] as string | undefined;
    if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
    if (!isUuid(projectId)) { res.json([]); return; }

    if (await isProjectPublished(projectId)) {
      const tabs = await db.select().from(tabsTable)
        .where(eq(tabsTable.projectId, projectId))
        .orderBy(tabsTable.orderIndex);
      res.json(tabs); return;
    }

    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [owned] = await db.select({ id: projectsTable.id }).from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
    if (!owned) { res.status(403).json({ error: "Forbidden" }); return; }
    const tabs = await db.select().from(tabsTable)
      .where(eq(tabsTable.projectId, projectId))
      .orderBy(tabsTable.orderIndex);
    res.json(tabs);
  } catch (err) {
    req.log.error({ err }, "Failed to list tabs");
    res.status(500).json({ error: "Internal server error" });
  }
});

async function ownedTab(tabId: string, userId: string) {
  const rows = await db
    .select({ id: tabsTable.id })
    .from(tabsTable)
    .innerJoin(projectsTable, and(eq(projectsTable.id, tabsTable.projectId), eq(projectsTable.userId, userId)))
    .where(eq(tabsTable.id, tabId))
    .limit(1);
  return rows.length > 0;
}

async function ownedProject(projectId: string, userId: string) {
  const [p] = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return p ?? null;
}

// List tabs for project
router.get("/projects/:projectId/tabs", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) { res.status(404).json({ error: "Not found" }); return; }
      const tabs = await db.select().from(tabsTable)
        .where(eq(tabsTable.projectId, projectId))
        .orderBy(tabsTable.orderIndex);
      res.json(tabs);
    } catch (err) {
      req.log.error({ err }, "Failed to list tabs");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Create tab
router.post("/projects/:projectId/tabs", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) { res.status(404).json({ error: "Not found" }); return; }
      const { label, orderIndex, metadata } = req.body as {
        label?: string; orderIndex?: number; metadata?: object;
      };
      const [tab] = await db.insert(tabsTable).values({
        projectId, label: label ?? "New Tab",
        orderIndex: orderIndex ?? 0, metadata: metadata ?? {},
      }).returning();
      res.status(201).json(tab);
    } catch (err) {
      req.log.error({ err }, "Failed to create tab");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Update tab
router.patch("/tabs/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    if (!(await ownedTab(req.params.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    const allowed = ["label", "icon", "orderIndex", "metadata"] as const;
    const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const [tab] = await db.update(tabsTable).set(updates).where(eq(tabsTable.id, req.params.id)).returning();
    res.json(tab);
  } catch (err) {
    req.log.error({ err }, "Failed to update tab");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete tab
router.delete("/tabs/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    if (!(await ownedTab(req.params.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.update(navGroupsTable).set({ tabId: null }).where(eq(navGroupsTable.tabId, req.params.id));
    await db.delete(tabsTable).where(eq(tabsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete tab");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reorder tabs
router.post("/tabs/reorder", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tabs } = req.body as { tabs: Array<{ id: string; orderIndex: number }> };
    for (const t of tabs) {
      if (!(await ownedTab(t.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
      await db.update(tabsTable).set({ orderIndex: t.orderIndex, updatedAt: new Date() }).where(eq(tabsTable.id, t.id));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder tabs");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
