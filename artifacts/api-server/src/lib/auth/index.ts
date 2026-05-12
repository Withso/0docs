import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import authRoutes from "./routes";

export * from "./shared";

/**
 * Mount the email + password auth routes plus the shared `/auth/user` and
 * `/auth/config` endpoints.
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
    res.json({
      loginUrl: "/auth",
      logoutUrl: "/api/logout",
      signupEnabled: process.env.DISABLE_SIGNUP !== "true",
    });
  });

  router.use(authRoutes);

  return router;
}
