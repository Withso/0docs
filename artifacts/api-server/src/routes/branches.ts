import { Router, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import {
  db, branchesTable, commitsTable,
  pagesTable, sectionsTable, blocksTable,
  navGroupsTable, tabsTable, projectDesignSettingsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { userOwnsProject, getDefaultBranchId, projectIdForBranch } from "../lib/branches";
import { snapshotBranch, diffSnapshots } from "../lib/commits";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

// List branches for a project
router.get("/projects/:projectId/branches", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!isUuid(projectId) || !(await userOwnsProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const rows = await db.select().from(branchesTable)
        .where(and(eq(branchesTable.projectId, projectId), isNull(branchesTable.deletedAt)))
        .orderBy(branchesTable.createdAt);
      res.json(rows);
    } catch (err) {
      req.log.error({ err }, "Failed to list branches");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Create a branch by deep-cloning content from a source branch (default = main).
// `bringChanges` is reserved for when an unsaved-edits flow exists; for now the
// new branch is always a clean fork of the chosen source branch.
router.post("/projects/:projectId/branches", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!isUuid(projectId) || !(await userOwnsProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const { name, sourceBranchId } = req.body as { name?: string; sourceBranchId?: string };
      const cleanName = (name || "").trim();
      if (!cleanName) { res.status(400).json({ error: "name required" }); return; }
      if (!/^[a-zA-Z0-9._/-]+$/.test(cleanName)) {
        res.status(400).json({ error: "name may only contain letters, numbers, '.', '_', '-', '/'" });
        return;
      }

      const srcId = (sourceBranchId && isUuid(sourceBranchId))
        ? sourceBranchId
        : await getDefaultBranchId(projectId);
      const [src] = await db.select().from(branchesTable)
        .where(and(eq(branchesTable.id, srcId), eq(branchesTable.projectId, projectId)));
      if (!src) { res.status(400).json({ error: "Invalid sourceBranchId" }); return; }

      // Uniqueness check (also enforced by unique index — this gives a nice 409)
      const [existing] = await db.select({ id: branchesTable.id }).from(branchesTable)
        .where(and(
          eq(branchesTable.projectId, projectId),
          eq(branchesTable.name, cleanName),
          isNull(branchesTable.deletedAt),
        ));
      if (existing) { res.status(409).json({ error: "branch already exists" }); return; }

      const newBranch = await db.transaction(async (tx) => {
        // 1) Read everything we need to clone in PARALLEL — these are
        //    independent SELECTs so awaiting them sequentially just burns
        //    Neon round-trip time. Sections/blocks depend on page IDs only
        //    for the IN-list; for branch isolation we can simply scope every
        //    select by branchId, no dependency at all.
        const [srcPages, srcNavGroups, srcTabs, srcDesign, srcSections, srcBlocks] = await Promise.all([
          tx.select().from(pagesTable)
            .where(and(eq(pagesTable.projectId, projectId), eq(pagesTable.branchId, srcId))),
          tx.select().from(navGroupsTable)
            .where(and(eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, srcId))),
          tx.select().from(tabsTable)
            .where(and(eq(tabsTable.projectId, projectId), eq(tabsTable.branchId, srcId))),
          tx.select().from(projectDesignSettingsTable)
            .where(and(
              eq(projectDesignSettingsTable.projectId, projectId),
              eq(projectDesignSettingsTable.branchId, srcId),
            )),
          tx.select().from(sectionsTable).where(eq(sectionsTable.branchId, srcId)),
          tx.select().from(blocksTable).where(eq(blocksTable.branchId, srcId)),
        ]);

        const branchId = randomUUID();

        // 2) Pre-generate UUIDs in JS for every cloned row so we can bulk
        //    insert (one network round-trip per table) instead of N
        //    insert-with-returning round-trips. Drizzle's columns have
        //    .defaultRandom() but supplying our own id is allowed.
        const tabIdMap = new Map(srcTabs.map(t => [t.id, randomUUID()]));
        const navIdMap = new Map(srcNavGroups.map(g => [g.id, randomUUID()]));
        const pageIdMap = new Map(srcPages.map(p => [p.id, randomUUID()]));
        const sectionIdMap = new Map(srcSections.map(s => [s.id, randomUUID()]));

        // Build insert payloads. Skip orphaned sections/blocks defensively.
        const newTabs = srcTabs.map(t => ({
          id: tabIdMap.get(t.id)!, projectId, branchId,
          label: t.label, icon: t.icon, orderIndex: t.orderIndex,
          metadata: t.metadata as object,
        }));
        const newNavGroups = srcNavGroups.map(g => ({
          id: navIdMap.get(g.id)!, projectId, branchId,
          title: g.title, type: g.type, orderIndex: g.orderIndex,
          tabId: g.tabId ? (tabIdMap.get(g.tabId) ?? null) : null,
          metadata: g.metadata as object,
        }));
        const newPages = srcPages.map(p => ({
          id: pageIdMap.get(p.id)!, projectId, branchId,
          title: p.title, slug: p.slug, orderIndex: p.orderIndex,
          metaDescription: p.metaDescription,
          navGroupId: p.navGroupId ? (navIdMap.get(p.navGroupId) ?? null) : null,
          navTitle: p.navTitle, versionId: p.versionId,
          metadata: p.metadata as object,
        }));
        const newSections = srcSections
          .filter(s => pageIdMap.has(s.pageId))
          .map(s => ({
            id: sectionIdMap.get(s.id)!, pageId: pageIdMap.get(s.pageId)!, branchId,
            title: s.title, navTitle: s.navTitle, orderIndex: s.orderIndex,
          }));
        const newBlocks = srcBlocks
          .filter(b => sectionIdMap.has(b.sectionId))
          .map(b => ({
            sectionId: sectionIdMap.get(b.sectionId)!, branchId,
            type: b.type, content: b.content as object, orderIndex: b.orderIndex,
          }));
        const newDesign = srcDesign.map(d => ({
          projectId, branchId, settings: d.settings as object,
        }));

        // 3) Reuse the source branch's HEAD commit snapshot for the initial
        //    fork commit when possible — the new branch is byte-identical to
        //    the source's HEAD at fork time, so re-snapshotting after the
        //    INSERTs would be wasteful work over the network. If the source
        //    has no commit yet (legacy projects), fall back to snapshotting.
        const [srcHead] = src.headCommitId
          ? await tx.select({ snap: commitsTable.contentSnapshot }).from(commitsTable)
              .where(eq(commitsTable.id, src.headCommitId)).limit(1)
          : [];

        const initialCommitId = randomUUID();

        // 4) Insert the branch row first (FK target for everything else),
        //    then bulk-insert all cloned content + the initial commit + the
        //    design settings IN PARALLEL. This collapses what used to be
        //    ~150 sequential round-trips into ~7.
        await tx.insert(branchesTable).values({
          id: branchId,
          projectId, name: cleanName, isDefault: false,
          parentBranchId: srcId, baseCommitId: src.headCommitId ?? null,
          headCommitId: initialCommitId,
          createdBy: userId,
        });

        const inserts: Promise<unknown>[] = [];
        if (newTabs.length) inserts.push(tx.insert(tabsTable).values(newTabs));
        if (newNavGroups.length) inserts.push(tx.insert(navGroupsTable).values(newNavGroups));
        if (newPages.length) inserts.push(tx.insert(pagesTable).values(newPages));
        if (newSections.length) inserts.push(tx.insert(sectionsTable).values(newSections));
        if (newBlocks.length) inserts.push(tx.insert(blocksTable).values(newBlocks));
        if (newDesign.length) inserts.push(tx.insert(projectDesignSettingsTable).values(newDesign));

        // Initial commit. Snapshot is identical to source HEAD; if the source
        // has no HEAD we synthesize an empty-diff commit (the snapshot is
        // computed lazily on the next editor write).
        const initialSnap = srcHead?.snap ?? await snapshotBranch(projectId, srcId);
        inserts.push(tx.insert(commitsTable).values({
          id: initialCommitId,
          projectId, branchId,
          parentCommitId: src.headCommitId ?? null,
          authorUserId: userId,
          message: `Branched from ${src.name}`,
          contentSnapshot: initialSnap,
          filesChanged: diffSnapshots(initialSnap as any, initialSnap as any),
          source: "manual",
        }));

        await Promise.all(inserts);

        const [created] = await tx.select().from(branchesTable).where(eq(branchesTable.id, branchId));
        return created;
      });

      res.status(201).json(newBranch);
    } catch (err) {
      req.log.error({ err }, "Failed to create branch");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Rename
router.patch("/branches/:id", requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      if (!isUuid(id)) { res.status(404).json({ error: "Not found" }); return; }
      const projectId = await projectIdForBranch(id);
      if (!projectId || !(await userOwnsProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const { name } = req.body as { name?: string };
      if (!name || !/^[a-zA-Z0-9._/-]+$/.test(name)) {
        res.status(400).json({ error: "invalid name" }); return;
      }
      const [b] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
      if (!b) { res.status(404).json({ error: "Not found" }); return; }
      if (b.isDefault) { res.status(400).json({ error: "cannot rename default branch" }); return; }
      const [updated] = await db.update(branchesTable)
        .set({ name: name.trim() })
        .where(eq(branchesTable.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to rename branch");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Soft-delete
router.delete("/branches/:id", requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      if (!isUuid(id)) { res.status(404).json({ error: "Not found" }); return; }
      const projectId = await projectIdForBranch(id);
      if (!projectId || !(await userOwnsProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const [b] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
      if (!b) { res.status(404).json({ error: "Not found" }); return; }
      if (b.isDefault) { res.status(400).json({ error: "cannot delete default branch" }); return; }
      // Rename on soft-delete so the (projectId, name) unique index stays
      // free for a future branch with the same name. Without this, recreating
      // a deleted branch name would throw a 500 from the DB unique violation.
      const tombstone = `${b.name}__deleted_${Date.now()}`;
      await db.update(branchesTable)
        .set({ deletedAt: new Date(), name: tombstone })
        .where(eq(branchesTable.id, id));
      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to delete branch");
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
