import { Router } from "express";
import { db, pageFeedbackTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Submit feedback (no auth - public)
router.post("/feedback", async (req: any, res) => {
  try {
    const { pageId, isHelpful, comment } = req.body;
    const [feedback] = await db.insert(pageFeedbackTable).values({ pageId, isHelpful, comment: comment ?? null }).returning();
    res.status(201).json(feedback);
  } catch (err) {
    req.log.error({ err }, "Failed to submit feedback");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get feedback for page
router.get("/feedback/:pageId", async (req: any, res) => {
  try {
    const feedback = await db.select().from(pageFeedbackTable).where(eq(pageFeedbackTable.pageId, req.params.pageId));
    res.json(feedback);
  } catch (err) {
    req.log.error({ err }, "Failed to get feedback");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
