import { Router, Request, Response, NextFunction } from "express";
import { db, navGroupsTable, pagesTable, projectsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and } from "drizzle-orm";
import { resolveBranchId, getDefaultBranchId } from "../lib/branches";
import { fireAutoCommit } from "../lib/auto-commit";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);



async function ownedNavGroup(navGroupId: string, userId: string) {
  const rows = await db
    .select({ id: navGroupsTable.id })
    .from(navGroupsTable)
    .innerJoin(projectsTable, and(eq(projectsTable.id, navGroupsTable.projectId), eq(projectsTable.userId, userId)))
    .where(eq(navGroupsTable.id, navGroupId))
    .limit(1);
  return rows.length > 0;
}

async function ownedProject(projectId: string, userId: string) {
  const [p] = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return p ?? null;
}

async function isProjectPublished(projectId: string): Promise<boolean> {
  const [p] = await db
    .select({ publishedVersionId: projectsTable.publishedVersionId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  return p?.publishedVersionId != null;
}

// GET /navgroups?projectId=...
// Public for published projects; requires auth + ownership for unpublished
router.get("/navgroups", async (req: Request, res: Response) => {
  try {
    const projectId = req.query["projectId"] as string | undefined;
    if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
    if (!isUuid(projectId)) { res.json([]); return; }

    // Public reads must always go to default branch — only owners may pick.
    const userId = req.user?.id;
    const isOwner = userId ? !!(await ownedProject(projectId, userId)) : false;
    if (await isProjectPublished(projectId)) {
      const branchId = isOwner
        ? await resolveBranchId(req, projectId)
        : await getDefaultBranchId(projectId);
      const groups = await db.select().from(navGroupsTable)
        .where(and(eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, branchId)))
        .orderBy(navGroupsTable.orderIndex);
      res.json(groups); return;
    }

    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!isOwner) { res.status(403).json({ error: "Forbidden" }); return; }
    const branchId = await resolveBranchId(req, projectId);
    const groups = await db.select().from(navGroupsTable)
      .where(and(eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, branchId)))
      .orderBy(navGroupsTable.orderIndex);
    res.json(groups);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// PATCH /navgroups/:id (alias for /nav-groups/:id)
router.patch("/navgroups/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    if (!(await ownedNavGroup(req.params.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    const allowed = ["title", "type", "orderIndex", "tabId", "metadata"] as const;
    const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const [group] = await db.update(navGroupsTable).set(updates).where(eq(navGroupsTable.id, req.params.id)).returning();
    res.json(group);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// List nav groups for project
router.get("/projects/:projectId/nav-groups", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) { res.status(404).json({ error: "Not found" }); return; }
      const branchId = await resolveBranchId(req, projectId);
      const groups = await db.select().from(navGroupsTable)
        .where(and(eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, branchId)))
        .orderBy(navGroupsTable.orderIndex);
      res.json(groups);
    } catch (err) {
      req.log.error({ err }, "Failed to list nav groups");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Create nav group
router.post("/projects/:projectId/nav-groups", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) { res.status(404).json({ error: "Not found" }); return; }
      const { title, type, orderIndex, tabId } = req.body as {
        title?: string; type?: string; orderIndex?: number; tabId?: string;
      };
      const branchId = await resolveBranchId(req, projectId);
      const [group] = await db.insert(navGroupsTable).values({
        projectId, branchId, title: title ?? "New Label",
        type: type ?? "label", orderIndex: orderIndex ?? 0, tabId: tabId ?? null,
      }).returning();
      fireAutoCommit(req, { projectId, branchId, message: "Create nav group" });
      res.status(201).json(group);
    } catch (err) {
      req.log.error({ err }, "Failed to create nav group");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Update nav group
router.patch("/nav-groups/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    if (!(await ownedNavGroup(req.params.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    const allowed = ["title", "type", "orderIndex", "tabId", "metadata"] as const;
    const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const [group] = await db.update(navGroupsTable).set(updates).where(eq(navGroupsTable.id, req.params.id)).returning();
    res.json(group);
  } catch (err) {
    req.log.error({ err }, "Failed to update nav group");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete nav group
router.delete("/nav-groups/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    if (!(await ownedNavGroup(req.params.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.update(pagesTable).set({ navGroupId: null }).where(eq(pagesTable.navGroupId, req.params.id));
    await db.delete(navGroupsTable).where(eq(navGroupsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete nav group");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reorder nav groups
router.post("/nav-groups/reorder", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { groups } = req.body as { groups: Array<{ id: string; orderIndex: number }> };
    for (const g of groups) {
      if (!(await ownedNavGroup(g.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
      await db.update(navGroupsTable).set({ orderIndex: g.orderIndex, updatedAt: new Date() }).where(eq(navGroupsTable.id, g.id));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder nav groups");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
