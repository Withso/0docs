import { Router, Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, pagesTable, projectsTable, sectionsTable, blocksTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

type AuthedRequest = Request & { userId: string };

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as unknown as AuthedRequest).userId = userId;
  next();
}

async function ownedProject(projectId: string, userId: string) {
  const [p] = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  return p ?? null;
}

// GET /pages?projectId=... (flat, public-friendly)
router.get("/pages", async (req: Request, res: Response) => {
  try {
    const projectId = req.query["projectId"] as string | undefined;
    if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
    if (!isUuid(projectId)) { res.json([]); return; }
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
      const userId = (req as unknown as AuthedRequest).userId;
      const { id } = req.params;
      const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, id));
      if (!page) { res.status(404).json({ error: "Not found" }); return; }
      if (!(await ownedProject(page.projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const allowed = ["title", "slug", "orderIndex", "navGroupId", "navTitle", "metaDescription", "metadata"] as const;
      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
      for (const k of allowed) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
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
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const pages = await db.select().from(pagesTable)
        .where(eq(pagesTable.projectId, projectId))
        .orderBy(pagesTable.orderIndex);
      res.json(pages);
    } catch (err) {
      (req as any).log?.error({ err }, "Failed to list pages");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Create page (auth + ownership)
router.post("/projects/:projectId/pages", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const { title, slug, orderIndex, navGroupId, navTitle, metaDescription } = req.body as {
        title: string; slug: string; orderIndex?: number;
        navGroupId?: string; navTitle?: string; metaDescription?: string;
      };
      const [page] = await db.insert(pagesTable).values({
        projectId, title, slug, orderIndex: orderIndex ?? 0,
        navGroupId: navGroupId ?? null, navTitle: navTitle ?? null,
        metaDescription: metaDescription ?? null,
      }).returning();
      res.status(201).json(page);
    } catch (err) {
      (req as any).log?.error({ err }, "Failed to create page");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Update page (auth + ownership)
router.patch("/projects/:projectId/pages/:pageId", requireAuth,
  async (req: Request<{ projectId: string; pageId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId, pageId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const allowed = ["title", "slug", "orderIndex", "navGroupId", "navTitle", "metaDescription"] as const;
      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
      for (const k of allowed) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
      }
      const [page] = await db.update(pagesTable).set(updates).where(eq(pagesTable.id, pageId)).returning();
      res.json(page);
    } catch (err) {
      (req as any).log?.error({ err }, "Failed to update page");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Delete page (auth + ownership)
router.delete("/projects/:projectId/pages/:pageId", requireAuth,
  async (req: Request<{ projectId: string; pageId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId, pageId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      await db.delete(pagesTable).where(eq(pagesTable.id, pageId));
      res.status(204).send();
    } catch (err) {
      (req as any).log?.error({ err }, "Failed to delete page");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Bulk reorder pages (auth + ownership)
router.post("/projects/:projectId/pages/reorder", requireAuth,
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(404).json({ error: "Not found" }); return;
      }
      const { pages } = req.body as {
        pages: Array<{ id: string; orderIndex: number; navGroupId?: string | null }>;
      };
      for (const p of pages) {
        await db.update(pagesTable)
          .set({ orderIndex: p.orderIndex, navGroupId: p.navGroupId ?? null, updatedAt: new Date() })
          .where(eq(pagesTable.id, p.id));
      }
      res.json({ ok: true });
    } catch (err) {
      (req as any).log?.error({ err }, "Failed to reorder pages");
      res.status(500).json({ error: "Internal server error" });
    }
  });

// Get sections + blocks for a page (auth + project AND page ownership)
router.get("/projects/:projectId/pages/:pageId/content", requireAuth,
  async (req: Request<{ projectId: string; pageId: string }>, res: Response) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { projectId, pageId } = req.params;
      if (!(await ownedProject(projectId, userId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      // Verify the page actually belongs to this project (prevents cross-project leakage)
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
      (req as any).log?.error({ err }, "Failed to get page content");
      res.status(500).json({ error: "Internal server error" });
    }
  });

export default router;
