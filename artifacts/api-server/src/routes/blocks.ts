import { Router, Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, blocksTable, sectionsTable, pagesTable, projectsTable } from "@workspace/db";
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

// Resolve section IDs, verifying their project is published or caller owns it
async function resolvePublishedSectionIds(sectionIds: string[], auth: ReturnType<typeof getAuth>): Promise<string[] | null> {
  const validIds = sectionIds.filter(isUuid);
  if (validIds.length === 0) return [];

  const sections = await db
    .select({ id: sectionsTable.id, pageId: sectionsTable.pageId })
    .from(sectionsTable)
    .where(inArray(sectionsTable.id, validIds));
  if (sections.length === 0) return [];

  const pageIds = [...new Set(sections.map((s) => s.pageId))];
  const pages = await db
    .select({ id: pagesTable.id, projectId: pagesTable.projectId })
    .from(pagesTable)
    .where(inArray(pagesTable.id, pageIds));

  const projectIds = [...new Set(pages.map((p) => p.projectId))];
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;

  for (const projectId of projectIds) {
    const [project] = await db
      .select({ publishedVersionId: projectsTable.publishedVersionId, userId: projectsTable.userId })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));
    if (!project) return null;
    const isPublished = project.publishedVersionId != null;
    const isOwner = userId != null && project.userId === userId;
    if (!isPublished && !isOwner) return null;
  }
  return validIds;
}

// GET /blocks?sectionId=...  OR  /blocks?sectionIds=id1,id2,...
// Public for published projects; requires ownership for unpublished
router.get("/blocks", async (req: Request, res: Response) => {
  try {
    const sectionId = req.query["sectionId"] as string | undefined;
    const sectionIds = req.query["sectionIds"] as string | undefined;
    const auth = getAuth(req);

    if (sectionId) {
      if (!isUuid(sectionId)) { res.json([]); return; }
      const allowed = await resolvePublishedSectionIds([sectionId], auth);
      if (allowed === null) { res.status(403).json({ error: "Forbidden" }); return; }
      if (allowed.length === 0) { res.json([]); return; }
      const blocks = await db.select().from(blocksTable)
        .where(eq(blocksTable.sectionId, sectionId))
        .orderBy(blocksTable.orderIndex);
      res.json(blocks); return;
    }
    if (sectionIds) {
      const ids = sectionIds.split(",").filter(Boolean).filter(isUuid);
      if (ids.length === 0) { res.json([]); return; }
      const allowed = await resolvePublishedSectionIds(ids, auth);
      if (allowed === null) { res.status(403).json({ error: "Forbidden" }); return; }
      if (allowed.length === 0) { res.json([]); return; }
      const blocks = await db.select().from(blocksTable)
        .where(inArray(blocksTable.sectionId, allowed))
        .orderBy(blocksTable.orderIndex);
      res.json(blocks); return;
    }
    res.status(400).json({ error: "sectionId or sectionIds required" });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// Create block
router.post("/blocks", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthedReq).userId;
    const { sectionId, type, content, orderIndex } = req.body as {
      sectionId: string; type?: string; content?: object; orderIndex?: number;
    };
    const [section] = await db.select().from(sectionsTable).where(eq(sectionsTable.id, sectionId));
    if (!section) { res.status(404).json({ error: "Not found" }); return; }
    const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, section.pageId));
    if (!page) { res.status(404).json({ error: "Not found" }); return; }
    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, page.projectId), eq(projectsTable.userId, userId)));
    if (!project) { res.status(403).json({ error: "Forbidden" }); return; }
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
router.patch("/blocks/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = (req as unknown as AuthedReq).userId;
    if (!(await ownedBlock(req.params.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    const { content, orderIndex, type, sectionId } = req.body as {
      content?: object; orderIndex?: number; type?: string; sectionId?: string;
    };
    const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
    if (content !== undefined) updates["content"] = content;
    if (orderIndex !== undefined) updates["orderIndex"] = orderIndex;
    if (type !== undefined) updates["type"] = type;
    // If caller is moving block to a different section, verify they own the destination section too
    if (sectionId !== undefined) {
      const destOwned = await db
        .select({ id: sectionsTable.id })
        .from(sectionsTable)
        .innerJoin(pagesTable, eq(pagesTable.id, sectionsTable.pageId))
        .innerJoin(projectsTable, and(eq(projectsTable.id, pagesTable.projectId), eq(projectsTable.userId, userId)))
        .where(eq(sectionsTable.id, sectionId))
        .limit(1);
      if (destOwned.length === 0) { res.status(403).json({ error: "Forbidden" }); return; }
      updates["sectionId"] = sectionId;
    }
    const [block] = await db.update(blocksTable).set(updates).where(eq(blocksTable.id, req.params.id)).returning();
    res.json(block);
  } catch (err) {
    req.log.error({ err }, "Failed to update block");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete block
router.delete("/blocks/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = (req as unknown as AuthedReq).userId;
    if (!(await ownedBlock(req.params.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(blocksTable).where(eq(blocksTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete block");
    res.status(500).json({ error: "Internal server error" });
  }
});

async function ownedSection(sectionId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: sectionsTable.id })
    .from(sectionsTable)
    .innerJoin(pagesTable, eq(pagesTable.id, sectionsTable.pageId))
    .innerJoin(projectsTable, and(eq(projectsTable.id, pagesTable.projectId), eq(projectsTable.userId, userId)))
    .where(eq(sectionsTable.id, sectionId))
    .limit(1);
  return rows.length > 0;
}

// Reorder blocks
router.post("/blocks/reorder", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthedReq).userId;
    const { blocks } = req.body as { blocks: Array<{ id: string; orderIndex: number; sectionId: string }> };
    for (const b of blocks) {
      if (!(await ownedBlock(b.id, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
      // Validate destination section ownership to prevent cross-project block moves
      if (!(await ownedSection(b.sectionId, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
      await db.update(blocksTable)
        .set({ orderIndex: b.orderIndex, sectionId: b.sectionId, updatedAt: new Date() })
        .where(eq(blocksTable.id, b.id));
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder blocks");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
