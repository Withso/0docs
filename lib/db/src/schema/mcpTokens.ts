import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// MCP bearer tokens. We store a sha256 hash of the secret — the raw token is
// only ever returned to the user once, at creation. Each token is scoped to a
// single project + user (the user it acts on behalf of).
export const mcpTokensTable = pgTable("mcp_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  userId: text("user_id").notNull(),
  // Human-readable label (e.g. "Cursor laptop", "Claude desktop").
  label: text("label").notNull().default(""),
  // sha256(rawToken) — base64url. Index for fast lookup on every MCP call.
  tokenHash: text("token_hash").notNull(),
  // Last 4 chars of the raw token, for UI display.
  lastFour: text("last_four").notNull().default(""),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (t) => ({
  byHash: index("mcp_tokens_hash_idx").on(t.tokenHash),
  byProject: index("mcp_tokens_project_idx").on(t.projectId),
}));

export const insertMcpTokenSchema = createInsertSchema(mcpTokensTable).omit({ id: true, createdAt: true });
export type InsertMcpToken = z.infer<typeof insertMcpTokenSchema>;
export type McpToken = typeof mcpTokensTable.$inferSelect;
