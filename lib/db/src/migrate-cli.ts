import { pool } from "./index";
import { runMigrations } from "./migrate";

runMigrations()
  .then(() => {
    console.log("Migrations applied successfully");
    return pool.end();
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
