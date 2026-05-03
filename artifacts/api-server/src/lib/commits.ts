import {
  db, commitsTable, branchesTable,
  pagesTable, sectionsTable, blocksTable,
  navGroupsTable, tabsTable, projectDesignSettingsTable,
} from "@workspace/db";
import { and, eq, desc, inArray, sql } from "drizzle-orm";

// Take a full content snapshot of a branch. We denormalize so a commit row is
// self-contained and can be diffed/displayed without reconstructing from
// pointers — readability and PR-diff correctness over storage efficiency.
export async function snapshotBranch(projectId: string, branchId: string) {
  const pages = await db.select().from(pagesTable)
    .where(and(eq(pagesTable.projectId, projectId), eq(pagesTable.branchId, branchId)))
    .orderBy(pagesTable.orderIndex);
  const pageIds = pages.map(p => p.id);
  const sections = pageIds.length
    ? await db.select().from(sectionsTable)
        .where(and(inArray(sectionsTable.pageId, pageIds), eq(sectionsTable.branchId, branchId)))
        .orderBy(sectionsTable.orderIndex)
    : [];
  const sectionIds = sections.map(s => s.id);
  const blocks = sectionIds.length
    ? await db.select().from(blocksTable)
        .where(and(inArray(blocksTable.sectionId, sectionIds), eq(blocksTable.branchId, branchId)))
        .orderBy(blocksTable.orderIndex)
    : [];
  const navGroups = await db.select().from(navGroupsTable)
    .where(and(eq(navGroupsTable.projectId, projectId), eq(navGroupsTable.branchId, branchId)))
    .orderBy(navGroupsTable.orderIndex);
  const tabs = await db.select().from(tabsTable)
    .where(and(eq(tabsTable.projectId, projectId), eq(tabsTable.branchId, branchId)))
    .orderBy(tabsTable.orderIndex);
  const [design] = await db.select().from(projectDesignSettingsTable)
    .where(and(
      eq(projectDesignSettingsTable.projectId, projectId),
      eq(projectDesignSettingsTable.branchId, branchId),
    ));
  return { pages, sections, blocks, navGroups, tabs, design: design?.settings ?? {} };
}

export type ContentSnapshot = Awaited<ReturnType<typeof snapshotBranch>>;

// Produce a Mintlify-style file-level diff. "Files" in our model are: each
// page (one MDX file), the navigation config (docs.json), and the design
// theme. We compare by stable identifier (page slug, group id, etc.).
export type FileChange = {
  path: string;
  status: "added" | "modified" | "removed";
};

export function diffSnapshots(a: ContentSnapshot | null, b: ContentSnapshot): FileChange[] {
  const out: FileChange[] = [];

  // Pages: compare by slug. Page content = its sections + their blocks.
  const aPagesBySlug = new Map((a?.pages ?? []).map(p => [p.slug, p]));
  const bPagesBySlug = new Map(b.pages.map(p => [p.slug, p]));
  for (const [slug, bPage] of bPagesBySlug) {
    const aPage = aPagesBySlug.get(slug);
    const bSig = pageSignature(bPage.id, b);
    if (!aPage) { out.push({ path: `pages/${slug}.mdx`, status: "added" }); continue; }
    const aSig = a ? pageSignature(aPage.id, a) : "";
    if (aSig !== bSig || aPage.title !== bPage.title || aPage.metaDescription !== bPage.metaDescription) {
      out.push({ path: `pages/${slug}.mdx`, status: "modified" });
    }
  }
  for (const [slug] of aPagesBySlug) {
    if (!bPagesBySlug.has(slug)) out.push({ path: `pages/${slug}.mdx`, status: "removed" });
  }

  // Navigation (tabs + nav_groups) → docs.json
  const aNavSig = JSON.stringify({ tabs: a?.tabs ?? [], groups: a?.navGroups ?? [] });
  const bNavSig = JSON.stringify({ tabs: b.tabs, groups: b.navGroups });
  if (aNavSig !== bNavSig) {
    out.push({ path: "docs.json", status: a ? "modified" : "added" });
  }

  // Design theme
  const aDesign = JSON.stringify(a?.design ?? {});
  const bDesign = JSON.stringify(b.design);
  if (aDesign !== bDesign) {
    out.push({ path: "theme.json", status: a && Object.keys(a.design ?? {}).length ? "modified" : "added" });
  }
  return out;
}

function pageSignature(pageId: string, snap: ContentSnapshot): string {
  const sections = snap.sections.filter(s => s.pageId === pageId);
  const sectionIds = new Set(sections.map(s => s.id));
  const blocks = snap.blocks.filter(b => sectionIds.has(b.sectionId));
  return JSON.stringify({
    sections: sections.map(s => ({ id: s.id, t: s.title, n: s.navTitle, o: s.orderIndex })),
    blocks: blocks.map(b => ({ id: b.id, s: b.sectionId, t: b.type, c: b.content, o: b.orderIndex })),
  });
}

const COLLAPSE_WINDOW_MS = 3000;

// Record a commit for a branch. To avoid one commit per keystroke, if the
// branch's most-recent commit is younger than COLLAPSE_WINDOW_MS and shares
// the same author + source, we update that commit in place (re-snapshot,
// re-diff vs ITS parent — keeps history compact and human-readable).
export async function recordCommit(opts: {
  projectId: string;
  branchId: string;
  authorUserId: string | null;
  message?: string;
  source?: "editor" | "merge" | "github-pull" | "manual";
}): Promise<void> {
  const { projectId, branchId } = opts;
  const source = opts.source ?? "editor";
  const message = opts.message ?? "";

  // Serialize concurrent commits on the same branch via a postgres advisory
  // xact lock. Without this, two near-simultaneous writes both read the same
  // "latest" commit and create competing children, fragmenting the history
  // graph and racing on branches.headCommitId. The lock is keyed on a stable
  // hash of the branch UUID so different branches never block each other.
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${branchId}))`);

    const newSnap = await snapshotBranch(projectId, branchId);

    const [latest] = await tx.select().from(commitsTable)
      .where(eq(commitsTable.branchId, branchId))
      .orderBy(desc(commitsTable.createdAt))
      .limit(1);

    const collapsing = latest
      && source === "editor" && latest.source === "editor"
      && latest.authorUserId === opts.authorUserId
      && (Date.now() - new Date(latest.createdAt).getTime()) < COLLAPSE_WINDOW_MS;

    const parentSnapRaw = collapsing
      ? (latest!.parentCommitId ? await loadCommitSnapshotTx(tx, latest!.parentCommitId) : null)
      : (latest ? (latest.contentSnapshot as ContentSnapshot) : null);
    const filesChanged = diffSnapshots(parentSnapRaw as ContentSnapshot | null, newSnap);

    if (collapsing) {
      await tx.update(commitsTable)
        .set({ contentSnapshot: newSnap, filesChanged, message: message || latest!.message })
        .where(eq(commitsTable.id, latest!.id));
      await tx.update(branchesTable)
        .set({ headCommitId: latest!.id })
        .where(eq(branchesTable.id, branchId));
      return;
    }

    if (latest && filesChanged.length === 0 && !message) return;

    const [created] = await tx.insert(commitsTable).values({
      projectId,
      branchId,
      parentCommitId: latest?.id ?? null,
      authorUserId: opts.authorUserId,
      message,
      contentSnapshot: newSnap,
      filesChanged,
      source,
    }).returning({ id: commitsTable.id });

    await tx.update(branchesTable)
      .set({ headCommitId: created.id, baseCommitId: latest ? undefined as never : created.id })
      .where(eq(branchesTable.id, branchId));
  });
}

async function loadCommitSnapshotTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  commitId: string,
): Promise<ContentSnapshot | null> {
  const [c] = await tx.select({ snap: commitsTable.contentSnapshot }).from(commitsTable)
    .where(eq(commitsTable.id, commitId)).limit(1);
  return (c?.snap as ContentSnapshot) ?? null;
}

