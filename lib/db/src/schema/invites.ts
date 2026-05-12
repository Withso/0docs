import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Admin-issued sign-up invites. The raw invite token is shown to the
 * admin (and emailed if SMTP is configured) but never stored — we keep
 * only its SHA-256 hash. Accepting an invite consumes it (acceptedAt is
 * set) and the row is preserved for audit history.
 *
 * Pairs with `users.is_admin`: when an invite carries `makeAdmin=true`,
 * the user created from the accepted invite is marked admin.
 */
export const invitesTable = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: varchar("token_hash").notNull().unique(),
    email: varchar("email").notNull(),
    invitedByUserId: varchar("invited_by_user_id").notNull(),
    makeAdmin: boolean("make_admin").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByUserId: varchar("accepted_by_user_id"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("invites_email_idx").on(t.email)],
);

export type Invite = typeof invitesTable.$inferSelect;
export type NewInvite = typeof invitesTable.$inferInsert;
