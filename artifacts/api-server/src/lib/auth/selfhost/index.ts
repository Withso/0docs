import type { AuthProvider } from "../types";
import router from "./routes";

const provider: AuthProvider = {
  mode: "selfhost",
  router,
  // No periodic refresh needed — sessions are first-party and TTL-extended on
  // every getSession via the row's `expire` column when we choose to bump it.
  publicConfig: () => ({
    mode: "selfhost",
    // Hint for the UI: link the "Sign in" button at /auth (handled by the
    // SPA), not at the OIDC endpoint.
    loginUrl: "/auth",
    logoutUrl: "/api/logout",
    signupEnabled: process.env.SELFHOST_DISABLE_SIGNUP !== "true",
  }),
};

export default provider;
