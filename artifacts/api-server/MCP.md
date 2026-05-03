# 0docs MCP Server

The 0docs API server exposes a fully-featured **Model Context Protocol** endpoint
that lets AI agents (Claude Desktop, Cursor, Continue, your own custom client)
read, search, and edit documentation projects.

- **Endpoint:** `POST /api/mcp` (Streamable HTTP, with SSE fallback via `Accept: text/event-stream`)
- **Spec:** MCP `2024-11-05`
- **Transport:** JSON-RPC 2.0 over HTTP. Single calls or batches both supported.

## Quick start (Claude Desktop)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "0docs": {
      "url": "https://your-domain.com/api/mcp",
      "headers": { "Authorization": "Bearer mcp_xxxxxxxxxxxxxxxx" }
    }
  }
}
```

Tokens are minted from **Settings → MCP Server** inside the 0docs builder.
A token grants the holder owner-level MCP access to a single project.

## Authentication

| Method | Header | Scope |
|---|---|---|
| Personal Access Token | `Authorization: Bearer mcp_…` | One project (token-scoped) |
| Session cookie | `Cookie: connect.sid=…` | All projects you own |
| Anonymous | _(none)_ | Read-only tools, only when the project owner has enabled it |

For session-cookie callers, choose which project a call targets via either
`?projectId=…` query, the `X-MCP-Project` header, or a `projectId` argument
on the tool. Token-scoped calls always target the token's project.

You can also pin a non-default branch with `?branchId=…`, the `X-Branch-Id`
header, or a `branchId` argument.

## Per-project settings

Every project has its own MCP settings row (`mcp_settings`). The settings UI
lives at **Settings → MCP Server** and exposes:

- **MCP server enabled** — master kill-switch.
- **Allow anonymous read-only access** — exposes read tools to unauthenticated callers.
- **Per-tool toggles** — disable individual tools you don't want agents using.

## Environment defaults

Used when a project has no `mcp_settings` row yet:

| Var | Default | Effect |
|---|---|---|
| `MCP_ENABLED` | `true` | Set to `false` to disable MCP for un-configured projects. |
| `MCP_ALLOW_ANONYMOUS` | `false` | Set to `true` to default-allow read-only anonymous access. |
| `MCP_DISABLED_TOOLS` | _(empty)_ | Comma-separated tool names to disable globally by default. |

## Tool catalog

All tools, with their read/write classification, are available at
`GET /api/mcp/tools` (no auth required — this is static metadata only).

Highlights:

- **Read:** `list_projects`, `get_project`, `list_branches`, `list_pages`,
  `search_pages`, `get_page`, `get_page_content`, `list_sections`,
  `list_blocks`, `list_nav_groups`, `list_tabs`, `get_design_settings`,
  `list_published_versions`, `list_doc_versions`, `list_commits`,
  `get_commit`, `query_docs_filesystem`.
- **Write:** `create_branch`, `delete_branch`, `create_page`, `update_page`,
  `delete_page`, `reorder_pages`, `create_section`, `update_section`,
  `delete_section`, `create_block`, `update_block`, `delete_block`,
  `create_nav_group`, `update_nav_group`, `delete_nav_group`, `create_tab`,
  `update_tab`, `delete_tab`, `update_design_settings`, `create_doc_version`,
  `upload_image`, `replace_page_content_from_mdx`.

`replace_page_content_from_mdx` accepts MDX with frontmatter and
deserializes it into the section/block tree, so agents can author full pages
in their natural format and round-trip them through the editor.

`query_docs_filesystem` exposes the project as a virtual filesystem
(`pages/<slug>.mdx`, `docs.json`, `design.json`) — handy for agents that
prefer thinking in files.

## Token format

Tokens are `mcp_` followed by 32 random URL-safe bytes. Only the SHA-256
hash and the last four characters are stored; the raw token is shown to the
user **once** at creation time and can be rotated by revoking + minting a new one.
