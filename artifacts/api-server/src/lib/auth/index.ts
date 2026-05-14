import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import authRoutes from "./routes";
import adminRoutes from "./admin";

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

  router.get("/auth/config", async (_req: Request, res: Response) => {
    // `hasAnyUser` lets the frontend pick the right Auth-page default:
    // signup on a brand-new instance (so the very first visitor sets up
    // the bootstrap admin), signin otherwise.
    const [firstUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .limit(1);
    res.json({
      loginUrl: "/auth",
      logoutUrl: "/api/logout",
      signupEnabled: process.env.DISABLE_SIGNUP !== "true",
      hasAnyUser: !!firstUser,
    });
  });

  router.use(authRoutes);
  router.use(adminRoutes);

  return router;
}
