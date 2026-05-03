import { TOOLS, TOOLS_BY_NAME, ToolError, type Tool, type ToolContext } from "./tools";
import {
  resolveMcpCaller, refineCallerForProject, getMcpSettings,
  type McpCallerContext,
} from "./auth";
import { getDefaultBranchId } from "../branches";
import { db, branchesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "0docs-mcp", version: "1.0.0" };

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const JSONRPC_PARSE_ERROR = -32700;
const JSONRPC_INVALID_REQUEST = -32600;
const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_PARAMS = -32602;
const JSONRPC_INTERNAL_ERROR = -32603;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);

// Resolve which project this RPC call should target. Token-scoped callers
// always target their token's project; session-auth callers can pass
// projectId in args (or the X-MCP-Project header).
function resolveProjectId(req: Request, caller: McpCallerContext, args: Record<string, unknown>): string | null {
  if (caller.scopedProjectId) return caller.scopedProjectId;
  if (isUuid(args.projectId)) return args.projectId as string;
  const hdr = req.headers["x-mcp-project"];
  if (typeof hdr === "string" && isUuid(hdr)) return hdr;
  return null;
}

async function resolveBranchForCall(req: Request, projectId: string): Promise<string> {
  // Allow callers to override branch via args.branchId, X-Branch-Id, or
  // ?branchId=. Default to the project's main branch.
  const args = (req.body as JsonRpcRequest)?.params?.arguments as Record<string, unknown> | undefined;
  const fromArgs = args && typeof args.branchId === "string" ? args.branchId : undefined;
  const fromHeader = typeof req.headers["x-branch-id"] === "string" ? req.headers["x-branch-id"] : undefined;
  const fromQuery = typeof req.query["branchId"] === "string" ? (req.query["branchId"] as string) : undefined;
  const candidate = fromArgs || fromHeader || fromQuery;
  if (isUuid(candidate)) {
    const [b] = await db.select({ id: branchesTable.id }).from(branchesTable)
      .where(and(eq(branchesTable.id, candidate), eq(branchesTable.projectId, projectId)))
      .limit(1);
    if (b) return b.id;
  }
  return getDefaultBranchId(projectId);
}

function jsonError(id: JsonRpcResponse["id"], code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

function toMcpToolDefinition(t: Tool) {
  return {
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  };
}

// Filter the tool list against the per-project disabled list and the caller's
// permissions (anonymous callers only see read-only tools).
function visibleTools(allTools: Tool[], disabled: Set<string>, caller: McpCallerContext): Tool[] {
  return allTools.filter(t => {
    if (disabled.has(t.name)) return false;
    if (caller.isAnonymous && !t.readOnly) return false;
    return true;
  });
}

interface DispatchResult {
  // The JSON-RPC envelope to send back. Notifications (no `id`) return null.
  response: JsonRpcResponse | null;
  // Status code hint — 401/403 surfaced as transport-level errors when the
  // first call is unauthorized so MCP clients can prompt for auth.
  status?: number;
}

async function dispatchOne(req: Request, msg: JsonRpcRequest): Promise<DispatchResult> {
  const id = msg.id ?? null;

  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return { response: jsonError(id, JSONRPC_INVALID_REQUEST, "Invalid JSON-RPC request.") };
  }

  // Notifications (no id) — fire and forget.
  const isNotification = msg.id === undefined;

  try {
    switch (msg.method) {
      case "initialize": {
        return {
          response: {
            jsonrpc: "2.0", id,
            result: {
              protocolVersion: PROTOCOL_VERSION,
              serverInfo: SERVER_INFO,
              capabilities: {
                tools: { listChanged: false },
              },
            },
          },
        };
      }
      case "notifications/initialized":
      case "initialized":
        return { response: null };
      case "ping":
        return { response: { jsonrpc: "2.0", id, result: {} } };
      case "tools/list": {
        const caller = await resolveMcpCaller(req);
        // Resolve the candidate project for settings — we need project-level
        // disabled-tools to filter the listing. Anonymous + no project → use
        // a permissive default (env-driven).
        const argProjectId = resolveProjectId(req, caller, (msg.params as Record<string, unknown>) || {});
        let disabled = new Set<string>();
        if (argProjectId) {
          const settings = await getMcpSettings(argProjectId);
          if (!settings.enabled) {
            return { response: jsonError(id, JSONRPC_INVALID_REQUEST, "MCP is disabled for this project."), status: 403 };
          }
          if (caller.isAnonymous && !settings.allowAnonymous) {
            return { response: jsonError(id, JSONRPC_INVALID_REQUEST, "Authentication required."), status: 401 };
          }
          disabled = new Set(settings.disabledTools);
        }
        const tools = visibleTools(TOOLS, disabled, caller).map(toMcpToolDefinition);
        return { response: { jsonrpc: "2.0", id, result: { tools } } };
      }
      case "tools/call": {
        const params = (msg.params as Record<string, unknown>) || {};
        const name = String(params.name || "");
        const args = (params.arguments as Record<string, unknown>) || {};
        const tool = TOOLS_BY_NAME.get(name);
        if (!tool) return { response: jsonError(id, JSONRPC_METHOD_NOT_FOUND, `Unknown tool: ${name}`) };

        let caller = await resolveMcpCaller(req);
        let projectId = resolveProjectId(req, caller, args);

        // Tools that need a project must have one; resolve it from session
        // arg if needed and refine owner status.
        if (tool.needsProject) {
          if (!projectId) {
            return { response: jsonError(id, JSONRPC_INVALID_PARAMS, "projectId required (or use a project-scoped MCP token).") };
          }
          caller = await refineCallerForProject(caller, projectId);
        }

        // Per-project settings gate.
        if (projectId) {
          const settings = await getMcpSettings(projectId);
          if (!settings.enabled) {
            return { response: jsonError(id, JSONRPC_INVALID_REQUEST, "MCP is disabled for this project."), status: 403 };
          }
          if (settings.disabledTools.includes(name)) {
            return { response: jsonError(id, JSONRPC_INVALID_REQUEST, `Tool '${name}' is disabled for this project.`), status: 403 };
          }
          if (caller.isAnonymous && (!settings.allowAnonymous || !tool.readOnly)) {
            return { response: jsonError(id, JSONRPC_INVALID_REQUEST, "Authentication required."), status: 401 };
          }
        } else if (caller.isAnonymous && !tool.readOnly) {
          return { response: jsonError(id, JSONRPC_INVALID_REQUEST, "Authentication required."), status: 401 };
        }

        const branchId = projectId ? await resolveBranchForCall(req, projectId) : null;
        const ctx: ToolContext = {
          caller, projectId, branchId,
          log: req.log as { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void },
        };

        try {
          const result = await tool.execute(ctx, args);
          // MCP tool result envelope.
          return {
            response: {
              jsonrpc: "2.0", id,
              result: {
                content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }],
                structuredContent: result,
              },
            },
          };
        } catch (err) {
          if (err instanceof ToolError) {
            return {
              response: {
                jsonrpc: "2.0", id,
                result: {
                  isError: true,
                  content: [{ type: "text", text: err.message }],
                },
              },
              status: err.status,
            };
          }
          req.log.error({ err, tool: name }, "MCP tool failed");
          return {
            response: {
              jsonrpc: "2.0", id,
              result: {
                isError: true,
                content: [{ type: "text", text: `Tool error: ${err instanceof Error ? err.message : String(err)}` }],
              },
            },
          };
        }
      }
      default:
        if (isNotification) return { response: null };
        return { response: jsonError(id, JSONRPC_METHOD_NOT_FOUND, `Unknown method: ${msg.method}`) };
    }
  } catch (err) {
    req.log.error({ err, method: msg.method }, "MCP dispatch failed");
    return { response: jsonError(id, JSONRPC_INTERNAL_ERROR, err instanceof Error ? err.message : "Internal error") };
  }
}

// Streamable HTTP transport. The MCP spec lets servers respond either with a
// single JSON object or with an SSE stream — we pick based on the Accept
// header: text/event-stream → SSE, otherwise JSON. This matches how the
// official @modelcontextprotocol/sdk client negotiates.
export async function handleMcpHttp(req: Request, res: Response): Promise<void> {
  // CORS preflight is handled at the app level; reaffirm the auth surface here.
  const accept = String(req.headers["accept"] || "");
  const wantsSse = accept.includes("text/event-stream");

  let body: unknown = req.body;
  // Express's json() parser leaves req.body = {} when there's no body — treat
  // empty bodies as an explicit ping so naive HEAD-style health probes work.
  if (body == null || (typeof body === "object" && !Array.isArray(body) && Object.keys(body as object).length === 0)) {
    res.status(400).json({ error: "Empty JSON-RPC body" });
    return;
  }

  const messages = Array.isArray(body) ? (body as JsonRpcRequest[]) : [body as JsonRpcRequest];
  const results: JsonRpcResponse[] = [];
  let highestStatus = 200;
  for (const m of messages) {
    const { response, status } = await dispatchOne(req, m);
    if (response) results.push(response);
    if (status && status > highestStatus) highestStatus = status;
  }

  if (results.length === 0) {
    // All notifications — spec says respond 202 Accepted with no body.
    res.status(202).end();
    return;
  }

  if (wantsSse) {
    res.status(highestStatus);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    for (const r of results) {
      res.write(`event: message\ndata: ${JSON.stringify(r)}\n\n`);
    }
    res.end();
    return;
  }

  res.status(highestStatus).json(Array.isArray(body) ? results : results[0]);
}

// GET /mcp opens an SSE stream for server→client notifications. We don't
// currently push unsolicited messages, so this acts as a long-poll keepalive
// that closes cleanly on client disconnect — enough for compliant clients
// that probe for SSE support during the connect handshake.
export function handleMcpSseGet(req: Request, res: Response): void {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  // Initial comment to flush headers immediately so clients know the stream is live.
  res.write(": connected\n\n");
  const ka = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25_000);
  req.on("close", () => {
    clearInterval(ka);
    res.end();
  });
}
