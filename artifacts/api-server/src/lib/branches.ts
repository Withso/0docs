import { db, branchesTable, projectsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Request } from "express";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string | undefined | null): s is string => typeof s === "string" && UUID_RE.test(s);

// Returns the default ("main") branch id for a project. Throws if the project
// has no default branch — that should be impossible after the P001 backfill.
export async function getDefaultBranchId(projectId: string): Promise<string> {
  const [b] = await db.select({ id: branchesTable.id }).from(branchesTable)
    .where(and(
      eq(branchesTable.projectId, projectId),
      eq(branchesTable.isDefault, true),
      isNull(branchesTable.deletedAt),
    ))
    .limit(1);
  if (!b) throw new Error(`Project ${projectId} has no default branch`);
  return b.id;
}

// Read the requested branch id from `?branchId=...` (or `X-Branch-Id` header),
// validate that it actually belongs to the project, and fall back to the
// project's default branch if absent or invalid. Existing clients that don't
// send a branch param keep working — they implicitly target main.
export async function resolveBranchId(req: Request, projectId: string): Promise<string> {
  const fromQuery = typeof req.query["branchId"] === "string" ? (req.query["branchId"] as string) : undefined;
  const fromHeader = typeof req.headers["x-branch-id"] === "string" ? (req.headers["x-branch-id"] as string) : undefined;
  const candidate = fromQuery || fromHeader;
  if (isUuid(candidate)) {
    const [b] = await db.select({ id: branchesTable.id }).from(branchesTable)
      .where(and(
        eq(branchesTable.id, candidate),
        eq(branchesTable.projectId, projectId),
        isNull(branchesTable.deletedAt),
      ))
      .limit(1);
    if (b) return b.id;
  }
  return getDefaultBranchId(projectId);
}

// Resolve the project id for a given branch id. Used by routes that only have
// a branchId (e.g. /branches/:id) and need to enforce ownership.
export async function projectIdForBranch(branchId: string): Promise<string | null> {
  if (!isUuid(branchId)) return null;
  const [b] = await db.select({ projectId: branchesTable.projectId }).from(branchesTable)
    .where(eq(branchesTable.id, branchId))
    .limit(1);
  return b?.projectId ?? null;
}

export async function userOwnsProject(projectId: string, userId: string): Promise<boolean> {
  const [p] = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);
  return !!p;
}
