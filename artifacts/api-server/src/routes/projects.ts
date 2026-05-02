import { Router, Request, Response, NextFunction } from "express";
import { db, projectsTable, pagesTable, navGroupsTable, sectionsTable, blocksTable, projectDesignSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, desc, ne, isNotNull } from "drizzle-orm";
import dns from "node:dns/promises";

const router = Router();

// DNS targets that a custom domain must point to in order to verify.
// Apex domains (example.com) need an A record; subdomains need a CNAME.
const EXPECTED_CNAME_TARGET = "cname.0docs.app";
const EXPECTED_A_TARGET = "76.76.21.21";

const DOMAIN_RE = /^(?!-)(?:[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,}$/;
function normalizeDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!trimmed) return null;
  return DOMAIN_RE.test(trimmed) ? trimmed : null;
}



// List projects (authenticated) or homepage project (public) or by custom domain (public)
router.get("/projects", async (req: Request, res: Response) => {
  try {
    const homepage = req.query["homepage"] as string | undefined;
    const domain = req.query["domain"] as string | undefined;
    if (homepage === "true") {
      const projects = await db.select().from(projectsTable)
        .where(eq(projectsTable.isHomepage, true))
        .limit(1);
      res.json(projects); return;
    }
    if (domain) {
      // Public lookup: only return projects whose custom domain is verified
      const norm = normalizeDomain(domain);
      if (!norm) { res.json([]); return; }
      const projects = await db.select().from(projectsTable)
        .where(and(
          eq(projectsTable.customDomain, norm),
          eq(projectsTable.customDomainStatus, "verified"),
        ))
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
    const projectId = req.params.id;

    const [existing] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const allowed = [
      "name", "slug", "description", "isHomepage", "customDomain", "publishedVersionId",
    ] as const;
    const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    // Custom domain handling: normalize, dedupe, reset verification status when changed
    if ("customDomain" in updates) {
      const raw = updates["customDomain"];
      if (raw === null || raw === "") {
        updates["customDomain"] = null;
        updates["customDomainStatus"] = null;
        updates["customDomainVerifiedAt"] = null;
        updates["customDomainLastCheckedAt"] = null;
        updates["customDomainLastError"] = null;
      } else {
        const norm = normalizeDomain(raw);
        if (!norm) {
          res.status(400).json({ error: "Invalid domain. Use a format like docs.example.com (no protocol or path)." });
          return;
        }
        updates["customDomain"] = norm;
        // Only reset verification fields if the domain actually changed
        if (norm !== existing.customDomain) {
          // Check uniqueness against other projects
          const [conflict] = await db.select({ id: projectsTable.id }).from(projectsTable)
            .where(and(eq(projectsTable.customDomain, norm), ne(projectsTable.id, projectId)))
            .limit(1);
          if (conflict) {
            res.status(409).json({ error: "This domain is already connected to another project." });
            return;
          }
          updates["customDomainStatus"] = "pending";
          updates["customDomainVerifiedAt"] = null;
          updates["customDomainLastCheckedAt"] = null;
          updates["customDomainLastError"] = null;
        }
      }
    }

    const [project] = await db.update(projectsTable)
      .set(updates)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
      .returning();
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    res.json(project);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "This domain is already connected to another project." });
      return;
    }
    req.log.error({ err }, "Failed to update project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify the project's custom domain by performing a live DNS lookup.
// Apex domains must resolve to EXPECTED_A_TARGET; subdomains must CNAME to EXPECTED_CNAME_TARGET.
router.post("/projects/:id/verify-domain", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    if (!project.customDomain) {
      res.status(400).json({ error: "No custom domain set for this project." });
      return;
    }

    const domain = project.customDomain;
    const isApex = domain.split(".").length === 2;
    const checkedAt = new Date();
    let status: "verified" | "failed" = "failed";
    let lastError: string | null = null;

    try {
      if (isApex) {
        const records = await dns.resolve4(domain);
        if (records.includes(EXPECTED_A_TARGET)) {
          status = "verified";
        } else {
          lastError = `A record for ${domain} is ${records.join(", ") || "(none)"}, expected ${EXPECTED_A_TARGET}.`;
        }
      } else {
        // Subdomain: prefer CNAME but accept A as fallback.
        try {
          const records = await dns.resolveCname(domain);
          const matches = records.some((r) => r.replace(/\.$/, "").toLowerCase() === EXPECTED_CNAME_TARGET);
          if (matches) {
            status = "verified";
          } else {
            lastError = `CNAME for ${domain} is ${records.join(", ") || "(none)"}, expected ${EXPECTED_CNAME_TARGET}.`;
          }
        } catch (cnameErr: any) {
          // No CNAME — try A records
          try {
            const aRecords = await dns.resolve4(domain);
            if (aRecords.includes(EXPECTED_A_TARGET)) {
              status = "verified";
            } else {
              lastError = `No CNAME found and A record is ${aRecords.join(", ")}, expected CNAME ${EXPECTED_CNAME_TARGET} or A ${EXPECTED_A_TARGET}.`;
            }
          } catch (aErr: any) {
            lastError = `DNS lookup failed: ${cnameErr?.code || cnameErr?.message || "no record"}.`;
          }
        }
      }
    } catch (err: any) {
      lastError = `DNS lookup failed: ${err?.code || err?.message || "unknown error"}.`;
    }

    // Conditional update: only persist if the customDomain hasn't changed since
    // we read it. This prevents a stale verification from clobbering a domain
    // the user just edited mid-flight.
    const [updated] = await db.update(projectsTable)
      .set({
        customDomainStatus: status,
        customDomainVerifiedAt: status === "verified" ? checkedAt : null,
        customDomainLastCheckedAt: checkedAt,
        customDomainLastError: lastError,
        updatedAt: checkedAt,
      })
      .where(and(
        eq(projectsTable.id, projectId),
        eq(projectsTable.customDomain, domain),
      ))
      .returning();
    if (!updated) {
      // Domain was changed during the DNS lookup — fetch the fresh row and
      // tell the client the verification result was discarded.
      const [fresh] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
      res.status(409).json({
        error: "Domain changed during verification — please retry.",
        project: fresh,
      });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to verify domain");
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
