import path from "node:path";
import { logger } from "../logger";
import type { StorageAdapter } from "./types";
import { StorageError } from "./types";

/**
 * S3-compatible adapter. Works with AWS S3, Cloudflare R2, Backblaze B2,
 * MinIO, and any other service speaking the S3 API. Configure via env:
 *
 *   S3_BUCKET            (required)
 *   S3_REGION            (required; e.g. "us-east-1", "auto" for R2)
 *   S3_ACCESS_KEY_ID     (required)
 *   S3_SECRET_ACCESS_KEY (required)
 *   S3_ENDPOINT          (optional; default = AWS. Set for R2/B2/MinIO)
 *   S3_PUBLIC_BASE_URL   (optional; defaults to the bucket's S3 URL)
 *   S3_FORCE_PATH_STYLE  (optional; "true" for MinIO / older endpoints)
 *
 * @aws-sdk/client-s3 is loaded lazily so installs that don't use S3 don't
 * pay the dependency cost.
 */

interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
}

function readConfig(): S3Config | null {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return {
    bucket,
    region,
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || undefined,
  };
}

interface LoadedSdk {
  Client: any;
  PutObjectCommand: any;
  GetObjectCommand: any;
  DeleteObjectCommand: any;
}

let sdkPromise: Promise<LoadedSdk> | null = null;
async function loadSdk(): Promise<LoadedSdk> {
  if (!sdkPromise) {
    // Indirection keeps TS / esbuild from forcing the install at build time.
    sdkPromise = (async () => {
      const modName = "@aws-sdk/client-s3";
      const mod = (await import(/* @vite-ignore */ modName)) as any;
      return {
        Client: mod.S3Client,
        PutObjectCommand: mod.PutObjectCommand,
        GetObjectCommand: mod.GetObjectCommand,
        DeleteObjectCommand: mod.DeleteObjectCommand,
      };
    })();
  }
  return sdkPromise;
}

function sanitizeFilename(name: string): string {
  // S3 keys can technically contain almost anything, but we keep them
  // simple so URLs are pleasant and there's no escaping to think about.
  const ext = path.extname(name).toLowerCase().slice(0, 16);
  return `${Date.now().toString(36)}${ext}`;
}

export function s3StorageOrNull(): StorageAdapter | null {
  const cfg = readConfig();
  if (!cfg) return null;

  let clientPromise: Promise<any> | null = null;
  async function getClient(): Promise<any> {
    if (!clientPromise) {
      clientPromise = (async () => {
        const sdk = await loadSdk();
        return new sdk.Client({
          region: cfg!.region,
          endpoint: cfg!.endpoint,
          forcePathStyle: cfg!.forcePathStyle,
          credentials: {
            accessKeyId: cfg!.accessKeyId,
            secretAccessKey: cfg!.secretAccessKey,
          },
        });
      })();
    }
    return clientPromise;
  }

  return {
    name: "s3",

    async put({ assetId, buffer, mimeType, filename }) {
      const sdk = await loadSdk();
      const client = await getClient();
      const key = `uploads/${assetId}/${sanitizeFilename(filename)}`;
      try {
        await client.send(
          new sdk.PutObjectCommand({
            Bucket: cfg.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ContentLength: buffer.byteLength,
          }),
        );
        return { storageKey: key };
      } catch (err) {
        logger.error({ err }, "[storage:s3] put failed");
        throw new StorageError("Failed to upload to object storage", 502);
      }
    },

    async get(storageKey) {
      const sdk = await loadSdk();
      const client = await getClient();
      try {
        const out = await client.send(
          new sdk.GetObjectCommand({ Bucket: cfg.bucket, Key: storageKey }),
        );
        if (!out.Body) return null;
        return {
          body: out.Body as NodeJS.ReadableStream,
          sizeBytes: Number(out.ContentLength ?? 0),
          mimeType: out.ContentType,
        };
      } catch (err: unknown) {
        const code = (err as { name?: string; Code?: string }).name
          ?? (err as { Code?: string }).Code;
        if (code === "NoSuchKey" || code === "NotFound") return null;
        logger.error({ err }, "[storage:s3] get failed");
        throw new StorageError("Failed to read from object storage", 502);
      }
    },

    async delete(storageKey) {
      const sdk = await loadSdk();
      const client = await getClient();
      try {
        await client.send(
          new sdk.DeleteObjectCommand({ Bucket: cfg.bucket, Key: storageKey }),
        );
      } catch (err) {
        logger.warn({ err }, "[storage:s3] delete failed; orphan in bucket");
      }
    },
  };
}
