import crypto from "node:crypto";
import { db, mcpTokensTable, mcpSettingsTable, projectsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import type { Request } from "express";
import { getSessionId, getSession } from "../auth/shared";

export interface McpCallerContext {
  // The user the call acts on behalf of, or null when anonymous.
  userId: string | null;
  // The project this token is scoped to (when authed via token). For session
  // auth this is set at tool-call time from the projectId argument.
  scopedProjectId: string | null;
  // True when the caller is the project's owner (i.e. they can perform writes).
  isOwner: boolean;
  // True when the caller is unauthenticated and using anonymous access.
  isAnonymous: boolean;
  // The token row id we matched (for last-used updates), if any.
  tokenId: string | null;
}

const MCP_TOKEN_PREFIX = "mcp_";

export function hashMcpToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("base64url");
}

export function generateMcpToken(): { raw: string; hash: string; lastFour: string } {
  // 32 bytes of entropy, encoded base64url → 43 chars. Prefix makes the token
  // self-describing in logs/screenshots.
  const random = crypto.randomBytes(32).toString("base64url");
  const raw = `${MCP_TOKEN_PREFIX}${random}`;
  return { raw, hash: hashMcpToken(raw), lastFour: raw.slice(-4) };
}

// Resolve the caller for an MCP request. Token auth is preferred (it lets the
// MCP server work without a browser session); session-cookie fallback keeps
// the in-app "test the MCP server" flow working without minting a token.
export async function resolveMcpCaller(req: Request): Promise<McpCallerContext> {
  const authHeader = typeof req.headers["authorization"] === "string" ? req.headers["authorization"] : "";
  if (authHeader.startsWith("Bearer ")) {
    const candidate = authHeader.slice("Bearer ".length).trim();
    if (candidate.startsWith(MCP_TOKEN_PREFIX)) {
      const hash = hashMcpToken(candidate);
      const [tok] = await db.select().from(mcpTokensTable)
        .where(and(eq(mcpTokensTable.tokenHash, hash), isNull(mcpTokensTable.revokedAt)))
        .limit(1);
      if (tok && (!tok.expiresAt || tok.expiresAt > new Date())) {
        // Fire-and-forget bump of last-used; never block the request on it.
        void db.update(mcpTokensTable)
          .set({ lastUsedAt: new Date() })
          .where(eq(mcpTokensTable.id, tok.id))
          .catch(() => undefined);
        // Owner check: token's user must still own the project.
        const [proj] = await db.select({ userId: projectsTable.userId }).from(projectsTable)
          .where(eq(projectsTable.id, tok.projectId)).limit(1);
        const isOwner = !!proj && proj.userId === tok.userId;
        return {
          userId: tok.userId,
          scopedProjectId: tok.projectId,
          isOwner,
          isAnonymous: false,
          tokenId: tok.id,
        };
      }
      // Token presented but invalid — explicitly reject (no anon fallthrough).
      return { userId: null, scopedProjectId: null, isOwner: false, isAnonymous: false, tokenId: null };
    }
    // Bearer that isn't an MCP token — try as a session id.
    const session = await getSession(candidate);
    if (session?.user?.id) {
      return { userId: session.user.id, scopedProjectId: null, isOwner: false, isAnonymous: false, tokenId: null };
    }
  }

  // Session cookie fallback — useful for the in-app "playground" preview.
  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session?.user?.id) {
      return { userId: session.user.id, scopedProjectId: null, isOwner: false, isAnonymous: false, tokenId: null };
    }
  }

  return { userId: null, scopedProjectId: null, isOwner: false, isAnonymous: true, tokenId: null };
}

// Refine the caller's owner status against a specific project. Token auth has
// the project baked in; session auth needs this once we know the projectId.
export async function refineCallerForProject(
  ctx: McpCallerContext,
  projectId: string,
): Promise<McpCallerContext> {
  if (ctx.scopedProjectId && ctx.scopedProjectId !== projectId) {
    // Token-scoped caller is asking about a different project — drop owner.
    return { ...ctx, isOwner: false };
  }
  if (!ctx.userId) return ctx;
  const [proj] = await db.select({ userId: projectsTable.userId }).from(projectsTable)
    .where(eq(projectsTable.id, projectId)).limit(1);
  const isOwner = !!proj && proj.userId === ctx.userId;
  return { ...ctx, scopedProjectId: ctx.scopedProjectId ?? projectId, isOwner };
}

// Read MCP settings for a project, lazily creating a default row. Defaults
// come from environment variables so a self-hosted operator can flip the
// global posture without touching the DB.
const ENV_ALLOW_ANON = process.env.MCP_ALLOW_ANONYMOUS === "true";
const ENV_DEFAULT_DISABLED = (process.env.MCP_DISABLED_TOOLS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

export async function getMcpSettings(projectId: string): Promise<{
  enabled: boolean;
  allowAnonymous: boolean;
  disabledTools: string[];
}> {
  const [row] = await db.select().from(mcpSettingsTable)
    .where(eq(mcpSettingsTable.projectId, projectId)).limit(1);
  if (row) {
    return {
      enabled: row.enabled,
      allowAnonymous: row.allowAnonymous,
      disabledTools: Array.isArray(row.disabledTools) ? row.disabledTools as string[] : [],
    };
  }
  return {
    enabled: process.env.MCP_ENABLED !== "false",
    allowAnonymous: ENV_ALLOW_ANON,
    disabledTools: ENV_DEFAULT_DISABLED,
  };
}
