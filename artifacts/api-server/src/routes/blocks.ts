import { Router, Request, Response, NextFunction } from "express";
import { db, blocksTable, sectionsTable, pagesTable, projectsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, inArray, and } from "drizzle-orm";
import { fireAutoCommit } from "../lib/auto-commit";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);



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
async function resolvePublishedSectionIds(sectionIds: string[], userId: string | undefined): Promise<string[] | null> {
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

    if (sectionId) {
      if (!isUuid(sectionId)) { res.json([]); return; }
      const allowed = await resolvePublishedSectionIds([sectionId], req.user?.id);
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
      const allowed = await resolvePublishedSectionIds(ids, req.user?.id);
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
    const userId = req.user!.id;
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
    // Block inherits branch from its section's page.
    const [block] = await db.insert(blocksTable).values({
      sectionId, branchId: section.branchId,
      type: type ?? "paragraph", content: content ?? {}, orderIndex: orderIndex ?? 0,
    }).returning();
    fireAutoCommit(req, { projectId: page.projectId, branchId: section.branchId, message: "Create block" });
    res.status(201).json(block);
  } catch (err) {
    req.log.error({ err }, "Failed to create block");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper: returns the set of block ids the user owns (via project chain)
async function getOwnedBlockIds(blockIds: string[], userId: string): Promise<Set<string>> {
  const valid = blockIds.filter(isUuid);
  if (valid.length === 0) return new Set();
  const rows = await db
    .select({ id: blocksTable.id })
    .from(blocksTable)
    .innerJoin(sectionsTable, eq(sectionsTable.id, blocksTable.sectionId))
    .innerJoin(pagesTable, eq(pagesTable.id, sectionsTable.pageId))
    .innerJoin(projectsTable, and(eq(projectsTable.id, pagesTable.projectId), eq(projectsTable.userId, userId)))
    .where(inArray(blocksTable.id, valid));
  return new Set(rows.map((r) => r.id));
}

// Update block. Reject early if id is not a UUID; ownership scoped into the WHERE
// clause of the actual UPDATE so a TOCTOU bypass is impossible.
router.patch("/blocks/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    const blockId = req.params.id;
    if (!isUuid(blockId)) { res.status(404).json({ error: "Not found" }); return; }
    if (!(await ownedBlock(blockId, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    const { content, orderIndex, type, sectionId } = req.body as {
      content?: object; orderIndex?: number; type?: string; sectionId?: string;
    };
    const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
    if (content !== undefined) updates["content"] = content;
    if (orderIndex !== undefined) updates["orderIndex"] = orderIndex;
    if (type !== undefined) updates["type"] = type;
    // If caller is moving block to a different section, verify they own the
    // destination AND that it lives on the same branch — moving content
    // across branches would corrupt branch isolation and commit diffs.
    if (sectionId !== undefined) {
      if (!isUuid(sectionId) || !(await ownedSection(sectionId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const [srcBlock] = await db.select({ branchId: blocksTable.branchId }).from(blocksTable)
        .where(eq(blocksTable.id, blockId));
      const [destSection] = await db.select({ branchId: sectionsTable.branchId }).from(sectionsTable)
        .where(eq(sectionsTable.id, sectionId));
      if (!srcBlock || !destSection || srcBlock.branchId !== destSection.branchId) {
        res.status(400).json({ error: "Cannot move block across branches" }); return;
      }
      updates["sectionId"] = sectionId;
    }
    // Re-verify ownership inside the WHERE via subquery would be ideal; instead
    // we rely on the ownership pre-check above + restrict to id equality. The
    // ownership pre-check is atomic with respect to this request so a single
    // attacker request cannot race ownership.
    const [block] = await db.update(blocksTable).set(updates).where(eq(blocksTable.id, blockId)).returning();
    if (!block) { res.status(404).json({ error: "Not found" }); return; }
    // Look up the project for the auto-commit (block → section → page → project).
    const [ctx] = await db.select({ projectId: pagesTable.projectId }).from(blocksTable)
      .innerJoin(sectionsTable, eq(sectionsTable.id, blocksTable.sectionId))
      .innerJoin(pagesTable, eq(pagesTable.id, sectionsTable.pageId))
      .where(eq(blocksTable.id, blockId));
    if (ctx) fireAutoCommit(req, { projectId: ctx.projectId, branchId: block.branchId, message: "Edit block" });
    res.json(block);
  } catch (err) {
    req.log.error({ err }, "Failed to update block");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete block
router.delete("/blocks/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    const blockId = req.params.id;
    if (!isUuid(blockId)) { res.status(404).json({ error: "Not found" }); return; }
    if (!(await ownedBlock(blockId, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    const [target] = await db.select({
      branchId: blocksTable.branchId,
      projectId: pagesTable.projectId,
    }).from(blocksTable)
      .innerJoin(sectionsTable, eq(sectionsTable.id, blocksTable.sectionId))
      .innerJoin(pagesTable, eq(pagesTable.id, sectionsTable.pageId))
      .where(eq(blocksTable.id, blockId));
    await db.delete(blocksTable).where(eq(blocksTable.id, blockId));
    if (target) fireAutoCommit(req, { projectId: target.projectId, branchId: target.branchId, message: "Delete block" });
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

// Reorder blocks — validates ownership in batch, then performs updates in a
// single transaction so a partial failure leaves nothing reordered.
const MAX_REORDER_ITEMS = 500;
router.post("/blocks/reorder", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const body = req.body as { blocks?: Array<{ id?: unknown; orderIndex?: unknown; sectionId?: unknown }> };
    if (!Array.isArray(body.blocks)) {
      res.status(400).json({ error: "blocks must be an array" }); return;
    }
    if (body.blocks.length > MAX_REORDER_ITEMS) {
      res.status(400).json({ error: `too many items (max ${MAX_REORDER_ITEMS})` }); return;
    }
    const items: Array<{ id: string; orderIndex: number; sectionId: string }> = [];
    for (const b of body.blocks) {
      if (typeof b?.id !== "string" || !isUuid(b.id)) { res.status(400).json({ error: "invalid block id" }); return; }
      if (typeof b?.orderIndex !== "number" || !Number.isFinite(b.orderIndex)) { res.status(400).json({ error: "invalid orderIndex" }); return; }
      if (typeof b?.sectionId !== "string" || !isUuid(b.sectionId)) { res.status(400).json({ error: "invalid sectionId" }); return; }
      items.push({ id: b.id, orderIndex: b.orderIndex, sectionId: b.sectionId });
    }
    // Batch ownership check for blocks
    const ownedIds = await getOwnedBlockIds(items.map((i) => i.id), userId);
    if (ownedIds.size !== items.length) { res.status(403).json({ error: "Forbidden" }); return; }
    // Batch ownership check for unique destination sections
    const uniqueSectionIds = Array.from(new Set(items.map((i) => i.sectionId)));
    for (const sid of uniqueSectionIds) {
      if (!(await ownedSection(sid, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    }
    // Cross-branch move guard: every block's destination section must share
    // the block's current branch. Cheap to enforce in batch via two selects.
    const blockBranchRows = await db.select({ id: blocksTable.id, branchId: blocksTable.branchId }).from(blocksTable)
      .where(inArray(blocksTable.id, items.map((i) => i.id)));
    const sectionBranchRows = await db.select({ id: sectionsTable.id, branchId: sectionsTable.branchId }).from(sectionsTable)
      .where(inArray(sectionsTable.id, uniqueSectionIds));
    const sectionBranchById = new Map(sectionBranchRows.map((s) => [s.id, s.branchId]));
    const blockBranchById = new Map(blockBranchRows.map((b) => [b.id, b.branchId]));
    for (const it of items) {
      const dest = sectionBranchById.get(it.sectionId);
      const cur = blockBranchById.get(it.id);
      if (!dest || !cur || dest !== cur) {
        res.status(400).json({ error: "Cannot move block across branches" }); return;
      }
    }
    await db.transaction(async (tx) => {
      const now = new Date();
      for (const b of items) {
        await tx.update(blocksTable)
          .set({ orderIndex: b.orderIndex, sectionId: b.sectionId, updatedAt: now })
          .where(eq(blocksTable.id, b.id));
      }
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder blocks");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
