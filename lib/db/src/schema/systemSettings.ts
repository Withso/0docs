import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Key/value bag for runtime-managed settings that need to survive
 * restarts but aren't tied to a specific user or project. The session
 * cookie signing secret lives here so a fresh deploy can auto-generate
 * one on first boot without forcing the operator to manage it.
 */
export const systemSettingsTable = pgTable("system_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type SystemSetting = typeof systemSettingsTable.$inferSelect;
