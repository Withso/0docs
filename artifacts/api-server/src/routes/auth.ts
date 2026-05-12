// Thin shim — the real auth wiring lives in `lib/auth/`. This file exists
// so the routes/index.ts mounting list looks the same as every other route
// module.
import { buildAuthRouter } from "../lib/auth";

export default buildAuthRouter();
