import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, publishedVersionsTable, docVersionsTable, projectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

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

// GET /versions?projectId=...&limit=N — list published versions by project (used by activity.ts)
router.get("/versions", async (req: any, res) => {
  try {
    const { projectId, limit } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!isUuid(projectId)) return res.json([]);
    const limitN = Math.min(parseInt(limit || "10", 10), 100);
    const versions = await db.select().from(publishedVersionsTable)
      .where(eq(publishedVersionsTable.projectId, projectId))
      .orderBy(desc(publishedVersionsTable.publishedAt))
      .limit(limitN);
    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /versions/:id — fetch a specific published version by id (public, used by Index.tsx for homepage)
router.get("/versions/:id", async (req: any, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: "Not found" });
    const [version] = await db.select().from(publishedVersionsTable).where(eq(publishedVersionsTable.id, req.params.id));
    if (!version) return res.status(404).json({ error: "Not found" });
    res.json(version);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List published versions
router.get("/projects/:projectId/published-versions", requireAuth, async (req: any, res) => {
  try {
    const versions = await db.select().from(publishedVersionsTable)
      .where(eq(publishedVersionsTable.projectId, req.params.projectId))
      .orderBy(desc(publishedVersionsTable.publishedAt));
    res.json(versions);
  } catch (err) {
    req.log.error({ err }, "Failed to list published versions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Publish version
router.post("/projects/:projectId/published-versions", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });

    // Deactivate previous
    await db.update(publishedVersionsTable).set({ isActive: false }).where(eq(publishedVersionsTable.projectId, req.params.projectId));

    const { versionNumber, pagesSnapshot, sectionsSnapshot, blocksSnapshot, designSnapshot, navGroupsSnapshot, editorChanges, designChanges, notes } = req.body;
    const [version] = await db.insert(publishedVersionsTable).values({
      projectId: req.params.projectId,
      versionNumber,
      isActive: true,
      publishedBy: req.userId,
      pagesSnapshot: pagesSnapshot ?? [],
      sectionsSnapshot: sectionsSnapshot ?? [],
      blocksSnapshot: blocksSnapshot ?? [],
      designSnapshot: designSnapshot ?? {},
      navGroupsSnapshot: navGroupsSnapshot ?? [],
      editorChanges: editorChanges ?? [],
      designChanges: designChanges ?? [],
      notes: notes ?? null,
    }).returning();

    // Update project's published_version_id
    await db.update(projectsTable).set({ publishedVersionId: version.id, updatedAt: new Date() }).where(eq(projectsTable.id, req.params.projectId));

    res.status(201).json(version);
  } catch (err) {
    req.log.error({ err }, "Failed to publish version");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Revert to version
router.post("/projects/:projectId/published-versions/:versionId/revert", requireAuth, async (req: any, res) => {
  try {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, req.params.projectId), eq(projectsTable.userId, req.userId)));
    if (!project) return res.status(404).json({ error: "Not found" });

    await db.update(publishedVersionsTable).set({ isActive: false }).where(eq(publishedVersionsTable.projectId, req.params.projectId));
    await db.update(publishedVersionsTable).set({ isActive: true }).where(eq(publishedVersionsTable.id, req.params.versionId));
    await db.update(projectsTable).set({ publishedVersionId: req.params.versionId, updatedAt: new Date() }).where(eq(projectsTable.id, req.params.projectId));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to revert version");
    res.status(500).json({ error: "Internal server error" });
  }
});

// List doc versions
router.get("/projects/:projectId/doc-versions", requireAuth, async (req: any, res) => {
  try {
    const versions = await db.select().from(docVersionsTable).where(eq(docVersionsTable.projectId, req.params.projectId)).orderBy(desc(docVersionsTable.createdAt));
    res.json(versions);
  } catch (err) {
    req.log.error({ err }, "Failed to list doc versions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create doc version
router.post("/projects/:projectId/doc-versions", requireAuth, async (req: any, res) => {
  try {
    const { versionLabel, isDefault } = req.body;
    const [version] = await db.insert(docVersionsTable).values({
      projectId: req.params.projectId, versionLabel, isDefault: isDefault ?? false,
    }).returning();
    res.status(201).json(version);
  } catch (err) {
    req.log.error({ err }, "Failed to create doc version");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Set doc version as default
router.post("/doc-versions/:id/set-default", requireAuth, async (req: any, res) => {
  try {
    const [version] = await db.select().from(docVersionsTable).where(eq(docVersionsTable.id, req.params.id));
    if (!version) return res.status(404).json({ error: "Not found" });
    await db.update(docVersionsTable).set({ isDefault: false }).where(eq(docVersionsTable.projectId, version.projectId));
    await db.update(docVersionsTable).set({ isDefault: true }).where(eq(docVersionsTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to set default doc version");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete doc version
router.delete("/doc-versions/:id", requireAuth, async (req: any, res) => {
  try {
    await db.delete(docVersionsTable).where(eq(docVersionsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete doc version");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
