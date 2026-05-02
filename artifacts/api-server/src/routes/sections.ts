import { Router, Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, sectionsTable, blocksTable, pagesTable, projectsTable } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

type AuthedReq = Request & { userId: string };

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as unknown as AuthedReq).userId = userId;
  next();
}

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
router.get("/sections", async (req: Request, res: Response) => {
  try {
    const pageId = req.query["pageId"] as string | undefined;
    const pageIds = req.query["pageIds"] as string | undefined;
    if (pageId) {
      if (!isUuid(pageId)) { res.json([]); return; }
      const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.pageId, pageId)).orderBy(sectionsTable.orderIndex);
      res.json(sections); return;
    }
    if (pageIds) {
      const ids = pageIds.split(",").filter(Boolean).filter(isUuid);
      if (ids.length === 0) { res.json([]); return; }
      const sections = await db.select().from(sectionsTable).where(inArray(sectionsTable.pageId, ids)).orderBy(sectionsTable.orderIndex);
      res.json(sections); return;
    }
    res.status(400).json({ error: "pageId or pageIds required" });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// Create section
router.post("/sections", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthedReq).userId;
    const { pageId, title, orderIndex } = req.body as { pageId: string; title?: string; orderIndex?: number };
    const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, pageId));
    if (!page) { res.status(404).json({ error: "Not found" }); return; }
    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, page.projectId), eq(projectsTable.userId, userId)));
    if (!project) { res.status(403).json({ error: "Forbidden" }); return; }
    const [section] = await db.insert(sectionsTable).values({
      pageId, title: title ?? "New Section", orderIndex: orderIndex ?? 0,
    }).returning();
    res.status(201).json(section);
  } catch (err) {
    (req as any).log?.error({ err }, "Failed to create section");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update section
router.patch("/sections/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = (req as unknown as AuthedReq).userId;
    if (!(await ownedSection(req.params.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    const allowed = ["title", "navTitle", "orderIndex"] as const;
    const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const [section] = await db.update(sectionsTable).set(updates).where(eq(sectionsTable.id, req.params.id)).returning();
    res.json(section);
  } catch (err) {
    (req as any).log?.error({ err }, "Failed to update section");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete section
router.delete("/sections/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = (req as unknown as AuthedReq).userId;
    if (!(await ownedSection(req.params.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(sectionsTable).where(eq(sectionsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    (req as any).log?.error({ err }, "Failed to delete section");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reorder sections
router.post("/sections/reorder", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthedReq).userId;
    const { sections } = req.body as { sections: Array<{ id: string; orderIndex: number }> };
    for (const s of sections) {
      if (!(await ownedSection(s.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
      await db.update(sectionsTable).set({ orderIndex: s.orderIndex, updatedAt: new Date() }).where(eq(sectionsTable.id, s.id));
    }
    res.json({ ok: true });
  } catch (err) {
    (req as any).log?.error({ err }, "Failed to reorder sections");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
