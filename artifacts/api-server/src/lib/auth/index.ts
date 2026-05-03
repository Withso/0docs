import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import replitProvider from "./replit";
import selfhostProvider from "./selfhost";
import { getAuthMode, type AuthProvider } from "./types";

export * from "./shared";
export type { AuthMode, AuthProvider } from "./types";

const mode = getAuthMode();
export const provider: AuthProvider =
  mode === "selfhost" ? selfhostProvider : replitProvider;

/**
 * Mount the active provider's routes plus the shared, mode-agnostic auth
 * endpoints (`/auth/user`, `/auth/config`).
 */
export function buildAuthRouter(): IRouter {
  const router: IRouter = Router();

  router.get("/auth/user", (req: Request, res: Response) => {
    res.json(
      GetCurrentAuthUserResponse.parse({
        user: req.isAuthenticated() ? req.user : null,
      }),
    );
  });

  router.get("/auth/config", (_req: Request, res: Response) => {
    res.json(provider.publicConfig());
  });

  router.use(provider.router);

  return router;
}
