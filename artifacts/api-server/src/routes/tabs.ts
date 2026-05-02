import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, tabsTable, navGroupsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
};

// Verify tab belongs to a project owned by userId
async function ownedTab(tabId: string, userId: string) {
  const rows = await db
    .select({ id: tabsTable.id })
    .from(tabsTable)
    .innerJoin(projectsTable, and(eq(projectsTable.id, tabsTable.projectId), eq(projectsTable.userId, userId)))
    .where(eq(tabsTable.id, tabId))
    .limit(1);
  return rows.length > 0;
}

// List tabs for project
router.get("/projects/:projectId/tabs", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    const tabs = await db.select().from(tabsTable).where(eq(tabsTable.projectId, req.params.projectId)).orderBy(tabsTable.orderIndex);
    res.json(tabs);
  } catch (err) {
    req.log.error({ err }, "Failed to list tabs");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create tab
router.post("/projects/:projectId/tabs", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    const { label, orderIndex, metadata } = req.body;
    const [tab] = await db.insert(tabsTable).values({
      projectId: req.params.projectId, label: label ?? "New Tab",
      orderIndex: orderIndex ?? 0, metadata: metadata ?? {},
    }).returning();
    res.status(201).json(tab);
  } catch (err) {
    req.log.error({ err }, "Failed to create tab");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update tab
router.patch("/tabs/:id", requireAuth, async (req: any, res) => {
  try {
    if (!(await ownedTab(req.params.id, req.userId))) return res.status(403).json({ error: "Forbidden" });
    const updates: any = {};
    const allowed = ["label", "icon", "orderIndex", "metadata"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    updates.updatedAt = new Date();
    const [tab] = await db.update(tabsTable).set(updates).where(eq(tabsTable.id, req.params.id)).returning();
    res.json(tab);
  } catch (err) {
    req.log.error({ err }, "Failed to update tab");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete tab
router.delete("/tabs/:id", requireAuth, async (req: any, res) => {
  try {
    if (!(await ownedTab(req.params.id, req.userId))) return res.status(403).json({ error: "Forbidden" });
    // Unassign nav groups from this tab
    await db.update(navGroupsTable).set({ tabId: null }).where(eq(navGroupsTable.tabId, req.params.id));
    await db.delete(tabsTable).where(eq(tabsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete tab");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reorder tabs
router.post("/tabs/reorder", requireAuth, async (req: any, res) => {
  try {
    const { tabs } = req.body as { tabs: Array<{ id: string; orderIndex: number }> };
    for (const t of tabs) {
      if (!(await ownedTab(t.id, req.userId))) return res.status(403).json({ error: "Forbidden" });
      await db.update(tabsTable).set({ orderIndex: t.orderIndex, updatedAt: new Date() }).where(eq(tabsTable.id, t.id));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder tabs");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
