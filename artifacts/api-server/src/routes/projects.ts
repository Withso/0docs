import { Router, Request, Response, NextFunction } from "express";
import { db, projectsTable, pagesTable, navGroupsTable, sectionsTable, blocksTable, projectDesignSettingsTable, branchesTable, tabsTable } from "@workspace/db";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, desc, ne, inArray } from "drizzle-orm";
import dns from "node:dns/promises";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

// DNS targets that a custom domain must point to in order to verify.
// Apex domains (example.com) need an A record; subdomains need a CNAME.
const EXPECTED_CNAME_TARGET = "cname.0docs.app";
const EXPECTED_A_TARGET = "76.76.21.21";

// Linear-time domain validation: cap input length and validate label-by-label
// instead of a single backtracking regex (the previous regex was flagged as
// ReDoS-vulnerable by SAST due to the `(?<!-)` lookbehind interacting with the
// `+` quantifier on label group).
const MAX_DOMAIN_LEN = 253;
const LABEL_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const TLD_RE = /^[a-zA-Z]{2,63}$/;
function isValidDomain(s: string): boolean {
  if (s.length === 0 || s.length > MAX_DOMAIN_LEN) return false;
  const labels = s.split(".");
  if (labels.length < 2) return false;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (i === labels.length - 1) {
      if (!TLD_RE.test(label)) return false;
    } else {
      if (!LABEL_RE.test(label)) return false;
    }
  }
  return true;
}
function normalizeDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // Cap input length defensively before doing any regex work.
  if (input.length > 2048) return null;
  const trimmed = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!trimmed) return null;
  return isValidDomain(trimmed) ? trimmed : null;
}



// List projects (authenticated) or homepage project (public) or by custom
// domain (public) or by slug (public — drives the default subpath publishing
// route at <host>/p/:slug).
router.get("/projects", async (req: Request, res: Response) => {
  try {
    const homepage = req.query["homepage"] as string | undefined;
    const domain = req.query["domain"] as string | undefined;
    const slug = req.query["slug"] as string | undefined;
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
    if (slug) {
      // Public slug lookup. We don't require a published version here — the
      // page renderer falls back to live content when no snapshot exists, so
      // unpublished projects still resolve (useful for previewing). Slug must
      // pass the same validation as on create to prevent path-traversal-style
      // probes hitting the DB with weird payloads.
      if (typeof slug !== "string" || !SLUG_RE.test(slug) || slug.length > MAX_PROJECT_SLUG_LEN) {
        res.json([]); return;
      }
      const projects = await db.select().from(projectsTable)
        .where(eq(projectsTable.slug, slug))
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
    if (!isUuid(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
    const [project] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, req.params.id), eq(projectsTable.userId, userId)));
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    res.json(project);
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create project — validates required fields up-front so we don't hit DB constraint errors.
const MAX_PROJECT_NAME_LEN = 200;
const MAX_PROJECT_SLUG_LEN = 80;
const MAX_PROJECT_DESC_LEN = 2000;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
router.post("/projects", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, slug, description } = req.body as { name?: unknown; slug?: unknown; description?: unknown };
    if (typeof name !== "string" || !name.trim() || name.length > MAX_PROJECT_NAME_LEN) {
      res.status(400).json({ error: "name is required (1-200 chars)" }); return;
    }
    if (typeof slug !== "string" || !SLUG_RE.test(slug) || slug.length > MAX_PROJECT_SLUG_LEN) {
      res.status(400).json({ error: "slug must be lowercase alphanumeric with hyphens (1-80 chars)" }); return;
    }
    if (description != null && (typeof description !== "string" || description.length > MAX_PROJECT_DESC_LEN)) {
      res.status(400).json({ error: "description must be a string up to 2000 chars" }); return;
    }
    const cleanName = name.trim();
    const cleanDesc = typeof description === "string" ? description : undefined;
    // Enforce slug uniqueness at the app level — slug drives the public
    // /p/:slug URL, so a collision would silently shadow another project.
    const [slugConflict] = await db.select({ id: projectsTable.id }).from(projectsTable)
      .where(eq(projectsTable.slug, slug))
      .limit(1);
    if (slugConflict) {
      res.status(409).json({ error: "This slug is already taken. Try another." });
      return;
    }
    let project;
    try {
      project = await db.transaction(async (tx) => {
        const [created] = await tx.insert(projectsTable)
          .values({ name: cleanName, slug, description: cleanDesc, userId })
          .returning();
        // Every project needs a default "main" branch — schema makes branchId
        // NOT NULL on every content row. Bootstrap branch + first page in the
        // same tx so a partial failure rolls back cleanly.
        const branchId = randomUUID();
        await tx.insert(branchesTable).values({
          id: branchId, projectId: created.id, name: "main",
          isDefault: true, createdBy: userId,
        });
        await tx.insert(pagesTable).values({
          projectId: created.id, branchId,
          title: "Introduction", slug: "introduction", orderIndex: 0,
        });
        return created;
      });
    } catch (err: any) {
      // 23505 = unique_violation. Race-safe fallback for the slug check above.
      if (err?.code === "23505") {
        res.status(409).json({ error: "This slug is already taken. Try another." });
        return;
      }
      throw err;
    }
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
    if (!isUuid(projectId)) { res.status(404).json({ error: "Not found" }); return; }

    const [existing] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    // Per-field type validation — replaces blind body-spread to prevent type
    // confusion attacks (e.g. boolean isHomepage smuggled as a string).
    const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
    const body = req.body as Record<string, unknown>;
    if (body["name"] !== undefined) {
      if (typeof body["name"] !== "string" || !body["name"].trim() || body["name"].length > MAX_PROJECT_NAME_LEN) {
        res.status(400).json({ error: "name must be a non-empty string up to 200 chars" }); return;
      }
      updates["name"] = (body["name"] as string).trim();
    }
    if (body["slug"] !== undefined) {
      if (typeof body["slug"] !== "string" || !SLUG_RE.test(body["slug"]) || body["slug"].length > MAX_PROJECT_SLUG_LEN) {
        res.status(400).json({ error: "slug must be lowercase alphanumeric with hyphens" }); return;
      }
      const newSlug = body["slug"] as string;
      if (newSlug !== existing.slug) {
        const [slugConflict] = await db.select({ id: projectsTable.id }).from(projectsTable)
          .where(and(eq(projectsTable.slug, newSlug), ne(projectsTable.id, projectId)))
          .limit(1);
        if (slugConflict) {
          res.status(409).json({ error: "This slug is already taken. Try another." });
          return;
        }
      }
      updates["slug"] = newSlug;
    }
    if (body["description"] !== undefined) {
      if (body["description"] !== null && (typeof body["description"] !== "string" || (body["description"] as string).length > MAX_PROJECT_DESC_LEN)) {
        res.status(400).json({ error: "description must be a string up to 2000 chars" }); return;
      }
      updates["description"] = body["description"];
    }
    if (body["isHomepage"] !== undefined) {
      if (typeof body["isHomepage"] !== "boolean") {
        res.status(400).json({ error: "isHomepage must be a boolean" }); return;
      }
      updates["isHomepage"] = body["isHomepage"];
    }
    if (body["publishedVersionId"] !== undefined) {
      if (body["publishedVersionId"] !== null && (typeof body["publishedVersionId"] !== "string" || !isUuid(body["publishedVersionId"] as string))) {
        res.status(400).json({ error: "publishedVersionId must be a UUID or null" }); return;
      }
      updates["publishedVersionId"] = body["publishedVersionId"];
    }
    if (body["customDomain"] !== undefined) {
      updates["customDomain"] = body["customDomain"];
    }
    // Optional base path (e.g. "/docs"). Allowed: null, "", or "/" + 1-30
    // url-safe chars. Stored normalized: leading slash, no trailing slash.
    if (body["customDomainBasePath"] !== undefined) {
      const raw = body["customDomainBasePath"];
      if (raw === null || raw === "") {
        updates["customDomainBasePath"] = null;
      } else if (typeof raw !== "string") {
        res.status(400).json({ error: "customDomainBasePath must be a string or null" }); return;
      } else {
        const normPath = "/" + raw.trim().replace(/^\/+/, "").replace(/\/+$/, "");
        if (!/^\/[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/i.test(normPath)) {
          res.status(400).json({ error: "Base path must be like /docs (1-30 url-safe chars)" }); return;
        }
        updates["customDomainBasePath"] = normPath.toLowerCase();
      }
    }

    // Custom domain handling: normalize, dedupe, reset verification status when changed
    if ("customDomain" in updates) {
      const raw = updates["customDomain"];
      if (raw === null || raw === "") {
        updates["customDomain"] = null;
        updates["customDomainBasePath"] = null;
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
      // Disambiguate which unique index was violated so the client can show
      // the right message (slug vs custom_domain).
      const constraint: string = err?.constraint || err?.constraint_name || "";
      if (constraint.includes("slug")) {
        res.status(409).json({ error: "This slug is already taken. Try another." });
      } else {
        res.status(409).json({ error: "This domain is already connected to another project." });
      }
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
    if (!isUuid(projectId)) { res.status(404).json({ error: "Not found" }); return; }
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
    if (!isUuid(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(projectsTable)
      .where(and(eq(projectsTable.id, req.params.id), eq(projectsTable.userId, userId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Duplicate project — wrapped in a single transaction so a partial failure
// rolls back cleanly. Sections + blocks are batch-inserted (one round-trip per
// table per parent) to avoid N+1 inserts on large projects.
router.post("/projects/:id/duplicate", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user!.id;
    if (!isUuid(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
    const [src] = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.id, req.params.id), eq(projectsTable.userId, userId)));
    if (!src) { res.status(404).json({ error: "Not found" }); return; }

    const newProject = await db.transaction(async (tx) => {
      const newSlug = `${src.slug}-copy-${Date.now().toString(36)}`;
      const [created] = await tx.insert(projectsTable).values({
        name: `${src.name} (Copy)`, slug: newSlug, description: src.description, userId,
      }).returning();

      // Find the source project's default branch — that's what we'll clone
      // and that's what the new project's "main" branch will mirror. Falls
      // back gracefully if the source predates the branches schema.
      const [srcDefault] = await tx.select().from(branchesTable)
        .where(and(eq(branchesTable.projectId, src.id), eq(branchesTable.isDefault, true)))
        .limit(1);
      const srcBranchId = srcDefault?.id;

      const newBranchId = randomUUID();
      await tx.insert(branchesTable).values({
        id: newBranchId, projectId: created.id, name: "main",
        isDefault: true, createdBy: userId,
      });

      // Read all source content (scoped to source default branch when one
      // exists) in PARALLEL — these are independent SELECTs.
      const [srcGroups, srcTabs, srcPages, srcSections, srcBlocks, srcDesignRows] = await Promise.all([
        tx.select().from(navGroupsTable).where(
          srcBranchId
            ? and(eq(navGroupsTable.projectId, src.id), eq(navGroupsTable.branchId, srcBranchId))
            : eq(navGroupsTable.projectId, src.id),
        ).orderBy(navGroupsTable.orderIndex),
        tx.select().from(tabsTable).where(
          srcBranchId
            ? and(eq(tabsTable.projectId, src.id), eq(tabsTable.branchId, srcBranchId))
            : eq(tabsTable.projectId, src.id),
        ).orderBy(tabsTable.orderIndex),
        tx.select().from(pagesTable).where(
          srcBranchId
            ? and(eq(pagesTable.projectId, src.id), eq(pagesTable.branchId, srcBranchId))
            : eq(pagesTable.projectId, src.id),
        ).orderBy(pagesTable.orderIndex),
        srcBranchId
          ? tx.select().from(sectionsTable).where(eq(sectionsTable.branchId, srcBranchId))
          : Promise.resolve([] as Awaited<ReturnType<typeof tx.select>>),
        srcBranchId
          ? tx.select().from(blocksTable).where(eq(blocksTable.branchId, srcBranchId))
          : Promise.resolve([] as Awaited<ReturnType<typeof tx.select>>),
        tx.select().from(projectDesignSettingsTable).where(
          srcBranchId
            ? and(eq(projectDesignSettingsTable.projectId, src.id), eq(projectDesignSettingsTable.branchId, srcBranchId))
            : eq(projectDesignSettingsTable.projectId, src.id),
        ),
      ]);
      // Fallback for legacy projects without branchId on sections/blocks
      const fallbackSections = srcBranchId
        ? srcSections
        : srcPages.length
          ? await tx.select().from(sectionsTable).where(inArray(sectionsTable.pageId, srcPages.map(p => p.id)))
          : [];
      const fallbackBlocks = srcBranchId
        ? srcBlocks
        : fallbackSections.length
          ? await tx.select().from(blocksTable).where(inArray(blocksTable.sectionId, fallbackSections.map(s => s.id)))
          : [];

      // Pre-generate UUIDs so all inserts can run in parallel as bulk inserts.
      const tabIdMap = new Map(srcTabs.map(t => [t.id, randomUUID()]));
      const groupIdMap = new Map(srcGroups.map(g => [g.id, randomUUID()]));
      const pageIdMap = new Map(srcPages.map(p => [p.id, randomUUID()]));
      const sectionIdMap = new Map(fallbackSections.map(s => [s.id, randomUUID()]));

      const newTabs = srcTabs.map(t => ({
        id: tabIdMap.get(t.id)!, projectId: created.id, branchId: newBranchId,
        label: t.label, icon: t.icon, orderIndex: t.orderIndex, metadata: t.metadata as object,
      }));
      const newGroups = srcGroups.map(g => ({
        id: groupIdMap.get(g.id)!, projectId: created.id, branchId: newBranchId,
        title: g.title, type: g.type, orderIndex: g.orderIndex,
        tabId: g.tabId ? (tabIdMap.get(g.tabId) ?? null) : null,
        metadata: g.metadata as object,
      }));
      const newPages = srcPages.map(p => ({
        id: pageIdMap.get(p.id)!, projectId: created.id, branchId: newBranchId,
        title: p.title, slug: p.slug, orderIndex: p.orderIndex,
        navGroupId: p.navGroupId ? (groupIdMap.get(p.navGroupId) ?? null) : null,
        navTitle: p.navTitle, metaDescription: p.metaDescription,
      }));
      const newSections = fallbackSections
        .filter(s => pageIdMap.has(s.pageId))
        .map(s => ({
          id: sectionIdMap.get(s.id)!, pageId: pageIdMap.get(s.pageId)!, branchId: newBranchId,
          title: s.title, navTitle: s.navTitle, orderIndex: s.orderIndex,
        }));
      const newBlocks = fallbackBlocks
        .filter(b => sectionIdMap.has(b.sectionId))
        .map(b => ({
          sectionId: sectionIdMap.get(b.sectionId)!, branchId: newBranchId,
          type: b.type, content: b.content as object, orderIndex: b.orderIndex,
        }));
      const newDesign = srcDesignRows.map(d => ({
        projectId: created.id, branchId: newBranchId, settings: d.settings as object,
      }));

      const inserts: Promise<unknown>[] = [];
      if (newTabs.length) inserts.push(tx.insert(tabsTable).values(newTabs));
      if (newGroups.length) inserts.push(tx.insert(navGroupsTable).values(newGroups));
      if (newPages.length) inserts.push(tx.insert(pagesTable).values(newPages));
      if (newSections.length) inserts.push(tx.insert(sectionsTable).values(newSections));
      if (newBlocks.length) inserts.push(tx.insert(blocksTable).values(newBlocks));
      if (newDesign.length) inserts.push(tx.insert(projectDesignSettingsTable).values(newDesign));
      await Promise.all(inserts);

      return created;
    });

    res.status(201).json(newProject);
  } catch (err) {
    req.log.error({ err }, "Failed to duplicate project");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
