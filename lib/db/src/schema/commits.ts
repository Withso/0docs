import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Internal "git" commits. Each commit captures a content snapshot of the
// branch at write time plus a list of file-level changes since the parent.
// This is the substrate the activity feed, diffs, and PRs all read from.
export const commitsTable = pgTable("commits", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  branchId: uuid("branch_id").notNull(),
  parentCommitId: uuid("parent_commit_id"),
  authorUserId: text("author_user_id"),
  message: text("message").notNull().default(""),
  // Full content snapshot at this commit (pages/sections/blocks/nav_groups/
  // tabs/design_settings) — denormalized so we can render history without
  // chasing pointers, and so commits stay readable even after a branch is
  // deleted. We can swap to content-addressed storage later if size matters.
  contentSnapshot: jsonb("content_snapshot").notNull().default({}),
  // Compact diff against parent: [{ path, status, before?, after? }]
  filesChanged: jsonb("files_changed").notNull().default([]),
  // Optional source tag — "editor" (auto-commit on save), "merge",
  // "github-pull" (commit synced from external repo), etc.
  source: text("source").notNull().default("editor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byBranch: index("commits_branch_idx").on(t.branchId),
  byProject: index("commits_project_idx").on(t.projectId),
}));

export const insertCommitSchema = createInsertSchema(commitsTable).omit({ id: true, createdAt: true });
export type InsertCommit = z.infer<typeof insertCommitSchema>;
export type Commit = typeof commitsTable.$inferSelect;
