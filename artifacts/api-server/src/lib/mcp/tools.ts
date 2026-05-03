import { randomUUID } from "node:crypto";
import { and, eq, desc, inArray, ilike, or, isNull } from "drizzle-orm";
import {
  db,
  projectsTable, pagesTable, sectionsTable, blocksTable,
  navGroupsTable, tabsTable, projectDesignSettingsTable,
  branchesTable, commitsTable, publishedVersionsTable, docVersionsTable,
} from "@workspace/db";
import { recordCommit } from "../commits";
import { getDefaultBranchId } from "../branches";
import { parseMdxDocument } from "./mdx-deserializer";
import type { McpCallerContext } from "./auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);

export interface ToolContext {
  caller: McpCallerContext;
  // The project id resolved from either the token scope or the tool argument.
  // Tools that don't take a projectId (e.g. list_projects) leave this null.
  projectId: string | null;
  // Resolved active branch for this call (always populated when projectId is set).
  branchId: string | null;
  // Logger from the request (pino).
  log: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };
}

export interface Tool {
  name: string;
  description: string;
  // JSON-schema-ish object for MCP clients. We keep this hand-written rather
  // than generating from zod so the descriptions stay tuned for AI consumers.
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  // Read-only tools are exposed in anonymous mode (when allowed). Writes are
  // owner-only and always require auth.
  readOnly: boolean;
  // Whether this tool requires a projectId argument (or token scope).
  needsProject: boolean;
  execute: (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>;
}

class ToolError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export { ToolError };

const PAGE_BLOCK_TYPES = [
  "paragraph", "heading", "code_block", "image", "video", "youtube",
  "ordered_list", "unordered_list", "callout", "quote", "divider",
  "tabs", "accordion", "card", "steps", "table", "api_endpoint",
  "code_tabs", "inline_editor",
] as const;

async function ensureOwner(ctx: ToolContext) {
  if (!ctx.caller.isOwner) throw new ToolError("Forbidden: write tools require an authenticated owner.", 403);
}

async function ensureProject(ctx: ToolContext): Promise<{ projectId: string; branchId: string }> {
  if (!ctx.projectId) throw new ToolError("projectId required.", 400);
  if (!ctx.branchId) throw new ToolError("Could not resolve branch.", 500);
  return { projectId: ctx.projectId, branchId: ctx.branchId };
}

function commit(ctx: ToolContext, projectId: string, branchId: string, message: string) {
  void recordCommit({
    projectId, branchId, message,
    authorUserId: ctx.caller.userId,
    source: "editor",
  }).catch(err => ctx.log.error({ err }, "mcp auto-commit failed"));
}

// Helper: ensure the page belongs to the active project + branch, returning it.
async function getOwnedPage(projectId: string, branchId: string, pageId: string) {
  if (!isUuid(pageId)) throw new ToolError("Invalid pageId.", 400);
  const [p] = await db.select().from(pagesTable).where(and(
    eq(pagesTable.id, pageId),
    eq(pagesTable.projectId, projectId),
    eq(pagesTable.branchId, branchId),
  )).limit(1);
  if (!p) throw new ToolError("Page not found.", 404);
  return p;
}

async function getOwnedSection(branchId: string, sectionId: string) {
  if (!isUuid(sectionId)) throw new ToolError("Invalid sectionId.", 400);
  const [s] = await db.select().from(sectionsTable).where(and(
    eq(sectionsTable.id, sectionId),
    eq(sectionsTable.branchId, branchId),
  )).limit(1);
  if (!s) throw new ToolError("Section not found.", 404);
  return s;
}

// =============================================================================
// Tool implementations
// =============================================================================

export const TOOLS: Tool[] = [
  // ---------- Projects ----------
  {
    name: "list_projects",
    description: "List all projects owned by the authenticated user. Returns id, name, slug, description, and publish status. Token-scoped callers see only their scoped project.",
    readOnly: true, needsProject: false,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async execute(ctx) {
      if (!ctx.caller.userId) throw new ToolError("Authentication required.", 401);
      if (ctx.caller.scopedProjectId) {
        const rows = await db.select().from(projectsTable)
          .where(eq(projectsTable.id, ctx.caller.scopedProjectId));
        return rows;
      }
      const rows = await db.select().from(projectsTable)
        .where(eq(projectsTable.userId, ctx.caller.userId))
        .orderBy(desc(projectsTable.updatedAt));
      return rows;
    },
  },
  {
    name: "get_project",
    description: "Fetch full metadata for a single project (name, slug, description, custom domain, published version, design tokens). Use this to ground subsequent writes in the project's identity.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string", description: "Project UUID. Optional when the MCP token is project-scoped." } },
      additionalProperties: false,
    },
    async execute(ctx) {
      const { projectId } = await ensureProject(ctx);
      const [p] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
      if (!p) throw new ToolError("Project not found.", 404);
      return p;
    },
  },

  // ---------- Branches ----------
  {
    name: "list_branches",
    description: "List active (non-deleted) branches for the project. Each branch is a fully-isolated copy of pages/sections/blocks.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" } },
      additionalProperties: false,
    },
    async execute(ctx) {
      const { projectId } = await ensureProject(ctx);
      return db.select().from(branchesTable)
        .where(and(eq(branchesTable.projectId, projectId), isNull(branchesTable.deletedAt)))
        .orderBy(branchesTable.createdAt);
    },
  },
  {
    name: "create_branch",
    description: "Fork a new branch from an existing one (defaults to the project's main branch). The new branch starts with a byte-identical copy of the source's content.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string", description: "Branch name (letters, numbers, '.', '_', '-', '/')." },
        sourceBranchId: { type: "string", description: "Optional UUID of the source branch. Defaults to the project's default branch." },
      },
      required: ["name"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId } = await ensureProject(ctx);
      const name = String(args.name || "").trim();
      if (!name || !/^[a-zA-Z0-9._/-]+$/.test(name)) throw new ToolError("Invalid branch name.", 400);
      const srcId = isUuid(args.sourceBranchId)
        ? (args.sourceBranchId as string)
        : await getDefaultBranchId(projectId);
      const [src] = await db.select().from(branchesTable)
        .where(and(eq(branchesTable.id, srcId), eq(branchesTable.projectId, projectId)));
      if (!src) throw new ToolError("Invalid sourceBranchId.", 400);

      // Mirror the deep-clone implementation from the HTTP route, scoped to
      // the source branch. Kept inline to avoid coupling routes ↔ tools.
      const [srcPages, srcNavGroups, srcTabs, srcDesign, srcSections, srcBlocks] = await Promise.all([
        db.select().from(pagesTable).where(and(eq(pagesTable.projectId, projectId), eq(pagesTable.branchId, srcId))),
        db.select().from(navGroupsTable).where(and(eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, srcId))),
        db.select().from(tabsTable).where(and(eq(tabsTable.projectId, projectId), eq(tabsTable.branchId, srcId))),
        db.select().from(projectDesignSettingsTable).where(and(eq(projectDesignSettingsTable.projectId, projectId), eq(projectDesignSettingsTable.branchId, srcId))),
        db.select().from(sectionsTable).where(eq(sectionsTable.branchId, srcId)),
        db.select().from(blocksTable).where(eq(blocksTable.branchId, srcId)),
      ]);
      const branchId = randomUUID();
      const tabIdMap = new Map(srcTabs.map(t => [t.id, randomUUID()]));
      const navIdMap = new Map(srcNavGroups.map(g => [g.id, randomUUID()]));
      const pageIdMap = new Map(srcPages.map(p => [p.id, randomUUID()]));
      const sectionIdMap = new Map(srcSections.map(s => [s.id, randomUUID()]));

      await db.transaction(async (tx) => {
        await tx.insert(branchesTable).values({
          id: branchId, projectId, name, isDefault: false,
          parentBranchId: srcId, baseCommitId: src.headCommitId ?? null,
          createdBy: ctx.caller.userId ?? "mcp",
        });
        if (srcTabs.length) await tx.insert(tabsTable).values(srcTabs.map(t => ({
          id: tabIdMap.get(t.id)!, projectId, branchId,
          label: t.label, icon: t.icon, orderIndex: t.orderIndex, metadata: t.metadata as object,
        })));
        if (srcNavGroups.length) await tx.insert(navGroupsTable).values(srcNavGroups.map(g => ({
          id: navIdMap.get(g.id)!, projectId, branchId,
          title: g.title, type: g.type, orderIndex: g.orderIndex,
          tabId: g.tabId ? (tabIdMap.get(g.tabId) ?? null) : null,
          metadata: g.metadata as object,
        })));
        if (srcPages.length) await tx.insert(pagesTable).values(srcPages.map(p => ({
          id: pageIdMap.get(p.id)!, projectId, branchId,
          title: p.title, slug: p.slug, orderIndex: p.orderIndex,
          metaDescription: p.metaDescription,
          navGroupId: p.navGroupId ? (navIdMap.get(p.navGroupId) ?? null) : null,
          navTitle: p.navTitle, versionId: p.versionId,
          metadata: p.metadata as object,
        })));
        const newSections = srcSections.filter(s => pageIdMap.has(s.pageId)).map(s => ({
          id: sectionIdMap.get(s.id)!, pageId: pageIdMap.get(s.pageId)!, branchId,
          title: s.title, navTitle: s.navTitle, orderIndex: s.orderIndex,
        }));
        if (newSections.length) await tx.insert(sectionsTable).values(newSections);
        const newBlocks = srcBlocks.filter(b => sectionIdMap.has(b.sectionId)).map(b => ({
          sectionId: sectionIdMap.get(b.sectionId)!, branchId,
          type: b.type, content: b.content as object, orderIndex: b.orderIndex,
        }));
        if (newBlocks.length) await tx.insert(blocksTable).values(newBlocks);
        if (srcDesign.length) await tx.insert(projectDesignSettingsTable).values(srcDesign.map(d => ({
          projectId, branchId, settings: d.settings as object,
        })));
      });
      commit(ctx, projectId, branchId, `Branch from ${src.name}`);
      return { id: branchId, name, projectId, sourceBranchId: srcId };
    },
  },
  {
    name: "delete_branch",
    description: "Soft-delete a non-default branch. The default ('main') branch cannot be deleted.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, branchId: { type: "string" } },
      required: ["branchId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId } = await ensureProject(ctx);
      const id = String(args.branchId || "");
      if (!isUuid(id)) throw new ToolError("Invalid branchId.", 400);
      const [b] = await db.select().from(branchesTable)
        .where(and(eq(branchesTable.id, id), eq(branchesTable.projectId, projectId)));
      if (!b) throw new ToolError("Branch not found.", 404);
      if (b.isDefault) throw new ToolError("Cannot delete the default branch.", 400);
      await db.update(branchesTable)
        .set({ deletedAt: new Date(), name: `${b.name}__deleted_${Date.now()}` })
        .where(eq(branchesTable.id, id));
      return { ok: true };
    },
  },

  // ---------- Pages ----------
  {
    name: "list_pages",
    description: "List all pages on the active branch with their slug, title, nav group, and order. Use this to discover pages before reading or editing them.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" } },
      additionalProperties: false,
    },
    async execute(ctx) {
      const { projectId, branchId } = await ensureProject(ctx);
      return db.select().from(pagesTable)
        .where(and(eq(pagesTable.projectId, projectId), eq(pagesTable.branchId, branchId)))
        .orderBy(pagesTable.orderIndex);
    },
  },
  {
    name: "search_pages",
    description: "Full-text search pages by title, slug, or meta description (case-insensitive substring match). Returns up to 50 matches.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        query: { type: "string", description: "Substring to match in title/slug/description." },
      },
      required: ["query"],
    },
    async execute(ctx, args) {
      const { projectId, branchId } = await ensureProject(ctx);
      const q = String(args.query || "").trim();
      if (!q) return [];
      const pat = `%${q.replace(/[%_]/g, m => `\\${m}`)}%`;
      return db.select().from(pagesTable).where(and(
        eq(pagesTable.projectId, projectId),
        eq(pagesTable.branchId, branchId),
        or(ilike(pagesTable.title, pat), ilike(pagesTable.slug, pat), ilike(pagesTable.metaDescription, pat))!,
      )).limit(50);
    },
  },
  {
    name: "get_page",
    description: "Get a page's metadata (title, slug, nav group, description, ordering). Use get_page_content to also retrieve sections and blocks.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, pageId: { type: "string" } },
      required: ["pageId"],
    },
    async execute(ctx, args) {
      const { projectId, branchId } = await ensureProject(ctx);
      return getOwnedPage(projectId, branchId, String(args.pageId || ""));
    },
  },
  {
    name: "get_page_content",
    description: "Return the full content tree for a page: { page, sections, blocks }. Sections are in render order; blocks include their type and content payload.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, pageId: { type: "string" } },
      required: ["pageId"],
    },
    async execute(ctx, args) {
      const { projectId, branchId } = await ensureProject(ctx);
      const page = await getOwnedPage(projectId, branchId, String(args.pageId || ""));
      const sections = await db.select().from(sectionsTable)
        .where(eq(sectionsTable.pageId, page.id))
        .orderBy(sectionsTable.orderIndex);
      const blocks = sections.length
        ? await db.select().from(blocksTable)
            .where(inArray(blocksTable.sectionId, sections.map(s => s.id)))
            .orderBy(blocksTable.orderIndex)
        : [];
      return { page, sections, blocks };
    },
  },
  {
    name: "create_page",
    description: "Create a new page on the active branch. Slug must be unique within the project.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        title: { type: "string" },
        slug: { type: "string", description: "URL-safe slug, e.g. 'getting-started'." },
        navGroupId: { type: "string" },
        navTitle: { type: "string" },
        metaDescription: { type: "string" },
        orderIndex: { type: "number" },
      },
      required: ["title", "slug"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const [page] = await db.insert(pagesTable).values({
        projectId, branchId,
        title: String(args.title || "Untitled"),
        slug: String(args.slug || "untitled"),
        orderIndex: typeof args.orderIndex === "number" ? args.orderIndex : 0,
        navGroupId: isUuid(args.navGroupId) ? (args.navGroupId as string) : null,
        navTitle: typeof args.navTitle === "string" ? args.navTitle : null,
        metaDescription: typeof args.metaDescription === "string" ? args.metaDescription : null,
      }).returning();
      commit(ctx, projectId, branchId, `Create page ${page.slug}`);
      return page;
    },
  },
  {
    name: "update_page",
    description: "Update one or more fields of a page (title, slug, navGroupId, navTitle, metaDescription, orderIndex, metadata).",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, pageId: { type: "string" },
        title: { type: "string" }, slug: { type: "string" },
        navGroupId: { type: "string" }, navTitle: { type: "string" },
        metaDescription: { type: "string" }, orderIndex: { type: "number" },
        metadata: { type: "object" },
      },
      required: ["pageId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const page = await getOwnedPage(projectId, branchId, String(args.pageId || ""));
      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
      for (const k of ["title", "slug", "navGroupId", "navTitle", "metaDescription", "orderIndex", "metadata"] as const) {
        if (args[k] !== undefined) updates[k] = args[k];
      }
      const [updated] = await db.update(pagesTable).set(updates).where(eq(pagesTable.id, page.id)).returning();
      commit(ctx, projectId, branchId, `Update page ${page.slug}`);
      return updated;
    },
  },
  {
    name: "delete_page",
    description: "Delete a page (and its sections and blocks via cascade in the editor). Irreversible on the active branch.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, pageId: { type: "string" } },
      required: ["pageId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const page = await getOwnedPage(projectId, branchId, String(args.pageId || ""));
      // Delete blocks → sections → page so we don't leak orphan rows.
      const sects = await db.select({ id: sectionsTable.id }).from(sectionsTable)
        .where(eq(sectionsTable.pageId, page.id));
      if (sects.length) {
        await db.delete(blocksTable).where(inArray(blocksTable.sectionId, sects.map(s => s.id)));
        await db.delete(sectionsTable).where(eq(sectionsTable.pageId, page.id));
      }
      await db.delete(pagesTable).where(eq(pagesTable.id, page.id));
      commit(ctx, projectId, branchId, `Delete page ${page.slug}`);
      return { ok: true };
    },
  },
  {
    name: "reorder_pages",
    description: "Bulk-update the orderIndex (and optionally navGroupId) for multiple pages on the active branch.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        pages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" }, orderIndex: { type: "number" }, navGroupId: { type: "string" },
            },
            required: ["id", "orderIndex"],
          },
        },
      },
      required: ["pages"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const pages = (args.pages as Array<{ id: string; orderIndex: number; navGroupId?: string | null }>) || [];
      for (const p of pages) {
        if (!isUuid(p.id)) continue;
        await db.update(pagesTable)
          .set({ orderIndex: p.orderIndex, navGroupId: p.navGroupId ?? null, updatedAt: new Date() })
          .where(and(eq(pagesTable.id, p.id), eq(pagesTable.projectId, projectId), eq(pagesTable.branchId, branchId)));
      }
      commit(ctx, projectId, branchId, "Reorder pages");
      return { ok: true, updated: pages.length };
    },
  },

  // ---------- Sections ----------
  {
    name: "list_sections",
    description: "List the sections of a page in render order.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, pageId: { type: "string" } },
      required: ["pageId"],
    },
    async execute(ctx, args) {
      const { projectId, branchId } = await ensureProject(ctx);
      const page = await getOwnedPage(projectId, branchId, String(args.pageId || ""));
      return db.select().from(sectionsTable).where(eq(sectionsTable.pageId, page.id))
        .orderBy(sectionsTable.orderIndex);
    },
  },
  {
    name: "create_section",
    description: "Append a new section to a page. Sections inherit the page's branch.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, pageId: { type: "string" },
        title: { type: "string" }, navTitle: { type: "string" }, orderIndex: { type: "number" },
      },
      required: ["pageId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const page = await getOwnedPage(projectId, branchId, String(args.pageId || ""));
      const [section] = await db.insert(sectionsTable).values({
        pageId: page.id, branchId,
        title: typeof args.title === "string" ? args.title : "New Section",
        navTitle: typeof args.navTitle === "string" ? args.navTitle : null,
        orderIndex: typeof args.orderIndex === "number" ? args.orderIndex : 0,
      }).returning();
      commit(ctx, projectId, branchId, "Create section");
      return section;
    },
  },
  {
    name: "update_section",
    description: "Update a section's title, navTitle, or orderIndex.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, sectionId: { type: "string" },
        title: { type: "string" }, navTitle: { type: "string" }, orderIndex: { type: "number" },
      },
      required: ["sectionId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const sect = await getOwnedSection(branchId, String(args.sectionId || ""));
      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
      for (const k of ["title", "navTitle", "orderIndex"] as const) {
        if (args[k] !== undefined) updates[k] = args[k];
      }
      const [updated] = await db.update(sectionsTable).set(updates).where(eq(sectionsTable.id, sect.id)).returning();
      commit(ctx, projectId, branchId, "Update section");
      return updated;
    },
  },
  {
    name: "delete_section",
    description: "Delete a section and all of its blocks.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, sectionId: { type: "string" } },
      required: ["sectionId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const sect = await getOwnedSection(branchId, String(args.sectionId || ""));
      await db.delete(blocksTable).where(eq(blocksTable.sectionId, sect.id));
      await db.delete(sectionsTable).where(eq(sectionsTable.id, sect.id));
      commit(ctx, projectId, branchId, "Delete section");
      return { ok: true };
    },
  },

  // ---------- Blocks ----------
  {
    name: "list_blocks",
    description: "List blocks for a section in render order. Each block has a type and a content payload.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, sectionId: { type: "string" } },
      required: ["sectionId"],
    },
    async execute(ctx, args) {
      const { branchId } = await ensureProject(ctx);
      const sect = await getOwnedSection(branchId, String(args.sectionId || ""));
      return db.select().from(blocksTable).where(eq(blocksTable.sectionId, sect.id))
        .orderBy(blocksTable.orderIndex);
    },
  },
  {
    name: "create_block",
    description: `Append a content block to a section. Supported block types: ${PAGE_BLOCK_TYPES.join(", ")}. Content shape varies per type — see get_page_content output for examples.`,
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, sectionId: { type: "string" },
        type: { type: "string", enum: [...PAGE_BLOCK_TYPES] },
        content: { type: "object", description: "Block-type-specific payload (e.g. { text } for paragraph, { language, code } for code_block)." },
        orderIndex: { type: "number" },
      },
      required: ["sectionId", "type"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const sect = await getOwnedSection(branchId, String(args.sectionId || ""));
      const [block] = await db.insert(blocksTable).values({
        sectionId: sect.id, branchId,
        type: String(args.type || "paragraph"),
        content: (args.content && typeof args.content === "object" ? args.content : {}) as object,
        orderIndex: typeof args.orderIndex === "number" ? args.orderIndex : 0,
      }).returning();
      commit(ctx, projectId, branchId, "Create block");
      return block;
    },
  },
  {
    name: "update_block",
    description: "Update a block's type, content, or orderIndex. Use get_page_content to inspect the existing payload before patching.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, blockId: { type: "string" },
        type: { type: "string" }, content: { type: "object" }, orderIndex: { type: "number" },
      },
      required: ["blockId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const id = String(args.blockId || "");
      if (!isUuid(id)) throw new ToolError("Invalid blockId.", 400);
      const [b] = await db.select().from(blocksTable).where(and(eq(blocksTable.id, id), eq(blocksTable.branchId, branchId)));
      if (!b) throw new ToolError("Block not found.", 404);
      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
      for (const k of ["type", "content", "orderIndex"] as const) {
        if (args[k] !== undefined) updates[k] = args[k];
      }
      const [updated] = await db.update(blocksTable).set(updates).where(eq(blocksTable.id, id)).returning();
      commit(ctx, projectId, branchId, "Update block");
      return updated;
    },
  },
  {
    name: "delete_block",
    description: "Delete a single block from its section.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, blockId: { type: "string" } },
      required: ["blockId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const id = String(args.blockId || "");
      if (!isUuid(id)) throw new ToolError("Invalid blockId.", 400);
      const [b] = await db.select({ id: blocksTable.id }).from(blocksTable)
        .where(and(eq(blocksTable.id, id), eq(blocksTable.branchId, branchId)));
      if (!b) throw new ToolError("Block not found.", 404);
      await db.delete(blocksTable).where(eq(blocksTable.id, id));
      commit(ctx, projectId, branchId, "Delete block");
      return { ok: true };
    },
  },

  // ---------- Nav groups ----------
  {
    name: "list_navgroups",
    description: "List navigation groups (Mintlify-style sidebar groupings) on the active branch.",
    readOnly: true, needsProject: true,
    inputSchema: { type: "object", properties: { projectId: { type: "string" } } },
    async execute(ctx) {
      const { projectId, branchId } = await ensureProject(ctx);
      return db.select().from(navGroupsTable)
        .where(and(eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, branchId)))
        .orderBy(navGroupsTable.orderIndex);
    },
  },
  {
    name: "create_navgroup",
    description: "Create a new navigation group (sidebar header). Optionally bind to a top-level tab.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, title: { type: "string" }, type: { type: "string" },
        tabId: { type: "string" }, orderIndex: { type: "number" },
      },
      required: ["title"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const [g] = await db.insert(navGroupsTable).values({
        projectId, branchId,
        title: String(args.title || "New Group"),
        type: typeof args.type === "string" ? args.type : "label",
        tabId: isUuid(args.tabId) ? (args.tabId as string) : null,
        orderIndex: typeof args.orderIndex === "number" ? args.orderIndex : 0,
      }).returning();
      commit(ctx, projectId, branchId, "Create nav group");
      return g;
    },
  },
  {
    name: "update_navgroup",
    description: "Update a nav group's title, type, tabId, or orderIndex.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, navGroupId: { type: "string" },
        title: { type: "string" }, type: { type: "string" }, tabId: { type: "string" }, orderIndex: { type: "number" },
      },
      required: ["navGroupId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const id = String(args.navGroupId || "");
      if (!isUuid(id)) throw new ToolError("Invalid navGroupId.", 400);
      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
      for (const k of ["title", "type", "tabId", "orderIndex"] as const) {
        if (args[k] !== undefined) updates[k] = args[k];
      }
      const [g] = await db.update(navGroupsTable).set(updates)
        .where(and(eq(navGroupsTable.id, id), eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, branchId)))
        .returning();
      if (!g) throw new ToolError("Nav group not found.", 404);
      commit(ctx, projectId, branchId, "Update nav group");
      return g;
    },
  },
  {
    name: "delete_navgroup",
    description: "Delete a nav group. Pages currently bound to it become unassigned (top-level).",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, navGroupId: { type: "string" } },
      required: ["navGroupId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const id = String(args.navGroupId || "");
      if (!isUuid(id)) throw new ToolError("Invalid navGroupId.", 400);
      await db.update(pagesTable).set({ navGroupId: null }).where(eq(pagesTable.navGroupId, id));
      await db.delete(navGroupsTable).where(eq(navGroupsTable.id, id));
      commit(ctx, projectId, branchId, "Delete nav group");
      return { ok: true };
    },
  },

  // ---------- Tabs ----------
  {
    name: "list_tabs",
    description: "List top-level tabs (e.g. 'Guides', 'API Reference') on the active branch.",
    readOnly: true, needsProject: true,
    inputSchema: { type: "object", properties: { projectId: { type: "string" } } },
    async execute(ctx) {
      const { projectId, branchId } = await ensureProject(ctx);
      return db.select().from(tabsTable)
        .where(and(eq(tabsTable.projectId, projectId), eq(tabsTable.branchId, branchId)))
        .orderBy(tabsTable.orderIndex);
    },
  },
  {
    name: "create_tab",
    description: "Create a top-level tab.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, label: { type: "string" }, icon: { type: "string" },
        orderIndex: { type: "number" },
      },
      required: ["label"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const [t] = await db.insert(tabsTable).values({
        projectId, branchId,
        label: String(args.label || "New Tab"),
        icon: typeof args.icon === "string" ? args.icon : null,
        orderIndex: typeof args.orderIndex === "number" ? args.orderIndex : 0,
      }).returning();
      commit(ctx, projectId, branchId, "Create tab");
      return t;
    },
  },
  {
    name: "update_tab",
    description: "Update a tab's label, icon, or orderIndex.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, tabId: { type: "string" },
        label: { type: "string" }, icon: { type: "string" }, orderIndex: { type: "number" },
      },
      required: ["tabId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const id = String(args.tabId || "");
      if (!isUuid(id)) throw new ToolError("Invalid tabId.", 400);
      const updates: Record<string, unknown> & { updatedAt: Date } = { updatedAt: new Date() };
      for (const k of ["label", "icon", "orderIndex"] as const) {
        if (args[k] !== undefined) updates[k] = args[k];
      }
      const [t] = await db.update(tabsTable).set(updates)
        .where(and(eq(tabsTable.id, id), eq(tabsTable.projectId, projectId), eq(tabsTable.branchId, branchId)))
        .returning();
      if (!t) throw new ToolError("Tab not found.", 404);
      commit(ctx, projectId, branchId, "Update tab");
      return t;
    },
  },
  {
    name: "delete_tab",
    description: "Delete a tab. Nav groups currently bound to it become unassigned.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, tabId: { type: "string" } },
      required: ["tabId"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const id = String(args.tabId || "");
      if (!isUuid(id)) throw new ToolError("Invalid tabId.", 400);
      await db.update(navGroupsTable).set({ tabId: null }).where(eq(navGroupsTable.tabId, id));
      await db.delete(tabsTable).where(eq(tabsTable.id, id));
      commit(ctx, projectId, branchId, "Delete tab");
      return { ok: true };
    },
  },

  // ---------- Design ----------
  {
    name: "get_design",
    description: "Read the project's design settings (theme tokens, fonts, colors) for the active branch.",
    readOnly: true, needsProject: true,
    inputSchema: { type: "object", properties: { projectId: { type: "string" } } },
    async execute(ctx) {
      const { projectId, branchId } = await ensureProject(ctx);
      const [d] = await db.select().from(projectDesignSettingsTable)
        .where(and(eq(projectDesignSettingsTable.projectId, projectId), eq(projectDesignSettingsTable.branchId, branchId)));
      return d ?? null;
    },
  },
  {
    name: "update_design",
    description: "Replace the project's design settings JSON for the active branch (upsert).",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, settings: { type: "object" } },
      required: ["settings"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const settings = (args.settings && typeof args.settings === "object" ? args.settings : {}) as object;
      const [existing] = await db.select().from(projectDesignSettingsTable)
        .where(and(eq(projectDesignSettingsTable.projectId, projectId), eq(projectDesignSettingsTable.branchId, branchId)));
      let result;
      if (existing) {
        [result] = await db.update(projectDesignSettingsTable)
          .set({ settings, updatedAt: new Date() })
          .where(eq(projectDesignSettingsTable.id, existing.id))
          .returning();
      } else {
        [result] = await db.insert(projectDesignSettingsTable)
          .values({ projectId, branchId, settings })
          .returning();
      }
      commit(ctx, projectId, branchId, "Update theme");
      return result;
    },
  },

  // ---------- Versions / commits ----------
  {
    name: "list_versions",
    description: "List published versions of the project (most recent first).",
    readOnly: true, needsProject: true,
    inputSchema: { type: "object", properties: { projectId: { type: "string" }, limit: { type: "number" } } },
    async execute(ctx, args) {
      const { projectId } = await ensureProject(ctx);
      const limit = Math.min(typeof args.limit === "number" ? args.limit : 25, 100);
      return db.select().from(publishedVersionsTable)
        .where(eq(publishedVersionsTable.projectId, projectId))
        .orderBy(desc(publishedVersionsTable.publishedAt))
        .limit(limit);
    },
  },
  {
    name: "list_doc_versions",
    description: "List documentation versions (Mintlify-style version dropdown entries) for the project.",
    readOnly: true, needsProject: true,
    inputSchema: { type: "object", properties: { projectId: { type: "string" } } },
    async execute(ctx) {
      const { projectId } = await ensureProject(ctx);
      return db.select().from(docVersionsTable)
        .where(eq(docVersionsTable.projectId, projectId))
        .orderBy(desc(docVersionsTable.createdAt));
    },
  },
  {
    name: "create_doc_version",
    description: "Create a new documentation version label for the project.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }, versionLabel: { type: "string" }, isDefault: { type: "boolean" },
      },
      required: ["versionLabel"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId } = await ensureProject(ctx);
      const [v] = await db.insert(docVersionsTable).values({
        projectId,
        versionLabel: String(args.versionLabel),
        isDefault: args.isDefault === true,
      }).returning();
      return v;
    },
  },
  {
    name: "list_commits",
    description: "List recent commits on the active branch (newest first, up to 100). Returns commit metadata plus the file-level changeset.",
    readOnly: true, needsProject: true,
    inputSchema: { type: "object", properties: { projectId: { type: "string" }, limit: { type: "number" } } },
    async execute(ctx, args) {
      const { branchId } = await ensureProject(ctx);
      const limit = Math.min(typeof args.limit === "number" ? args.limit : 25, 100);
      return db.select({
        id: commitsTable.id, parentCommitId: commitsTable.parentCommitId,
        authorUserId: commitsTable.authorUserId, message: commitsTable.message,
        filesChanged: commitsTable.filesChanged, source: commitsTable.source,
        createdAt: commitsTable.createdAt,
      }).from(commitsTable)
        .where(eq(commitsTable.branchId, branchId))
        .orderBy(desc(commitsTable.createdAt))
        .limit(limit);
    },
  },
  {
    name: "get_commit",
    description: "Fetch a single commit including the full content snapshot.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "string" }, commitId: { type: "string" } },
      required: ["commitId"],
    },
    async execute(ctx, args) {
      const { projectId } = await ensureProject(ctx);
      const id = String(args.commitId || "");
      if (!isUuid(id)) throw new ToolError("Invalid commitId.", 400);
      const [c] = await db.select().from(commitsTable)
        .where(and(eq(commitsTable.id, id), eq(commitsTable.projectId, projectId)));
      if (!c) throw new ToolError("Commit not found.", 404);
      return c;
    },
  },

  // ---------- Image upload ----------
  {
    name: "upload_image",
    description: "Persist an image and return a URL suitable for an `image` block. Accepts either a base64-encoded payload (filename + mimeType + data) — returned as a data URI — or an existing remote URL which is validated and returned as-is. For production-scale uploads, host on your own CDN and pass the URL.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        url: { type: "string", description: "An existing https:// URL — returned verbatim after validation." },
        data: { type: "string", description: "Base64-encoded image data (no data: prefix). Provide with mimeType + filename." },
        mimeType: { type: "string", description: "e.g. image/png, image/jpeg." },
        filename: { type: "string" },
      },
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      await ensureProject(ctx);
      if (typeof args.url === "string" && args.url.trim()) {
        const u = args.url.trim();
        if (!/^https?:\/\//.test(u)) throw new ToolError("url must be http(s)://", 400);
        return { url: u, kind: "external" };
      }
      const data = typeof args.data === "string" ? args.data : "";
      const mime = typeof args.mimeType === "string" ? args.mimeType : "";
      if (!data || !mime.startsWith("image/")) {
        throw new ToolError("Provide either `url` or `{ data, mimeType, filename }` with an image mimeType.", 400);
      }
      // Cap at ~2MB raw to keep data URIs sane.
      if (data.length > 2_800_000) throw new ToolError("Image too large (max ~2MB base64).", 400);
      const dataUri = `data:${mime};base64,${data}`;
      return {
        url: dataUri,
        kind: "data-uri",
        filename: typeof args.filename === "string" ? args.filename : undefined,
        sizeBytes: Math.floor(data.length * 0.75),
      };
    },
  },

  // ---------- MDX replace ----------
  {
    name: "replace_page_content_from_mdx",
    description: "Replace a page's entire body with content parsed from MDX. The MDX must include a `# Title` (or `title:` frontmatter); H2 splits sections; supported blocks include paragraphs, code fences, headings, lists, tables, blockquotes, images, dividers, and components like <Callout>, <Tabs>, <Steps>, <AccordionGroup>, <Card>, <APIEndpoint>, <CodeTabs>, <YouTube>. Existing sections and blocks for the page are removed and replaced atomically.",
    readOnly: false, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        pageId: { type: "string" },
        mdx: { type: "string", description: "The MDX document." },
      },
      required: ["pageId", "mdx"],
    },
    async execute(ctx, args) {
      await ensureOwner(ctx);
      const { projectId, branchId } = await ensureProject(ctx);
      const page = await getOwnedPage(projectId, branchId, String(args.pageId || ""));
      const parsed = parseMdxDocument(String(args.mdx || ""));

      await db.transaction(async (tx) => {
        // Wipe existing content.
        const existing = await tx.select({ id: sectionsTable.id }).from(sectionsTable)
          .where(eq(sectionsTable.pageId, page.id));
        if (existing.length) {
          await tx.delete(blocksTable).where(inArray(blocksTable.sectionId, existing.map(s => s.id)));
          await tx.delete(sectionsTable).where(eq(sectionsTable.pageId, page.id));
        }
        // Optional: update page title from MDX.
        const newTitle = parsed.pageTitle ?? null;
        const fmDescription = typeof parsed.frontmatter.description === "string" ? parsed.frontmatter.description : undefined;
        if (newTitle || fmDescription !== undefined) {
          await tx.update(pagesTable).set({
            ...(newTitle ? { title: newTitle } : {}),
            ...(fmDescription !== undefined ? { metaDescription: fmDescription } : {}),
            updatedAt: new Date(),
          }).where(eq(pagesTable.id, page.id));
        }
        // Re-create sections + blocks.
        for (let si = 0; si < parsed.sections.length; si++) {
          const s = parsed.sections[si];
          const [section] = await tx.insert(sectionsTable).values({
            pageId: page.id, branchId,
            title: s.title || (si === 0 ? "" : `Section ${si + 1}`),
            navTitle: s.navTitle ?? null,
            orderIndex: si,
          }).returning();
          for (let bi = 0; bi < s.blocks.length; bi++) {
            const b = s.blocks[bi];
            await tx.insert(blocksTable).values({
              sectionId: section.id, branchId,
              type: b.type, content: b.content as object, orderIndex: bi,
            });
          }
        }
      });
      commit(ctx, projectId, branchId, `Replace MDX for ${page.slug}`);
      return {
        ok: true,
        pageId: page.id,
        sectionCount: parsed.sections.length,
        blockCount: parsed.sections.reduce((n, s) => n + s.blocks.length, 0),
      };
    },
  },

  // ---------- Filesystem-style overview ----------
  {
    name: "query_docs_filesystem",
    description: "Return a virtual filesystem snapshot of the project: every page as `pages/<slug>.mdx`, plus `docs.json` (nav structure) and `theme.json` (design tokens). Useful for AI agents that prefer browsing files. Set `includeContent: false` to get only the file listing.",
    readOnly: true, needsProject: true,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        includeContent: { type: "boolean", description: "Include the body of each file (default true)." },
        path: { type: "string", description: "Optional: return only the single file at this path." },
      },
    },
    async execute(ctx, args) {
      const { projectId, branchId } = await ensureProject(ctx);
      const includeContent = args.includeContent !== false;

      const [pages, navGroups, tabs, design] = await Promise.all([
        db.select().from(pagesTable).where(and(eq(pagesTable.projectId, projectId), eq(pagesTable.branchId, branchId))).orderBy(pagesTable.orderIndex),
        db.select().from(navGroupsTable).where(and(eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, branchId))).orderBy(navGroupsTable.orderIndex),
        db.select().from(tabsTable).where(and(eq(tabsTable.projectId, projectId), eq(tabsTable.branchId, branchId))).orderBy(tabsTable.orderIndex),
        db.select().from(projectDesignSettingsTable).where(and(eq(projectDesignSettingsTable.projectId, projectId), eq(projectDesignSettingsTable.branchId, branchId))),
      ]);
      const sections = pages.length
        ? await db.select().from(sectionsTable).where(eq(sectionsTable.branchId, branchId)).orderBy(sectionsTable.orderIndex)
        : [];
      const blocks = sections.length
        ? await db.select().from(blocksTable).where(eq(blocksTable.branchId, branchId)).orderBy(blocksTable.orderIndex)
        : [];

      const sectionsByPage = new Map<string, typeof sections>();
      for (const s of sections) {
        const arr = sectionsByPage.get(s.pageId) ?? [];
        arr.push(s);
        sectionsByPage.set(s.pageId, arr);
      }
      const blocksBySection = new Map<string, typeof blocks>();
      for (const b of blocks) {
        const arr = blocksBySection.get(b.sectionId) ?? [];
        arr.push(b);
        blocksBySection.set(b.sectionId, arr);
      }

      const renderMdx = (page: typeof pages[number]) => {
        const lines: string[] = ["---", `title: ${JSON.stringify(page.title)}`];
        if (page.slug) lines.push(`slug: ${JSON.stringify(page.slug)}`);
        if (page.metaDescription) lines.push(`description: ${JSON.stringify(page.metaDescription)}`);
        lines.push("---", "", `# ${page.title}`, "");
        const pageSections = sectionsByPage.get(page.id) ?? [];
        for (const sec of pageSections) {
          if (sec.title && sec.title !== "New Section") lines.push(`## ${sec.title}`, "");
          for (const blk of (blocksBySection.get(sec.id) ?? [])) {
            const c: any = blk.content || {};
            switch (blk.type) {
              case "heading":
                lines.push(`${"#".repeat(Math.min(Math.max(Number(c.level) || 2, 1), 6))} ${c.text || ""}`); break;
              case "paragraph": lines.push(String(c.text || c.html || "")); break;
              case "code_block": lines.push("```" + (c.language || ""), String(c.code || ""), "```"); break;
              case "image": lines.push(`![${c.alt || ""}](${c.url || ""})`); break;
              case "ordered_list": (c.items || []).forEach((it: string, i: number) => lines.push(`${i + 1}. ${it}`)); break;
              case "unordered_list": (c.items || []).forEach((it: string) => lines.push(`- ${it}`)); break;
              case "callout": lines.push(`<Callout type="${c.variant || "info"}">${c.text || ""}</Callout>`); break;
              case "quote": lines.push(`> ${c.text || ""}`); break;
              case "divider": lines.push("---"); break;
              default: lines.push(`{/* ${blk.type} */}`);
            }
            lines.push("");
          }
        }
        return lines.join("\n");
      };

      const docsJson = {
        tabs: tabs.map(t => ({ id: t.id, label: t.label, icon: t.icon, orderIndex: t.orderIndex })),
        navigation: navGroups.map(g => ({
          id: g.id, title: g.title, type: g.type, tabId: g.tabId, orderIndex: g.orderIndex,
          pages: pages.filter(p => p.navGroupId === g.id).map(p => `pages/${p.slug}.mdx`),
        })),
        ungroupedPages: pages.filter(p => !p.navGroupId).map(p => `pages/${p.slug}.mdx`),
      };
      const themeJson = design[0]?.settings ?? {};

      const files: Array<{ path: string; size: number; content?: string }> = [];
      const push = (path: string, content: string) => {
        files.push(includeContent ? { path, size: content.length, content } : { path, size: content.length });
      };
      push("docs.json", JSON.stringify(docsJson, null, 2));
      push("theme.json", JSON.stringify(themeJson, null, 2));
      for (const p of pages) push(`pages/${p.slug}.mdx`, renderMdx(p));

      if (typeof args.path === "string") {
        const target = files.find(f => f.path === args.path);
        if (!target) throw new ToolError(`File not found: ${args.path}`, 404);
        return target;
      }
      return { files, count: files.length };
    },
  },
];

export const TOOLS_BY_NAME = new Map(TOOLS.map(t => [t.name, t]));
