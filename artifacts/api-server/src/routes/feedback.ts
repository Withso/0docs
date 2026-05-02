import { Router, Request, Response } from "express";
import { db, pageFeedbackTable, pagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COMMENT_LEN = 2000;

// Submit feedback (no auth - public). Validates inputs and ensures the page
// exists before writing, so the public form can't be used to spam arbitrary
// rows into the table.
router.post("/feedback", async (req: Request, res: Response) => {
  try {
    const { pageId, isHelpful, comment } = req.body as {
      pageId?: unknown; isHelpful?: unknown; comment?: unknown;
    };
    if (typeof pageId !== "string" || !UUID_RE.test(pageId)) {
      res.status(400).json({ error: "pageId must be a UUID" }); return;
    }
    if (typeof isHelpful !== "boolean") {
      res.status(400).json({ error: "isHelpful must be a boolean" }); return;
    }
    let normalizedComment: string | null = null;
    if (comment != null) {
      if (typeof comment !== "string") {
        res.status(400).json({ error: "comment must be a string" }); return;
      }
      if (comment.length > MAX_COMMENT_LEN) {
        res.status(400).json({ error: `comment exceeds ${MAX_COMMENT_LEN} chars` }); return;
      }
      normalizedComment = comment.trim() || null;
    }

    const [page] = await db.select({ id: pagesTable.id }).from(pagesTable)
      .where(eq(pagesTable.id, pageId)).limit(1);
    if (!page) { res.status(404).json({ error: "page not found" }); return; }

    const [feedback] = await db.insert(pageFeedbackTable)
      .values({ pageId, isHelpful, comment: normalizedComment })
      .returning();
    res.status(201).json(feedback);
  } catch (err) {
    req.log.error({ err }, "Failed to submit feedback");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get feedback for page
router.get("/feedback/:pageId", async (req: Request<{ pageId: string }>, res: Response) => {
  try {
    const feedback = await db.select().from(pageFeedbackTable)
      .where(eq(pageFeedbackTable.pageId, req.params.pageId));
    res.json(feedback);
  } catch (err) {
    req.log.error({ err }, "Failed to get feedback");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
