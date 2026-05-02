import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// SHARED_DATABASE_URL lets dev and production point at a single shared database.
// When set, it takes precedence over the auto-provisioned DATABASE_URL so that
// `replit publish` deployments connect to the same data the user works with locally.
const connectionString =
  process.env.SHARED_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
