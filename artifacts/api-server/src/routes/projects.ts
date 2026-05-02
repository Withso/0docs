import { Router, Request, Response, NextFunction } from "express";
import { db, projectsTable, pagesTable, navGroupsTable, sectionsTable, blocksTable, projectDesignSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, desc } from "drizzle-orm";

const router = Router();



// List projects (authenticated) or homepage project (public)
router.get("/projects", async (req: Request, res: Response) => {
  try {
    const homepage = req.query["homepage"] as string | undefined;
    if (homepage === "true") {
      const projects = await db.select().from(projectsTable)
        .where(eq(projectsTable.isHomepage, true))
        .limit(1);
      res.json(projects); return;
    }
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const projects = await db.select().from(projectsTable)
      .where(eq(projectsTable.userId, userId))
      .orderBy(desc(projectsTable.updatedAt));
    res.json(projects);
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get project by id
router.get("/projects/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, req.params.id), eq(projectsTable.userId, userId)));
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    res.json(project);
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create project
router.post("/projects", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, slug, description } = req.body as { name: string; slug: string; description?: string };
    const [project] = await db.insert(projectsTable)
      .values({ name, slug, description, userId })
      .returning();
    await db.insert(pagesTable).values({
      projectId: project.id, title: "Introduction", slug: "introduction", orderIndex: 0,
    });
    res.status(201).json(project);
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update project
router.patch("/projects/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    const [project] = await db.update(projectsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(projectsTable.id, req.params.id), eq(projectsTable.userId, userId)))
      .returning();
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    res.json(project);
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete project
router.delete("/projects/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    await db.delete(projectsTable)
      .where(and(eq(projectsTable.id, req.params.id), eq(projectsTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Duplicate project
router.post("/projects/:id/duplicate", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    const [src] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, req.params.id), eq(projectsTable.userId, userId)));
    if (!src) { res.status(404).json({ error: "Not found" }); return; }

    const newSlug = `${src.slug}-copy-${Date.now().toString(36)}`;
    const [newProject] = await db.insert(projectsTable).values({
      name: `${src.name} (Copy)`, slug: newSlug, description: src.description, userId,
    }).returning();

    const srcGroups = await db.select().from(navGroupsTable)
      .where(eq(navGroupsTable.projectId, src.id))
      .orderBy(navGroupsTable.orderIndex);
    const groupIdMap = new Map<string, string>();
    for (const g of srcGroups) {
      const [newG] = await db.insert(navGroupsTable).values({
        projectId: newProject.id, title: g.title, orderIndex: g.orderIndex, type: g.type,
      }).returning();
      groupIdMap.set(g.id, newG.id);
    }

    const srcPages = await db.select().from(pagesTable)
      .where(eq(pagesTable.projectId, src.id))
      .orderBy(pagesTable.orderIndex);
    for (const page of srcPages) {
      const newNavGroupId = page.navGroupId ? groupIdMap.get(page.navGroupId) ?? null : null;
      const [newPage] = await db.insert(pagesTable).values({
        projectId: newProject.id, title: page.title, slug: page.slug,
        orderIndex: page.orderIndex, navGroupId: newNavGroupId,
        navTitle: page.navTitle, metaDescription: page.metaDescription,
      }).returning();
      const srcSections = await db.select().from(sectionsTable)
        .where(eq(sectionsTable.pageId, page.id))
        .orderBy(sectionsTable.orderIndex);
      for (const sec of srcSections) {
        const [newSec] = await db.insert(sectionsTable).values({
          pageId: newPage.id, title: sec.title, orderIndex: sec.orderIndex, navTitle: sec.navTitle,
        }).returning();
        const srcBlocks = await db.select().from(blocksTable)
          .where(eq(blocksTable.sectionId, sec.id))
          .orderBy(blocksTable.orderIndex);
        for (const blk of srcBlocks) {
          await db.insert(blocksTable).values({
            sectionId: newSec.id, type: blk.type, content: blk.content, orderIndex: blk.orderIndex,
          });
        }
      }
    }

    const [srcDesign] = await db.select().from(projectDesignSettingsTable)
      .where(eq(projectDesignSettingsTable.projectId, src.id));
    if (srcDesign) {
      await db.insert(projectDesignSettingsTable)
        .values({ projectId: newProject.id, settings: srcDesign.settings });
    }

    res.status(201).json(newProject);
  } catch (err) {
    req.log.error({ err }, "Failed to duplicate project");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
