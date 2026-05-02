import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, navGroupsTable, pagesTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

// GET /navgroups?projectId=... (flat path, public-friendly)
router.get("/navgroups", async (req: any, res) => {
  try {
    const { projectId } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!isUuid(projectId)) return res.json([]);
    const groups = await db.select().from(navGroupsTable).where(eq(navGroupsTable.projectId, projectId)).orderBy(navGroupsTable.orderIndex);
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /navgroups/:id (alias for /nav-groups/:id)
router.patch("/navgroups/:id", requireAuth, async (req: any, res) => {
  try {
    const updates: any = {};
    const allowed = ["title", "type", "orderIndex", "tabId", "metadata"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    updates.updatedAt = new Date();
    const [group] = await db.update(navGroupsTable).set(updates).where(eq(navGroupsTable.id, req.params.id)).returning();
    res.json(group);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List nav groups for project
router.get("/projects/:projectId/nav-groups", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    const groups = await db.select().from(navGroupsTable).where(eq(navGroupsTable.projectId, req.params.projectId)).orderBy(navGroupsTable.orderIndex);
    res.json(groups);
  } catch (err) {
    req.log.error({ err }, "Failed to list nav groups");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create nav group
router.post("/projects/:projectId/nav-groups", requireAuth, async (req: any, res) => {
  try {
    const { title, type, orderIndex, tabId } = req.body;
    const [group] = await db.insert(navGroupsTable).values({
      projectId: req.params.projectId, title: title ?? "New Label",
      type: type ?? "label", orderIndex: orderIndex ?? 0, tabId: tabId ?? null,
    }).returning();
    res.status(201).json(group);
  } catch (err) {
    req.log.error({ err }, "Failed to create nav group");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update nav group
router.patch("/nav-groups/:id", requireAuth, async (req: any, res) => {
  try {
    const updates: any = {};
    const allowed = ["title", "type", "orderIndex", "tabId", "metadata"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    updates.updatedAt = new Date();
    const [group] = await db.update(navGroupsTable).set(updates).where(eq(navGroupsTable.id, req.params.id)).returning();
    res.json(group);
  } catch (err) {
    req.log.error({ err }, "Failed to update nav group");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete nav group
router.delete("/nav-groups/:id", requireAuth, async (req: any, res) => {
  try {
    // Unassign pages
    await db.update(pagesTable).set({ navGroupId: null }).where(eq(pagesTable.navGroupId, req.params.id));
    await db.delete(navGroupsTable).where(eq(navGroupsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete nav group");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reorder nav groups
router.post("/nav-groups/reorder", requireAuth, async (req: any, res) => {
  try {
    const { groups } = req.body as { groups: Array<{ id: string; orderIndex: number }> };
    for (const g of groups) {
      await db.update(navGroupsTable).set({ orderIndex: g.orderIndex, updatedAt: new Date() }).where(eq(navGroupsTable.id, g.id));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder nav groups");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
