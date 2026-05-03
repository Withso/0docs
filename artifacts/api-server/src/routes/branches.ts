import { Router, Request, Response } from "express";
import {
  db, branchesTable,
  pagesTable, sectionsTable, blocksTable,
  navGroupsTable, tabsTable, projectDesignSettingsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { userOwnsProject, getDefaultBranchId, projectIdForBranch } from "../lib/branches";
import { recordCommit } from "../lib/commits";

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
        const [created] = await tx.insert(branchesTable).values({
          projectId, name: cleanName, isDefault: false,
          parentBranchId: srcId, baseCommitId: src.headCommitId ?? null,
          createdBy: userId,
        }).returning();

        // Deep clone everything. Maps oldId -> newId so foreign refs (page→nav,
        // section→page, block→section, navGroup→tab) stay consistent.
        const srcPages = await tx.select().from(pagesTable)
          .where(and(eq(pagesTable.projectId, projectId), eq(pagesTable.branchId, srcId)));
        const srcNavGroups = await tx.select().from(navGroupsTable)
          .where(and(eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, srcId)));
        const srcTabs = await tx.select().from(tabsTable)
          .where(and(eq(tabsTable.projectId, projectId), eq(tabsTable.branchId, srcId)));
        const srcDesign = await tx.select().from(projectDesignSettingsTable)
          .where(and(
            eq(projectDesignSettingsTable.projectId, projectId),
            eq(projectDesignSettingsTable.branchId, srcId),
          ));
        const srcSections = srcPages.length
          ? await tx.select().from(sectionsTable)
              .where(and(
                inArray(sectionsTable.pageId, srcPages.map(p => p.id)),
                eq(sectionsTable.branchId, srcId),
              ))
          : [];
        const srcBlocks = srcSections.length
          ? await tx.select().from(blocksTable)
              .where(and(
                inArray(blocksTable.sectionId, srcSections.map(s => s.id)),
                eq(blocksTable.branchId, srcId),
              ))
          : [];

        const tabIdMap = new Map<string, string>();
        for (const t of srcTabs) {
          const [n] = await tx.insert(tabsTable).values({
            projectId, branchId: created.id,
            label: t.label, icon: t.icon, orderIndex: t.orderIndex,
            metadata: t.metadata as object,
          }).returning({ id: tabsTable.id });
          tabIdMap.set(t.id, n.id);
        }
        const navIdMap = new Map<string, string>();
        for (const g of srcNavGroups) {
          const [n] = await tx.insert(navGroupsTable).values({
            projectId, branchId: created.id,
            title: g.title, type: g.type, orderIndex: g.orderIndex,
            tabId: g.tabId ? (tabIdMap.get(g.tabId) ?? null) : null,
            metadata: g.metadata as object,
          }).returning({ id: navGroupsTable.id });
          navIdMap.set(g.id, n.id);
        }
        const pageIdMap = new Map<string, string>();
        for (const p of srcPages) {
          const [n] = await tx.insert(pagesTable).values({
            projectId, branchId: created.id,
            title: p.title, slug: p.slug, orderIndex: p.orderIndex,
            metaDescription: p.metaDescription,
            navGroupId: p.navGroupId ? (navIdMap.get(p.navGroupId) ?? null) : null,
            navTitle: p.navTitle, versionId: p.versionId,
            metadata: p.metadata as object,
          }).returning({ id: pagesTable.id });
          pageIdMap.set(p.id, n.id);
        }
        const sectionIdMap = new Map<string, string>();
        for (const s of srcSections) {
          const newPageId = pageIdMap.get(s.pageId);
          if (!newPageId) continue;
          const [n] = await tx.insert(sectionsTable).values({
            pageId: newPageId, branchId: created.id,
            title: s.title, navTitle: s.navTitle, orderIndex: s.orderIndex,
          }).returning({ id: sectionsTable.id });
          sectionIdMap.set(s.id, n.id);
        }
        for (const b of srcBlocks) {
          const newSectionId = sectionIdMap.get(b.sectionId);
          if (!newSectionId) continue;
          await tx.insert(blocksTable).values({
            sectionId: newSectionId, branchId: created.id,
            type: b.type, content: b.content as object, orderIndex: b.orderIndex,
          });
        }
        for (const d of srcDesign) {
          await tx.insert(projectDesignSettingsTable).values({
            projectId, branchId: created.id,
            settings: d.settings as object,
          });
        }
        return created;
      });

      // Initial commit on the new branch — represents the fork point.
      await recordCommit({
        projectId, branchId: newBranch.id, authorUserId: userId,
        message: `Branched from ${src.name}`, source: "manual",
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
