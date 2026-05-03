import { eq, inArray, sql } from "drizzle-orm";
import {
  db,
  projectsTable,
  pagesTable,
  navGroupsTable,
  sectionsTable,
  blocksTable,
  projectDesignSettingsTable,
  tabsTable,
  docVersionsTable,
  usersTable,
} from "@workspace/db";

const DEMO_PROJECT_NAME = "0docs Demo";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "demo";
}

/**
 * Idempotently clone the project flagged isHomepage=true into the given user's
 * account as a fully-detached "0docs Demo" snapshot. Safe to call multiple
 * times: a row-lock on the user and a `demoSeededAt` marker prevent dupes.
 *
 * Returns the cloned project id on success, or null if the seed was skipped
 * (already done, no homepage exists, or the user record is missing).
 *
 * Logs and swallows errors — callers should never block login on this.
 */
export async function ensureDemoProjectForUser(
  userId: string,
): Promise<string | null> {
  try {
    return await db.transaction(async (tx) => {
      const lockedUsers = await tx.execute<{
        id: string;
        demo_seeded_at: Date | null;
      }>(
        sql`select id, demo_seeded_at from ${usersTable} where id = ${userId} for update`,
      );
      const lockedUser = lockedUsers.rows?.[0];
      if (!lockedUser) return null;
      if (lockedUser.demo_seeded_at) return null;

      const [src] = await tx
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.isHomepage, true))
        .limit(1);
      if (!src) {
        // No homepage to clone — mark seeded so we don't keep retrying every login.
        await tx
          .update(usersTable)
          .set({ demoSeededAt: new Date() })
          .where(eq(usersTable.id, userId));
        return null;
      }

      // Build a unique slug per user. Suffix with a short random fragment so
      // even a user who previously deleted a demo and logs in fresh elsewhere
      // can't collide.
      const baseSlug = slugify(`${DEMO_PROJECT_NAME}-${userId}`);
      const newSlug = `${baseSlug}-${Date.now().toString(36)}`;

      const [created] = await tx
        .insert(projectsTable)
        .values({
          name: DEMO_PROJECT_NAME,
          slug: newSlug,
          description: src.description,
          userId,
          // Never mark the cloned project as homepage — there is exactly one
          // canonical homepage and it lives in the source-of-truth account.
          isHomepage: false,
        })
        .returning();

      // ── Versions: clone, build id map. Pages reference these via versionId.
      const srcVersions = await tx
        .select()
        .from(docVersionsTable)
        .where(eq(docVersionsTable.projectId, src.id));
      const versionIdMap = new Map<string, string>();
      if (srcVersions.length > 0) {
        const newVersions = await tx
          .insert(docVersionsTable)
          .values(
            srcVersions.map((v) => ({
              projectId: created.id,
              versionLabel: v.versionLabel,
              isDefault: v.isDefault,
            })),
          )
          .returning();
        srcVersions.forEach((v, i) =>
          versionIdMap.set(v.id, newVersions[i].id),
        );
      }

      // ── Tabs: clone, build id map. Nav groups reference these via tabId.
      const srcTabs = await tx
        .select()
        .from(tabsTable)
        .where(eq(tabsTable.projectId, src.id))
        .orderBy(tabsTable.orderIndex);
      const tabIdMap = new Map<string, string>();
      if (srcTabs.length > 0) {
        const newTabs = await tx
          .insert(tabsTable)
          .values(
            srcTabs.map((t) => ({
              projectId: created.id,
              label: t.label,
              icon: t.icon,
              orderIndex: t.orderIndex,
              metadata: t.metadata ?? {},
            })),
          )
          .returning();
        srcTabs.forEach((t, i) => tabIdMap.set(t.id, newTabs[i].id));
      }

      // ── Nav groups
      const srcGroups = await tx
        .select()
        .from(navGroupsTable)
        .where(eq(navGroupsTable.projectId, src.id))
        .orderBy(navGroupsTable.orderIndex);
      const groupIdMap = new Map<string, string>();
      if (srcGroups.length > 0) {
        const newGroups = await tx
          .insert(navGroupsTable)
          .values(
            srcGroups.map((g) => ({
              projectId: created.id,
              title: g.title,
              type: g.type,
              orderIndex: g.orderIndex,
              tabId: g.tabId ? tabIdMap.get(g.tabId) ?? null : null,
              metadata: g.metadata ?? {},
            })),
          )
          .returning();
        srcGroups.forEach((g, i) => groupIdMap.set(g.id, newGroups[i].id));
      }

      // ── Pages (one per row insert so we can capture the new id mapping in
      // a single batch).
      const srcPages = await tx
        .select()
        .from(pagesTable)
        .where(eq(pagesTable.projectId, src.id))
        .orderBy(pagesTable.orderIndex);
      const pageIdMap = new Map<string, string>();
      if (srcPages.length > 0) {
        const newPages = await tx
          .insert(pagesTable)
          .values(
            srcPages.map((p) => ({
              projectId: created.id,
              title: p.title,
              slug: p.slug,
              orderIndex: p.orderIndex,
              metaDescription: p.metaDescription,
              navGroupId: p.navGroupId
                ? groupIdMap.get(p.navGroupId) ?? null
                : null,
              navTitle: p.navTitle,
              versionId: p.versionId
                ? versionIdMap.get(p.versionId) ?? null
                : null,
              metadata: p.metadata ?? {},
            })),
          )
          .returning();
        srcPages.forEach((p, i) => pageIdMap.set(p.id, newPages[i].id));
      }

      // ── Sections (bulk fetch + bulk insert across ALL pages)
      const sectionIdMap = new Map<string, string>();
      if (srcPages.length > 0) {
        const srcSections = await tx
          .select()
          .from(sectionsTable)
          .where(
            inArray(
              sectionsTable.pageId,
              srcPages.map((p) => p.id),
            ),
          )
          .orderBy(sectionsTable.orderIndex);
        if (srcSections.length > 0) {
          const newSections = await tx
            .insert(sectionsTable)
            .values(
              srcSections.map((s) => ({
                pageId: pageIdMap.get(s.pageId)!,
                title: s.title,
                navTitle: s.navTitle,
                orderIndex: s.orderIndex,
              })),
            )
            .returning();
          srcSections.forEach((s, i) =>
            sectionIdMap.set(s.id, newSections[i].id),
          );

          // ── Blocks (bulk fetch + bulk insert across ALL sections)
          const srcBlocks = await tx
            .select()
            .from(blocksTable)
            .where(
              inArray(
                blocksTable.sectionId,
                srcSections.map((s) => s.id),
              ),
            )
            .orderBy(blocksTable.orderIndex);
          if (srcBlocks.length > 0) {
            await tx.insert(blocksTable).values(
              srcBlocks.map((b) => ({
                sectionId: sectionIdMap.get(b.sectionId)!,
                type: b.type,
                content: b.content,
                orderIndex: b.orderIndex,
              })),
            );
          }
        }
      }

      // ── Design settings
      const [srcDesign] = await tx
        .select()
        .from(projectDesignSettingsTable)
        .where(eq(projectDesignSettingsTable.projectId, src.id));
      if (srcDesign) {
        await tx
          .insert(projectDesignSettingsTable)
          .values({ projectId: created.id, settings: srcDesign.settings });
      }

      await tx
        .update(usersTable)
        .set({ demoSeededAt: new Date() })
        .where(eq(usersTable.id, userId));

      return created.id;
    });
  } catch (err) {
    console.error("[ensureDemoProjectForUser] failed", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
