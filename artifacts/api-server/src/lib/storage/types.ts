/**
 * Storage adapter contract. The upload route hands a buffer + metadata
 * to `put`; serving routes fetch bytes back via `get`. Adapters keep
 * adapter-specific knowledge (S3 keys, Postgres blob rows) behind the
 * opaque `storageKey` string they return.
 */
export interface StorageAdapter {
  /** Adapter name, also written to media_assets.storage. */
  readonly name: "postgres" | "s3";

  /**
   * Persist bytes. Returns the storage key needed to retrieve them later.
   * The adapter decides what goes into the key (an S3 bucket path, the
   * asset id, etc.); callers must treat it as opaque.
   */
  put(input: {
    assetId: string;
    buffer: Buffer;
    mimeType: string;
    filename: string;
  }): Promise<{ storageKey: string }>;

  /**
   * Fetch bytes back for streaming to the client. Returns null if the
   * underlying object is missing.
   */
  get(storageKey: string): Promise<{
    body: Buffer | NodeJS.ReadableStream;
    sizeBytes: number;
    mimeType?: string;
  } | null>;

  delete(storageKey: string): Promise<void>;
}

export class StorageError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
    this.name = "StorageError";
  }
}
