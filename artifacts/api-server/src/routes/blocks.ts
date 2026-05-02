import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, blocksTable, sectionsTable, pagesTable, projectsTable } from "@workspace/db";
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

// Verify block belongs to a project owned by userId
async function ownedBlock(blockId: string, userId: string) {
  const rows = await db
    .select({ id: blocksTable.id })
    .from(blocksTable)
    .innerJoin(sectionsTable, eq(sectionsTable.id, blocksTable.sectionId))
    .innerJoin(pagesTable, eq(pagesTable.id, sectionsTable.pageId))
    .innerJoin(projectsTable, and(eq(projectsTable.id, pagesTable.projectId), eq(projectsTable.userId, userId)))
    .where(eq(blocksTable.id, blockId))
    .limit(1);
  return rows.length > 0;
}

// GET /blocks?sectionId=...  OR  /blocks?sectionIds=id1,id2,...
router.get("/blocks", async (req: any, res) => {
  try {
    const { sectionId, sectionIds } = req.query as Record<string, string>;
    if (sectionId) {
      if (!isUuid(sectionId)) return res.json([]);
      const blocks = await db.select().from(blocksTable).where(eq(blocksTable.sectionId, sectionId)).orderBy(blocksTable.orderIndex);
      return res.json(blocks);
    }
    if (sectionIds) {
      const ids = sectionIds.split(",").filter(Boolean).filter(isUuid);
      if (ids.length === 0) return res.json([]);
      const blocks = await db.select().from(blocksTable).where(inArray(blocksTable.sectionId, ids)).orderBy(blocksTable.orderIndex);
      return res.json(blocks);
    }
    res.status(400).json({ error: "sectionId or sectionIds required" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create block
router.post("/blocks", requireAuth, async (req: any, res) => {
  try {
    const { sectionId, type, content, orderIndex } = req.body;
    // Verify ownership
    const [section] = await db.select().from(sectionsTable).where(eq(sectionsTable.id, sectionId));
    if (!section) return res.status(404).json({ error: "Not found" });
    const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, section.pageId));
    if (!page) return res.status(404).json({ error: "Not found" });
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, page.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(403).json({ error: "Forbidden" });
    const [block] = await db.insert(blocksTable).values({
      sectionId, type: type ?? "paragraph", content: content ?? {}, orderIndex: orderIndex ?? 0,
    }).returning();
    res.status(201).json(block);
  } catch (err) {
    req.log.error({ err }, "Failed to create block");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update block
router.patch("/blocks/:id", requireAuth, async (req: any, res) => {
  try {
    if (!(await ownedBlock(req.params.id, req.userId))) return res.status(403).json({ error: "Forbidden" });
    const updates: any = {};
    const allowed = ["content", "orderIndex", "sectionId", "type"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    updates.updatedAt = new Date();
    const [block] = await db.update(blocksTable).set(updates).where(eq(blocksTable.id, req.params.id)).returning();
    res.json(block);
  } catch (err) {
    req.log.error({ err }, "Failed to update block");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete block
router.delete("/blocks/:id", requireAuth, async (req: any, res) => {
  try {
    if (!(await ownedBlock(req.params.id, req.userId))) return res.status(403).json({ error: "Forbidden" });
    await db.delete(blocksTable).where(eq(blocksTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete block");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reorder blocks
router.post("/blocks/reorder", requireAuth, async (req: any, res) => {
  try {
    const { blocks } = req.body as { blocks: Array<{ id: string; orderIndex: number; sectionId: string }> };
    for (const b of blocks) {
      if (!(await ownedBlock(b.id, req.userId))) return res.status(403).json({ error: "Forbidden" });
      await db.update(blocksTable).set({ orderIndex: b.orderIndex, sectionId: b.sectionId, updatedAt: new Date() }).where(eq(blocksTable.id, b.id));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder blocks");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
