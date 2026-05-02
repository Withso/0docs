import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, sectionsTable, blocksTable, pagesTable, projectsTable } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";

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

// Verify section belongs to a project owned by userId
async function ownedSection(sectionId: string, userId: string) {
  const rows = await db
    .select({ id: sectionsTable.id })
    .from(sectionsTable)
    .innerJoin(pagesTable, eq(pagesTable.id, sectionsTable.pageId))
    .innerJoin(projectsTable, and(eq(projectsTable.id, pagesTable.projectId), eq(projectsTable.userId, userId)))
    .where(eq(sectionsTable.id, sectionId))
    .limit(1);
  return rows.length > 0;
}

// GET /sections?pageId=...  OR  /sections?pageIds=id1,id2,...
router.get("/sections", async (req: any, res) => {
  try {
    const { pageId, pageIds } = req.query as Record<string, string>;
    if (pageId) {
      if (!isUuid(pageId)) return res.json([]);
      const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.pageId, pageId)).orderBy(sectionsTable.orderIndex);
      return res.json(sections);
    }
    if (pageIds) {
      const ids = pageIds.split(",").filter(Boolean).filter(isUuid);
      if (ids.length === 0) return res.json([]);
      const sections = await db.select().from(sectionsTable).where(inArray(sectionsTable.pageId, ids)).orderBy(sectionsTable.orderIndex);
      return res.json(sections);
    }
    res.status(400).json({ error: "pageId or pageIds required" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create section
router.post("/sections", requireAuth, async (req: any, res) => {
  try {
    const { pageId, title, orderIndex } = req.body;
    // Verify ownership
    const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, pageId));
    if (!page) return res.status(404).json({ error: "Not found" });
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, page.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(403).json({ error: "Forbidden" });
    const [section] = await db.insert(sectionsTable).values({
      pageId, title: title ?? "New Section", orderIndex: orderIndex ?? 0,
    }).returning();
    res.status(201).json(section);
  } catch (err) {
    req.log.error({ err }, "Failed to create section");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update section
router.patch("/sections/:id", requireAuth, async (req: any, res) => {
  try {
    if (!(await ownedSection(req.params.id, req.userId))) return res.status(403).json({ error: "Forbidden" });
    const updates: any = {};
    const allowed = ["title", "navTitle", "orderIndex"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    updates.updatedAt = new Date();
    const [section] = await db.update(sectionsTable).set(updates).where(eq(sectionsTable.id, req.params.id)).returning();
    res.json(section);
  } catch (err) {
    req.log.error({ err }, "Failed to update section");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete section
router.delete("/sections/:id", requireAuth, async (req: any, res) => {
  try {
    if (!(await ownedSection(req.params.id, req.userId))) return res.status(403).json({ error: "Forbidden" });
    await db.delete(sectionsTable).where(eq(sectionsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete section");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reorder sections
router.post("/sections/reorder", requireAuth, async (req: any, res) => {
  try {
    const { sections } = req.body as { sections: Array<{ id: string; orderIndex: number }> };
    for (const s of sections) {
      if (!(await ownedSection(s.id, req.userId))) return res.status(403).json({ error: "Forbidden" });
      await db.update(sectionsTable).set({ orderIndex: s.orderIndex, updatedAt: new Date() }).where(eq(sectionsTable.id, s.id));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder sections");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
