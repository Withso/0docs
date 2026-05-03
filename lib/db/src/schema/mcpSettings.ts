import { pgTable, text, boolean, timestamp, uuid, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Per-project MCP server settings. One row per project; created lazily on
// first read with sane defaults pulled from env vars.
export const mcpSettingsTable = pgTable("mcp_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  // Master switch — turns the /api/mcp endpoint on/off for this project.
  enabled: boolean("enabled").notNull().default(true),
  // Allow unauthenticated callers to use read-only tools. Mirrors Mintlify's
  // "public MCP" toggle.
  allowAnonymous: boolean("allow_anonymous").notNull().default(false),
  // List of tool names that are explicitly disabled. Empty = all tools on.
  disabledTools: jsonb("disabled_tools").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  uniqProject: uniqueIndex("mcp_settings_project_unique_idx").on(t.projectId),
}));

export const insertMcpSettingsSchema = createInsertSchema(mcpSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMcpSettings = z.infer<typeof insertMcpSettingsSchema>;
export type McpSettings = typeof mcpSettingsTable.$inferSelect;
