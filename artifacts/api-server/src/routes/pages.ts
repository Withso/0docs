import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, pagesTable, projectsTable, sectionsTable, blocksTable, navGroupsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

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

// GET /pages?projectId=... (flat, public-friendly)
router.get("/pages", async (req: any, res) => {
  try {
    const { projectId } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!isUuid(projectId)) return res.json([]);
    const pages = await db.select().from(pagesTable).where(eq(pagesTable.projectId, projectId)).orderBy(pagesTable.orderIndex);
    res.json(pages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /pages/:id (flat path — used by PageSettingsPanel, SettingsSidePanel)
router.patch("/pages/:id", requireAuth, async (req: any, res) => {
  try {
    // Verify ownership via page → project
    const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, req.params.id));
    if (!page) return res.status(404).json({ error: "Not found" });
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, page.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(403).json({ error: "Forbidden" });
    const updates: any = {};
    const allowed = ["title", "slug", "orderIndex", "navGroupId", "navTitle", "metaDescription", "metadata"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    updates.updatedAt = new Date();
    const [updated] = await db.update(pagesTable).set(updates).where(eq(pagesTable.id, req.params.id)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List pages for project
router.get("/projects/:projectId/pages", requireAuth, async (req: any, res) => {
  try {
    // Verify ownership
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    const pages = await db.select().from(pagesTable).where(eq(pagesTable.projectId, req.params.projectId)).orderBy(pagesTable.orderIndex);
    res.json(pages);
  } catch (err) {
    req.log.error({ err }, "Failed to list pages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create page
router.post("/projects/:projectId/pages", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    const { title, slug, orderIndex, navGroupId, navTitle, metaDescription } = req.body;
    const [page] = await db.insert(pagesTable).values({
      projectId: req.params.projectId, title, slug, orderIndex: orderIndex ?? 0,
      navGroupId: navGroupId ?? null, navTitle: navTitle ?? null, metaDescription: metaDescription ?? null,
    }).returning();
    res.status(201).json(page);
  } catch (err) {
    req.log.error({ err }, "Failed to create page");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update page
router.patch("/projects/:projectId/pages/:pageId", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    const updates: any = {};
    const allowed = ["title", "slug", "orderIndex", "navGroupId", "navTitle", "metaDescription"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    updates.updatedAt = new Date();
    const [page] = await db.update(pagesTable).set(updates).where(eq(pagesTable.id, req.params.pageId)).returning();
    res.json(page);
  } catch (err) {
    req.log.error({ err }, "Failed to update page");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete page
router.delete("/projects/:projectId/pages/:pageId", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    await db.delete(pagesTable).where(eq(pagesTable.id, req.params.pageId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete page");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bulk reorder pages
router.post("/projects/:projectId/pages/reorder", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });
    const { pages } = req.body as { pages: Array<{ id: string; orderIndex: number; navGroupId?: string | null }> };
    for (const p of pages) {
      await db.update(pagesTable).set({ orderIndex: p.orderIndex, navGroupId: p.navGroupId ?? null, updatedAt: new Date() }).where(eq(pagesTable.id, p.id));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder pages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get sections and blocks for a page
router.get("/projects/:projectId/pages/:pageId/content", requireAuth, async (req: any, res) => {
  try {
    const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.pageId, req.params.pageId)).orderBy(sectionsTable.orderIndex);
    let blocks: any[] = [];
    if (sections.length > 0) {
      blocks = await db.select().from(blocksTable).where(inArray(blocksTable.sectionId, sections.map(s => s.id))).orderBy(blocksTable.orderIndex);
    }
    res.json({ sections, blocks });
  } catch (err) {
    req.log.error({ err }, "Failed to get page content");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
