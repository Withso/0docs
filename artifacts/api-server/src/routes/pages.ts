import { Router, Request, Response, NextFunction } from "express";
import { db, pagesTable, projectsTable, sectionsTable, blocksTable, docVersionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);



async function ownedProject(projectId: string, userId: string) {
  const [p] = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return p ?? null;
}

// Confirms a doc version belongs to the given project — protects against
// clients smuggling another project's versionId into a page write.
async function versionBelongsToProject(versionId: string, projectId: string): Promise<boolean> {
  if (!isUuid(versionId)) return false;
  const [v] = await db.select({ id: docVersionsTable.id }).from(docVersionsTable)
    .where(and(eq(docVersionsTable.id, versionId), eq(docVersionsTable.projectId, projectId)));
  return !!v;
}

async function isProjectPublished(projectId: string): Promise<boolean> {
  const [p] = await db
    .select({ publishedVersionId: projectsTable.publishedVersionId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  return p?.publishedVersionId != null;
}

// GET /pages?projectId=...
// Public for published projects; requires auth + ownership for unpublished
router.get("/pages", async (req: Request, res: Response) => {
  try {
    const projectId = req.query["projectId"] as string | undefined;
    if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
    if (!isUuid(projectId)) { res.json([]); return; }

    // Check if project is published — if so, allow public read
    if (await isProjectPublished(projectId)) {
      const pages = await db.select().from(pagesTable)
        .where(eq(pagesTable.projectId, projectId))
        .orderBy(pagesTable.orderIndex);
      res.json(pages); return;
    }

    // Not published — require auth + ownership
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!(await ownedProject(projectId, userId))) { res.status(403).json({ error: "Forbidden" }); return; }
    const pages = await db.select().from(pagesTable)
      .where(eq(pagesTable.projectId, projectId))
      .orderBy(pagesTable.orderIndex);
    res.json(pages);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

// PATCH /pages/:id (flat path — used by PageSettingsPanel, SettingsSidePanel)
router.patch("/pages/:id", requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, id));
      if (!page) { res.status(404).json({ error: "Not found" }); return; }
      if (!(await ownedProject(page.projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const allowed = ["title", "slug", "orderIndex", "navGroupId", "navTitle", "metaDescription", "metadata", "versionId"] as const;
      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
      for (const k of allowed) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
      }
      // Coerce empty string to null + validate versionId belongs to the same project.
      if ("versionId" in updates && updates["versionId"] === "") updates["versionId"] = null;
      if (updates["versionId"] != null) {
        if (!(await versionBelongsToProject(updates["versionId"] as string, page.projectId))) {
          res.status(400).json({ error: "versionId does not belong to this project." });
          return;
        }
      }
      const [updated] = await db.update(pagesTable).set(updates).where(eq(pagesTable.id, id)).returning();
      res.json(updated);
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
    }
  });

// List pages for project (auth + ownership)
router.get("/projects/:projectId/pages", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const pages = await db.select().from(pagesTable)
        .where(eq(pagesTable.projectId, projectId))
        .orderBy(pagesTable.orderIndex);
      res.json(pages);
    } catch (err) {
      req.log.error({ err }, "Failed to list pages");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Create page
router.post("/projects/:projectId/pages", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const { title, slug, orderIndex, navGroupId, navTitle, metaDescription, versionId } = req.body as {
        title: string; slug: string; orderIndex?: number;
        navGroupId?: string; navTitle?: string; metaDescription?: string;
        versionId?: string | null;
      };
      // Coerce empty string to null and reject non-UUID / cross-project ids with 400
      // (otherwise Postgres would fail the insert and return an opaque 500).
      const cleanVersionId = versionId === "" ? null : versionId ?? null;
      if (cleanVersionId != null) {
        if (!(await versionBelongsToProject(cleanVersionId, projectId))) {
          res.status(400).json({ error: "versionId does not belong to this project." });
          return;
        }
      }
      const [page] = await db.insert(pagesTable).values({
        projectId, title, slug, orderIndex: orderIndex ?? 0,
        navGroupId: navGroupId ?? null, navTitle: navTitle ?? null,
        metaDescription: metaDescription ?? null,
        versionId: cleanVersionId,
      }).returning();
      res.status(201).json(page);
    } catch (err) {
      req.log.error({ err }, "Failed to create page");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Update page
router.patch("/projects/:projectId/pages/:pageId", requireAuth,
  async (req: Request<{ projectId: string; pageId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId, pageId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const allowed = ["title", "slug", "orderIndex", "navGroupId", "navTitle", "metaDescription", "metadata", "versionId"] as const;
      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
      for (const k of allowed) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
      }
      // Coerce empty string to null + validate versionId belongs to the same project.
      if ("versionId" in updates && updates["versionId"] === "") updates["versionId"] = null;
      if (updates["versionId"] != null) {
        if (!(await versionBelongsToProject(updates["versionId"] as string, projectId))) {
          res.status(400).json({ error: "versionId does not belong to this project." });
          return;
        }
      }
      // Scope update to both pageId AND projectId to prevent cross-project mutation
      const [page] = await db.update(pagesTable).set(updates)
        .where(and(eq(pagesTable.id, pageId), eq(pagesTable.projectId, projectId)))
        .returning();
      if (!page) { res.status(404).json({ error: "Not found" }); return; }
      res.json(page);
    } catch (err) {
      req.log.error({ err }, "Failed to update page");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Delete page
router.delete("/projects/:projectId/pages/:pageId", requireAuth,
  async (req: Request<{ projectId: string; pageId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId, pageId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      // Scope delete to both pageId AND projectId to prevent cross-project deletion
      await db.delete(pagesTable)
        .where(and(eq(pagesTable.id, pageId), eq(pagesTable.projectId, projectId)));
      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to delete page");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Bulk reorder pages
router.post("/projects/:projectId/pages/reorder", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const { pages } = req.body as {
        pages: Array<{ id: string; orderIndex: number; navGroupId?: string | null }>;
      };
      for (const p of pages) {
        // Scope each update to both page ID AND projectId to prevent cross-project mutation
        await db.update(pagesTable)
          .set({ orderIndex: p.orderIndex, navGroupId: p.navGroupId ?? null, updatedAt: new Date() })
          .where(and(eq(pagesTable.id, p.id), eq(pagesTable.projectId, projectId)));
      }
      res.json({ ok: true });
    } catch (err) {
      req.log.error({ err }, "Failed to reorder pages");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Get sections + blocks for a page (auth + project AND page ownership)
router.get("/projects/:projectId/pages/:pageId/content", requireAuth,
  async (req: Request<{ projectId: string; pageId: string }>, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId, pageId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const [page] = await db.select({ id: pagesTable.id }).from(pagesTable)
        .where(and(eq(pagesTable.id, pageId), eq(pagesTable.projectId, projectId)));
      if (!page) { res.status(404).json({ error: "Not found" }); return; }

      const sections = await db.select().from(sectionsTable)
        .where(eq(sectionsTable.pageId, pageId))
        .orderBy(sectionsTable.orderIndex);
      const blocks = sections.length > 0
        ? await db.select().from(blocksTable)
            .where(inArray(blocksTable.sectionId, sections.map(s => s.id)))
            .orderBy(blocksTable.orderIndex)
        : [];
      res.json({ sections, blocks });
    } catch (err) {
      req.log.error({ err }, "Failed to get page content");
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
