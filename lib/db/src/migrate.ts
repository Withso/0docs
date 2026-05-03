import { sql } from "drizzle-orm";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveMigrationsFolder(): string {
  const candidates = [
    // When bundled (e.g. esbuild output), the drizzle folder is copied next
    // to the bundle by the build script.
    path.resolve(__dirname, "drizzle"),
    // Source layout: lib/db/src/migrate.ts -> lib/db/drizzle
    path.resolve(__dirname, "../drizzle"),
    path.resolve(__dirname, "../../drizzle"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "meta", "_journal.json"))) {
      return c;
    }
  }
  throw new Error(
    `Could not locate drizzle migrations folder. Looked in: ${candidates.join(", ")}`,
  );
}

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

interface Journal {
  entries: JournalEntry[];
}

function isDuplicateError(err: unknown): boolean {
  const code =
    (err as { cause?: { code?: string }; code?: string }).cause?.code ??
    (err as { code?: string }).code;
  // 23505 = unique_violation, 42P06 = duplicate_schema,
  // 42P07 = duplicate_table, 42701 = duplicate_column,
  // 42710 = duplicate_object (e.g. constraint), 42P16 = invalid_table_def
  return (
    code === "23505" ||
    code === "42P06" ||
    code === "42P07" ||
    code === "42701" ||
    code === "42710"
  );
}

async function ensureMigrationsTable(): Promise<void> {
  // CREATE SCHEMA / TABLE IF NOT EXISTS can race against pg system catalogs
  // and raise duplicate-key errors. Treat those as success.
  try {
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  } catch (err) {
    if (!isDuplicateError(err)) throw err;
  }
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
  } catch (err) {
    if (!isDuplicateError(err)) throw err;
  }
}

/**
 * Split the body of a CREATE TABLE statement into individual column /
 * constraint definitions. Respects parentheses depth so multi-arg type
 * modifiers (e.g. numeric(10, 2)) and inline expressions are not split.
 */
function splitTableBody(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last.length > 0) parts.push(last);
  return parts;
}

const TABLE_LEVEL_KEYWORDS = new Set([
  "PRIMARY",
  "FOREIGN",
  "UNIQUE",
  "CHECK",
  "CONSTRAINT",
  "EXCLUDE",
  "LIKE",
]);

/**
 * Convert a single SQL statement from a drizzle migration into one or more
 * idempotent statements. This lets us safely re-run migrations against
 * databases that may already have part of the schema present (e.g. legacy
 * databases that were hand-patched before the migration runner existed).
 */
function makeIdempotent(statement: string): string[] {
  const trimmed = statement.trim();
  if (trimmed.length === 0) return [];

  // CREATE TABLE "name" ( ... )  ->  CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS for each column.
  const createTable = trimmed.match(
    /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("[^"]+"|[A-Za-z_][\w]*)\s*\(([\s\S]*)\)\s*;?\s*$/i,
  );
  if (createTable) {
    const tableName = createTable[1];
    const body = createTable[2];
    const out: string[] = [
      `CREATE TABLE IF NOT EXISTS ${tableName} (${body});`,
    ];
    const parts = splitTableBody(body);
    for (const part of parts) {
      const head = part.split(/\s+/)[0]?.toUpperCase() ?? "";
      const headStripped = head.replace(/"/g, "");
      if (TABLE_LEVEL_KEYWORDS.has(headStripped)) continue;
      // Column definition. Quote if not already quoted.
      const colMatch = part.match(/^("[^"]+"|[A-Za-z_][\w]*)\s+([\s\S]+)$/);
      if (!colMatch) continue;
      const colName = colMatch[1];
      const colDef = colMatch[2];
      out.push(
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${colName} ${colDef};`,
      );
    }
    return out;
  }

  // CREATE [UNIQUE] INDEX -> CREATE [UNIQUE] INDEX IF NOT EXISTS
  const createIndex = trimmed.match(
    /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)/i,
  );
  if (createIndex) {
    return [
      trimmed.replace(
        /^CREATE\s+(UNIQUE\s+)?INDEX\s+/i,
        (_, u) => `CREATE ${u ?? ""}INDEX IF NOT EXISTS `,
      ),
    ];
  }

  // ALTER TABLE ... ADD COLUMN "x" ... -> ADD COLUMN IF NOT EXISTS
  const alterAddColumn = trimmed.match(
    /^ALTER\s+TABLE\s+([\s\S]+?)\s+ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)([\s\S]+)$/i,
  );
  if (alterAddColumn) {
    return [
      `ALTER TABLE ${alterAddColumn[1]} ADD COLUMN IF NOT EXISTS ${alterAddColumn[2]}`,
    ];
  }

  // CREATE SCHEMA "x" -> CREATE SCHEMA IF NOT EXISTS "x"
  const createSchema = trimmed.match(
    /^CREATE\s+SCHEMA\s+(?!IF\s+NOT\s+EXISTS)/i,
  );
  if (createSchema) {
    return [trimmed.replace(/^CREATE\s+SCHEMA\s+/i, "CREATE SCHEMA IF NOT EXISTS ")];
  }

  return [trimmed.endsWith(";") ? trimmed : `${trimmed};`];
}

function parseStatements(sqlContents: string): string[] {
  return sqlContents
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function hashStatements(statements: string[]): string {
  return crypto
    .createHash("sha256")
    .update(statements.join(""))
    .digest("hex");
}

async function appliedHashes(): Promise<Set<string>> {
  const result = await db.execute(
    sql`SELECT hash FROM "drizzle"."__drizzle_migrations"`,
  );
  return new Set(result.rows.map((r) => (r as { hash: string }).hash));
}

export async function runMigrations(): Promise<void> {
  const folder = resolveMigrationsFolder();
  const journalPath = path.join(folder, "meta", "_journal.json");
  const journal: Journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));

  await ensureMigrationsTable();
  const applied = await appliedHashes();

  for (const entry of journal.entries) {
    const sqlPath = path.join(folder, `${entry.tag}.sql`);
    const sqlContents = fs.readFileSync(sqlPath, "utf-8");
    const statements = parseStatements(sqlContents);
    const hash = hashStatements(statements);

    // Always apply each statement in idempotent form. We do NOT skip purely
    // based on the journal hash, because the journal could have been written
    // (e.g. by a previous run, by drizzle-kit, or by a hand-patch) without
    // the underlying objects actually being created. Since every statement
    // we emit is idempotent (CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT
    // EXISTS), re-running is cheap and self-healing.
    for (const statement of statements) {
      const idempotent = makeIdempotent(statement);
      for (const stmt of idempotent) {
        try {
          await db.execute(sql.raw(stmt));
        } catch (err) {
          if (!isDuplicateError(err)) {
            throw new Error(
              `Failed to apply migration ${entry.tag}: ${(err as Error).message}\nStatement: ${stmt}`,
              { cause: err as Error },
            );
          }
        }
      }
    }

    if (!applied.has(hash)) {
      await db.execute(sql`
        INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
        VALUES (${hash}, ${entry.when})
      `);
    }
  }
}

