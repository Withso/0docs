import express, { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { Readable } from "node:stream";
import {
  db,
  mediaAssetsTable,
  projectsTable,
  publishedVersionsTable,
} from "@workspace/db";
import { activeStorage, adapterFor, StorageError } from "../lib/storage";

const router: IRouter = Router();

const MAX_UPLOAD_BYTES = (() => {
  const raw = process.env.MAX_UPLOAD_BYTES;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 20 * 1024 * 1024; // 20 MB default
})();

// Allowed top-level mime categories. Keeps the upload endpoint scoped to
// media; arbitrary file types (think installers, .zip dumps) can still be
// pasted as external URLs into a file block.
const ALLOWED_PREFIXES = ["image/", "video/", "audio/", "application/pdf"];

function isAllowedMime(mime: string): boolean {
  return ALLOWED_PREFIXES.some((p) =>
    p.endsWith("/") ? mime.startsWith(p) : mime === p,
  );
}

function safeFilename(name: string): string {
  // Strip path components and control chars; keep something human-readable.
  const base = name.replace(/[\\/]/g, "_").replace(/[\x00-\x1f]/g, "");
  return base.slice(0, 200) || "upload";
}

/**
 * POST /api/uploads
 *
 * Body: raw bytes (any binary)
 * Query: projectId, filename, mimeType
 *
 * Auth: caller must own the project. Returns
 *   { id, url, filename, mimeType, sizeBytes }
 *
 * The returned `url` is `/api/uploads/<id>` and slots directly into image
 * / video / file block content fields. It's a same-origin path so it
 * works behind any reverse proxy.
 */
router.post(
  "/uploads",
  express.raw({ type: "*/*", limit: MAX_UPLOAD_BYTES }),
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Sign in to upload media." });
      return;
    }

    const projectId = String(req.query.projectId ?? "");
    const filenameRaw = String(req.query.filename ?? "upload");
    const mimeType = String(req.query.mimeType ?? "");

    if (!projectId) {
      res.status(400).json({ error: "projectId query param is required." });
      return;
    }
    if (!mimeType || !isAllowedMime(mimeType)) {
      res.status(400).json({ error: "Unsupported mimeType." });
      return;
    }

    const body = req.body;
    if (!Buffer.isBuffer(body) || body.byteLength === 0) {
      res.status(400).json({ error: "Empty upload body." });
      return;
    }

    const [project] = await db
      .select({ id: projectsTable.id, userId: projectsTable.userId })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);
    if (!project || project.userId !== req.user.id) {
      res.status(403).json({ error: "Project not found or access denied." });
      return;
    }

    const storage = activeStorage();
    const [created] = await db
      .insert(mediaAssetsTable)
      .values({
        projectId,
        filename: safeFilename(filenameRaw),
        mimeType,
        sizeBytes: body.byteLength,
        storage: storage.name,
        storageKey: "", // overwritten below
        uploadedByUserId: req.user.id,
      })
      .returning();

    try {
      const { storageKey } = await storage.put({
        assetId: created.id,
        buffer: body,
        mimeType,
        filename: created.filename,
      });
      await db
        .update(mediaAssetsTable)
        .set({ storageKey })
        .where(eq(mediaAssetsTable.id, created.id));

      res.json({
        id: created.id,
        url: `/api/uploads/${created.id}`,
        filename: created.filename,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes,
      });
    } catch (err) {
      // Roll back the metadata row if the storage put failed, so a failed
      // upload doesn't leave a dangling row pointing at nothing.
      await db
        .delete(mediaAssetsTable)
        .where(eq(mediaAssetsTable.id, created.id))
        .catch(() => undefined);
      if (err instanceof StorageError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      req.log.error({ err }, "[uploads] put failed");
      res.status(500).json({ error: "Upload failed." });
    }
  },
);

/**
 * GET /api/uploads/:id
 *
 * Streams the asset back to the client. Public when the project is
 * published; otherwise restricted to the project owner. Cached with a
 * long max-age since asset ids are immutable.
 */
router.get("/uploads/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const [asset] = await db
    .select()
    .from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.id, id))
    .limit(1);
  if (!asset) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  const [project] = await db
    .select({ userId: projectsTable.userId })
    .from(projectsTable)
    .where(eq(projectsTable.id, asset.projectId))
    .limit(1);

  const isOwner = req.isAuthenticated() && project?.userId === req.user.id;
  let isPublic = false;
  if (!isOwner) {
    // Public if the project has any published version active.
    const [pv] = await db
      .select({ id: publishedVersionsTable.id })
      .from(publishedVersionsTable)
      .where(
        and(
          eq(publishedVersionsTable.projectId, asset.projectId),
          eq(publishedVersionsTable.isActive, true),
        ),
      )
      .limit(1);
    isPublic = !!pv;
  }

  if (!isOwner && !isPublic) {
    res.status(403).json({ error: "Access denied." });
    return;
  }

  try {
    const fetched = await adapterFor(asset.storage).get(asset.storageKey);
    if (!fetched) {
      res.status(404).json({ error: "Asset bytes missing." });
      return;
    }
    res.setHeader("Content-Type", fetched.mimeType ?? asset.mimeType);
    res.setHeader("Content-Length", String(fetched.sizeBytes));
    res.setHeader(
      "Cache-Control",
      isPublic ? "public, max-age=31536000, immutable" : "private, max-age=300",
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${asset.filename.replace(/"/g, "")}"`,
    );

    if (Buffer.isBuffer(fetched.body)) {
      res.end(fetched.body);
    } else {
      // ReadableStream → pipe through.
      const stream = fetched.body as NodeJS.ReadableStream;
      Readable.from(stream as any).pipe(res);
    }
  } catch (err) {
    if (err instanceof StorageError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "[uploads] get failed");
    res.status(500).json({ error: "Read failed." });
  }
});

export default router;
