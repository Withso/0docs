import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
// In self-hosted mode the same table backs email/password sessions.
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
// Self-hosted mode adds passwordHash + isAdmin columns; Replit mode leaves
// them null and ignores them.
export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Self-hosted email/password auth. Null for Replit-OIDC users.
  passwordHash: varchar("password_hash"),
  isAdmin: boolean("is_admin").notNull().default(false),
  demoSeededAt: timestamp("demo_seeded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

// Self-hosted password reset tokens. One-shot, short-TTL, hashed at rest.
export const passwordResetTokensTable = pgTable(
  "password_reset_tokens",
  {
    tokenHash: varchar("token_hash").primaryKey(),
    userId: varchar("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("IDX_password_reset_user").on(t.userId)],
);

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
