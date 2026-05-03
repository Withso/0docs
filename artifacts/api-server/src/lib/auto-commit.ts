import type { Request } from "express";
import { recordCommit } from "./commits";

// Fire-and-forget auto-commit. Never blocks the response and never raises —
// failures are logged but don't surface as user errors. Use this from every
// write handler so the activity feed and PR diffs always have fresh data.
export function fireAutoCommit(
  req: Request,
  args: {
    projectId: string;
    branchId: string;
    message?: string;
    source?: "editor" | "merge" | "github-pull" | "manual";
  },
): void {
  const userId = req.user?.id ?? null;
  void recordCommit({ ...args, authorUserId: userId }).catch((err) => {
    req.log.error({ err, branchId: args.branchId }, "auto-commit failed");
  });
}
