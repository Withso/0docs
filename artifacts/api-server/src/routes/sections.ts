import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, sectionsTable, blocksTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

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
      await db.update(sectionsTable).set({ orderIndex: s.orderIndex, updatedAt: new Date() }).where(eq(sectionsTable.id, s.id));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder sections");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
