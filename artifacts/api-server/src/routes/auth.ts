import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";
import { ensureDemoProjectForUser } from "../lib/clone-homepage";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

type PgErrorShape = {
  name?: string;
  message?: string;
  code?: string;
  detail?: string;
  schema?: string;
  table?: string;
  column?: string;
  constraint?: string;
  cause?: PgErrorShape;
};

function describeDbError(err: unknown): Record<string, unknown> {
  const e = err as PgErrorShape;
  return {
    name: e?.name,
    message: e?.message,
    code: e?.code,
    detail: e?.detail,
    schema: e?.schema,
    table: e?.table,
    column: e?.column,
    constraint: e?.constraint,
    cause: e?.cause
      ? {
          name: e.cause.name,
          message: e.cause.message,
          code: e.cause.code,
          detail: e.cause.detail,
          schema: e.cause.schema,
          table: e.cause.table,
          column: e.cause.column,
          constraint: e.cause.constraint,
        }
      : undefined,
  };
}

async function upsertUser(claims: Record<string, unknown>) {
  const id = String(claims.sub ?? "");
  const email = (claims.email as string) || null;
  const firstName = (claims.first_name as string) || null;
  const lastName = (claims.last_name as string) || null;
  const profileImageUrl =
    ((claims.profile_image_url as string | undefined) ||
      (claims.picture as string | undefined)) ??
    null;

  if (!id) {
    throw new Error("upsertUser: missing claims.sub");
  }

  // Use explicit SELECT-then-UPDATE-or-INSERT instead of ON CONFLICT DO UPDATE.
  // Some Postgres providers (Neon) intermittently reject ON CONFLICT updates
  // that touch the conflict-target column; this pattern sidesteps that and is
  // also easier to reason about / log.
  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (existing.length > 0) {
      const [user] = await db
        .update(usersTable)
        .set({
          email,
          firstName,
          lastName,
          profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, id))
        .returning();
      return user;
    }

    const [user] = await db
      .insert(usersTable)
      .values({ id, email, firstName, lastName, profileImageUrl })
      .returning();
    return user;
  } catch (err: unknown) {
    console.error("[upsertUser] failed", {
      ...describeDbError(err),
      userData: { id, email, firstName, lastName, profileImageUrl },
    });
    throw err;
  }
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  try {
    const dbUser = await upsertUser(
      claims as unknown as Record<string, unknown>,
    );

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);

    // First-login demo seed. Idempotent + non-blocking on failure (the helper
    // catches its own errors). Awaited so the user lands in a populated
    // workspace without a perceptible stall.
    await ensureDemoProjectForUser(dbUser.id);

    res.redirect(returnTo);
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; cause?: { message?: string; code?: string } };
    req.log.error(
      {
        err,
        errMessage: e?.message,
        errCode: e?.code,
        causeMessage: e?.cause?.message,
        causeCode: e?.cause?.code,
        sub: claims.sub,
        email: claims.email,
      },
      "[callback] upsert/session failed",
    );
    res.redirect("/api/login?error=callback");
  }
});

router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }

    const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

    try {
      const config = await getOidcConfig();

      const callbackUrl = new URL(redirect_uri);
      callbackUrl.searchParams.set("code", code);
      callbackUrl.searchParams.set("state", state);
      callbackUrl.searchParams.set("iss", ISSUER_URL);

      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: code_verifier,
        expectedNonce: nonce ?? undefined,
        expectedState: state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: "No claims in ID token" });
        return;
      }

      const dbUser = await upsertUser(
        claims as unknown as Record<string, unknown>,
      );

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      };

      const sid = await createSession(sessionData);
      await ensureDemoProjectForUser(dbUser.id);
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      req.log.error({ err }, "Mobile token exchange error");
      res.status(500).json({ error: "Token exchange failed" });
    }
  },
);

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
