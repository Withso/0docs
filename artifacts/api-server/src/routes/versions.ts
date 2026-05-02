import { Router, Request, Response, NextFunction } from "express";
import { db, publishedVersionsTable, docVersionsTable, projectsTable, profilesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, desc, inArray } from "drizzle-orm";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);



async function requireProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const rows = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

async function requireDocVersionOwnership(docVersionId: string, userId: string): Promise<boolean> {
  const [version] = await db.select({ projectId: docVersionsTable.projectId }).from(docVersionsTable)
    .where(eq(docVersionsTable.id, docVersionId));
  if (!version) return false;
  return requireProjectOwnership(version.projectId, userId);
}

// GET /versions?projectId=...&limit=N — public for published projects, owner-only otherwise.
// Public callers receive metadata only (counts, publisher name); snapshots and internal
// notes/changelog are reserved for the project owner.
router.get("/versions", async (req: Request, res: Response) => {
  try {
    const projectId = req.query["projectId"] as string | undefined;
    const limit = req.query["limit"] as string | undefined;
    if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
    if (!isUuid(projectId)) { res.json([]); return; }

    const [project] = await db.select({
      userId: projectsTable.userId,
      publishedVersionId: projectsTable.publishedVersionId,
    }).from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    const isPublished = project.publishedVersionId != null;
    const userId = req.user?.id;
    const isOwner = userId != null && project.userId === userId;
    if (!isPublished && !isOwner) {
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const limitN = Math.min(parseInt(limit || "10", 10), 100);
    const versions = await db.select().from(publishedVersionsTable)
      .where(eq(publishedVersionsTable.projectId, projectId))
      .orderBy(desc(publishedVersionsTable.publishedAt))
      .limit(limitN);

    // Resolve publisher display names from profiles table
    const publisherIds = Array.from(new Set(
      versions.map((v) => v.publishedBy).filter((id): id is string => Boolean(id)),
    ));
    const profileMap = new Map<string, string>();
    if (publisherIds.length > 0) {
      const profiles = await db.select({
        id: profilesTable.id,
        displayName: profilesTable.displayName,
      }).from(profilesTable).where(inArray(profilesTable.id, publisherIds));
      for (const p of profiles) {
        if (p.displayName) profileMap.set(p.id, p.displayName);
      }
    }

    // Compute counts per version snapshot for the activity feed
    const enriched = versions.map((v) => {
      const pages = Array.isArray(v.pagesSnapshot) ? v.pagesSnapshot : [];
      const sections = Array.isArray(v.sectionsSnapshot) ? v.sectionsSnapshot : [];
      const blocks = Array.isArray(v.blocksSnapshot) ? v.blocksSnapshot : [];
      const publisherName = v.publishedBy ? (profileMap.get(v.publishedBy) ?? null) : null;
      const counts = {
        publisherName,
        pagesCount: pages.length,
        sectionsCount: sections.length,
        blocksCount: blocks.length,
      };
      if (isOwner) {
        return { ...v, ...counts };
      }
      // Public callers: metadata only, no snapshots / internal notes / changelog
      return {
        id: v.id,
        projectId: v.projectId,
        versionNumber: v.versionNumber,
        isActive: v.isActive,
        publishedAt: v.publishedAt,
        publishedBy: v.publishedBy,
        ...counts,
      };
    });
    res.json(enriched);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// GET /versions/:id — public for active version on published projects, owner-only otherwise
router.get("/versions/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) { res.status(404).json({ error: "Not found" }); return; }
    const [version] = await db.select().from(publishedVersionsTable).where(eq(publishedVersionsTable.id, id));
    if (!version) { res.status(404).json({ error: "Not found" }); return; }

    const [project] = await db.select({
      userId: projectsTable.userId,
      publishedVersionId: projectsTable.publishedVersionId,
    }).from(projectsTable).where(eq(projectsTable.id, version.projectId));
    if (!project) { res.status(404).json({ error: "Not found" }); return; }

    const isActivePublic = project.publishedVersionId === id && version.isActive;
    if (!isActivePublic) {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
      if (project.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    }

    res.json(version);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// GET /projects/:projectId/published-versions (auth + ownership)
router.get("/projects/:projectId/published-versions", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!(await requireProjectOwnership(projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const versions = await db.select().from(publishedVersionsTable)
        .where(eq(publishedVersionsTable.projectId, projectId))
        .orderBy(desc(publishedVersionsTable.publishedAt));

      const publisherIds = Array.from(new Set(
        versions.map((v) => v.publishedBy).filter((id): id is string => Boolean(id)),
      ));
      const profileMap = new Map<string, string>();
      if (publisherIds.length > 0) {
        const profiles = await db.select({
          id: profilesTable.id,
          displayName: profilesTable.displayName,
        }).from(profilesTable).where(inArray(profilesTable.id, publisherIds));
        for (const p of profiles) {
          if (p.displayName) profileMap.set(p.id, p.displayName);
        }
      }

      const enriched = versions.map((v) => ({
        ...v,
        publisherName: v.publishedBy ? (profileMap.get(v.publishedBy) ?? null) : null,
      }));
      res.json(enriched);
    } catch (err) {
      req.log.error({ err }, "Failed to list published versions");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// POST /projects/:projectId/published-versions (auth + ownership)
router.post("/projects/:projectId/published-versions", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      const [project] = await db.select().from(projectsTable)
        .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
      if (!project) { res.status(404).json({ error: "Not found" }); return; }

      const { versionNumber, pagesSnapshot, sectionsSnapshot, blocksSnapshot, designSnapshot,
        navGroupsSnapshot, editorChanges, designChanges, notes } = req.body;

      // Atomic: deactivate old, insert new, update project pointer in a single transaction
      const version = await db.transaction(async (tx) => {
        await tx.update(publishedVersionsTable).set({ isActive: false })
          .where(eq(publishedVersionsTable.projectId, projectId));

        const [v] = await tx.insert(publishedVersionsTable).values({
          projectId,
          versionNumber,
          isActive: true,
          publishedBy: userId,
          pagesSnapshot: pagesSnapshot ?? [],
          sectionsSnapshot: sectionsSnapshot ?? [],
          blocksSnapshot: blocksSnapshot ?? [],
          designSnapshot: designSnapshot ?? {},
          navGroupsSnapshot: navGroupsSnapshot ?? [],
          editorChanges: editorChanges ?? [],
          designChanges: designChanges ?? [],
          notes: notes ?? null,
        }).returning();

        await tx.update(projectsTable)
          .set({ publishedVersionId: v.id, updatedAt: new Date() })
          .where(eq(projectsTable.id, projectId));

        return v;
      });

      res.status(201).json(version);
    } catch (err) {
      req.log.error({ err }, "Failed to publish version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// POST /projects/:projectId/published-versions/:versionId/revert (auth + ownership)
router.post("/projects/:projectId/published-versions/:versionId/revert", requireAuth,
  async (req: Request<{ projectId: string; versionId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId, versionId } = req.params;
      if (!(await requireProjectOwnership(projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      // Verify the target version belongs to this project before reverting
      const [targetVersion] = await db
        .select({ id: publishedVersionsTable.id })
        .from(publishedVersionsTable)
        .where(and(eq(publishedVersionsTable.id, versionId), eq(publishedVersionsTable.projectId, projectId)));
      if (!targetVersion) { res.status(404).json({ error: "Not found" }); return; }

      // Atomic revert: deactivate all, activate target, update project pointer
      await db.transaction(async (tx) => {
        await tx.update(publishedVersionsTable).set({ isActive: false })
          .where(eq(publishedVersionsTable.projectId, projectId));
        await tx.update(publishedVersionsTable).set({ isActive: true })
          .where(and(eq(publishedVersionsTable.id, versionId), eq(publishedVersionsTable.projectId, projectId)));
        await tx.update(projectsTable)
          .set({ publishedVersionId: versionId, updatedAt: new Date() })
          .where(eq(projectsTable.id, projectId));
      });
      res.json({ ok: true });
    } catch (err) {
      req.log.error({ err }, "Failed to revert version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// GET /projects/:projectId/doc-versions — public for published projects, owner-only otherwise
router.get("/projects/:projectId/doc-versions",
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const { projectId } = req.params;
      if (!isUuid(projectId)) { res.json([]); return; }
      const [project] = await db.select({
        userId: projectsTable.userId,
        publishedVersionId: projectsTable.publishedVersionId,
      }).from(projectsTable).where(eq(projectsTable.id, projectId));
      if (!project) { res.status(404).json({ error: "Not found" }); return; }

      const isPublished = project.publishedVersionId != null;
      if (!isPublished) {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
        if (project.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
      }

      const versions = await db.select().from(docVersionsTable)
        .where(eq(docVersionsTable.projectId, projectId))
        .orderBy(desc(docVersionsTable.createdAt));
      res.json(versions);
    } catch (err) {
      req.log.error({ err }, "Failed to list doc versions");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// POST /projects/:projectId/doc-versions (auth + ownership)
router.post("/projects/:projectId/doc-versions", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!(await requireProjectOwnership(projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const { versionLabel, isDefault } = req.body as { versionLabel: string; isDefault?: boolean };
      const [version] = await db.insert(docVersionsTable).values({
        projectId, versionLabel, isDefault: isDefault ?? false,
      }).returning();
      res.status(201).json(version);
    } catch (err) {
      req.log.error({ err }, "Failed to create doc version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// POST /doc-versions/:id/set-default (auth + ownership)
router.post("/doc-versions/:id/set-default", requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      if (!(await requireDocVersionOwnership(id, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const [version] = await db.select().from(docVersionsTable).where(eq(docVersionsTable.id, id));
      if (!version) { res.status(404).json({ error: "Not found" }); return; }
      await db.update(docVersionsTable).set({ isDefault: false })
        .where(eq(docVersionsTable.projectId, version.projectId));
      await db.update(docVersionsTable).set({ isDefault: true }).where(eq(docVersionsTable.id, id));
      res.json({ ok: true });
    } catch (err) {
      req.log.error({ err }, "Failed to set default doc version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// DELETE /doc-versions/:id (auth + ownership)
router.delete("/doc-versions/:id", requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      if (!(await requireDocVersionOwnership(id, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      await db.delete(docVersionsTable).where(eq(docVersionsTable.id, id));
      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to delete doc version");
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
