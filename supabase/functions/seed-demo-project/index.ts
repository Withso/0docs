import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if demo already exists for this user
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user_id)
      .eq("slug", "agentation-docs-demo")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ message: "Demo already exists", project_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create project
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        name: "Agentation Docs (Demo)",
        slug: "agentation-docs-demo",
        description: "A demo documentation project showcasing the builder. Feel free to edit!",
        user_id,
      })
      .select()
      .single();

    if (projErr) throw projErr;

    const pid = project.id;

    // Define all pages
    const pagesData = [
      { title: "Getting Started", slug: "getting-started", order_index: 0 },
      { title: "Installation", slug: "installation", order_index: 1 },
      { title: "Configuration", slug: "configuration", order_index: 2 },
      { title: "Architecture", slug: "architecture", order_index: 3 },
      { title: "Components", slug: "components", order_index: 4 },
      { title: "API Reference", slug: "api-reference", order_index: 5 },
      { title: "Theming", slug: "theming", order_index: 6 },
      { title: "Examples", slug: "examples", order_index: 7 },
      { title: "FAQ", slug: "faq", order_index: 8 },
      { title: "Changelog", slug: "changelog", order_index: 9 },
    ];

    const { data: pages, error: pagesErr } = await supabase
      .from("pages")
      .insert(pagesData.map((p) => ({ ...p, project_id: pid })))
      .select();

    if (pagesErr) throw pagesErr;

    const pageMap: Record<string, string> = {};
    for (const p of pages) {
      pageMap[p.slug] = p.id;
    }

    // Helper to create sections + blocks for a page
    async function seed(pageSlug: string, sections: { title: string; blocks: { type: string; content: any }[] }[]) {
      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        const { data: section, error: secErr } = await supabase
          .from("sections")
          .insert({ page_id: pageMap[pageSlug], title: sec.title, order_index: si })
          .select()
          .single();

        if (secErr) throw secErr;

        if (sec.blocks.length > 0) {
          const { error: blkErr } = await supabase.from("blocks").insert(
            sec.blocks.map((b, bi) => ({
              section_id: section.id,
              type: b.type,
              content: b.content,
              order_index: bi,
            }))
          );
          if (blkErr) throw blkErr;
        }
      }
    }

    // ── Getting Started ──
    await seed("getting-started", [
      {
        title: "Prerequisites",
        blocks: [
          { type: "paragraph", content: { text: "Get up and running with Agentation in under 5 minutes." } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Node.js 18 or higher",
                "A modern browser (Chrome, Firefox, Safari, Edge)",
                "An AI coding tool (Claude Code, Cursor, Copilot, etc.)",
              ],
            },
          },
        ],
      },
      {
        title: "Quick Start",
        blocks: [
          { type: "paragraph", content: { text: "1. Install the package" } },
          {
            type: "code_block",
            content: { language: "bash", code: "npm install agentation\n# or\npnpm add agentation" },
          },
          { type: "paragraph", content: { text: "2. Add to your project" } },
          {
            type: "code_block",
            content: {
              language: "typescript",
              code: "import { Agentation } from 'agentation';\n\nconst agent = new Agentation({\n  projectId: 'my-project',\n  theme: 'auto',\n});\n\nagent.start();",
            },
          },
          { type: "paragraph", content: { text: "3. Open your app in the browser and click the toolbar icon." } },
          {
            type: "note",
            content: { text: "The toolbar only appears in development mode by default. See Configuration for production options." },
          },
        ],
      },
      {
        title: "Video Walkthrough",
        blocks: [
          {
            type: "youtube",
            content: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ", caption: "A 3-minute walkthrough of the core features." },
          },
        ],
      },
    ]);

    // ── Installation ──
    await seed("installation", [
      {
        title: "Package Managers",
        blocks: [
          { type: "paragraph", content: { text: "Install Agentation via your preferred package manager." } },
          {
            type: "code_block",
            content: {
              language: "bash",
              code: "# npm\nnpm install agentation\n\n# pnpm\npnpm add agentation\n\n# yarn\nyarn add agentation\n\n# bun\nbun add agentation",
            },
          },
        ],
      },
      {
        title: "CDN",
        blocks: [
          { type: "paragraph", content: { text: "You can also include Agentation directly via a CDN for quick prototyping:" } },
          {
            type: "code_block",
            content: {
              language: "html",
              code: '<script src="https://cdn.agentation.dev/v2/agentation.min.js"></script>\n<script>\n  Agentation.init({ theme: \'auto\' });\n</script>',
            },
          },
          {
            type: "note",
            content: { text: "CDN usage is not recommended for production. Use a package manager instead for tree-shaking and version control." },
          },
        ],
      },
      {
        title: "TypeScript",
        blocks: [
          { type: "paragraph", content: { text: "Agentation includes TypeScript declarations out of the box. No additional @types package is needed." } },
          {
            type: "code_block",
            content: {
              language: "typescript",
              code: "import type { AgentationConfig, Annotation } from 'agentation';\n\nconst config: AgentationConfig = {\n  projectId: 'my-project',\n  theme: 'light',\n  output: 'standard',\n};",
            },
          },
        ],
      },
      {
        title: "Verify Installation",
        blocks: [
          { type: "paragraph", content: { text: "Run the following to verify everything is working:" } },
          { type: "code_block", content: { language: "bash", code: "npx agentation --version\n# Expected: agentation v2.3.0" } },
        ],
      },
    ]);

    // ── Configuration ──
    await seed("configuration", [
      {
        title: "Configuration File",
        blocks: [
          { type: "paragraph", content: { text: "Create an agentation.config.ts file in your project root:" } },
          {
            type: "code_block",
            content: {
              language: "typescript",
              code: "import { defineConfig } from 'agentation';\n\nexport default defineConfig({\n  projectId: 'my-project',\n  theme: 'auto',\n  position: 'bottom-right',\n  hotkey: 'ctrl+shift+a',\n  output: {\n    detail: 'standard',\n    includeStyles: true,\n    includeReactTree: true,\n  },\n  mcp: {\n    enabled: true,\n    port: 3001,\n  },\n});",
            },
          },
        ],
      },
      {
        title: "Environment Variables",
        blocks: [
          { type: "paragraph", content: { text: "AGENTATION_ENABLED (default: true) — Enable/disable toolbar.\nAGENTATION_MCP_PORT (default: 3001) — MCP server port.\nAGENTATION_THEME (default: auto) — Force theme override." } },
        ],
      },
      {
        title: "Keyboard Shortcuts",
        blocks: [
          {
            type: "paragraph",
            content: { text: "P — Pause animations\nH — Hide markers\nC — Copy feedback\nS — Send annotations\nX — Clear all\nEsc — Exit toolbar" },
          },
        ],
      },
    ]);

    // ── Architecture ──
    await seed("architecture", [
      {
        title: "System Overview",
        blocks: [
          {
            type: "paragraph",
            content: {
              text: "Agentation runs as a three-part system: a browser toolbar, an HTTP/MCP server, and your AI agent. Each component communicates through structured annotation data.",
            },
          },
          { type: "code_block", content: { language: "text", code: "Browser Toolbar  →  HTTP/MCP Server  →  AI Agent" } },
        ],
      },
      {
        title: "Data Flow",
        blocks: [
          {
            type: "ordered_list",
            content: {
              items: [
                "User clicks an element in the browser toolbar",
                "Toolbar captures CSS selector, component tree, computed styles",
                "Annotation is POSTed to the HTTP server at /annotations",
                "Server stores annotation and notifies MCP clients",
                "AI agent calls get_pending to retrieve new annotations",
                "Agent processes feedback and responds with code changes",
              ],
            },
          },
        ],
      },
      {
        title: "Annotation Schema",
        blocks: [
          {
            type: "code_block",
            content: {
              language: "typescript",
              code: "interface Annotation {\n  id: string;\n  timestamp: number;\n  element: {\n    selector: string;\n    xpath: string;\n    rect: DOMRect;\n    computedStyles: Record<string, string>;\n  };\n  component?: {\n    name: string;\n    file: string;\n    line: number;\n    props: Record<string, unknown>;\n  };\n  feedback: {\n    text: string;\n    priority: 'low' | 'medium' | 'high';\n    type: 'bug' | 'improvement' | 'question';\n  };\n}",
            },
          },
        ],
      },
    ]);

    // ── Components ──
    await seed("components", [
      {
        title: "Buttons",
        blocks: [
          { type: "paragraph", content: { text: "Various button styles used across the documentation: Primary, Secondary, Ghost, and Small variants." } },
        ],
      },
      {
        title: "Cards",
        blocks: [
          {
            type: "paragraph",
            content: {
              text: "Card components include: Annotation Card (display user feedback with element context), Metric Card (show numerical data), Status Card (indicate system status), and Action Card (clickable cards that trigger workflows).",
            },
          },
        ],
      },
      {
        title: "Form Elements",
        blocks: [
          { type: "paragraph", content: { text: "Standard form elements: text inputs, textareas, checkboxes, and selects. All support validation states." } },
        ],
      },
      {
        title: "Image Example",
        blocks: [
          {
            type: "image",
            content: {
              url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=680&h=400&fit=crop",
              alt: "Code on a screen",
              caption: "Images are rendered with lazy loading and responsive sizing.",
            },
          },
        ],
      },
    ]);

    // ── API Reference ──
    await seed("api-reference", [
      {
        title: "Base URL",
        blocks: [
          { type: "paragraph", content: { text: "Complete API documentation for the Agentation HTTP server." } },
          { type: "code_block", content: { language: "text", code: "http://localhost:3001/api/v1" } },
        ],
      },
      {
        title: "POST /annotations",
        blocks: [
          { type: "paragraph", content: { text: "Create a new annotation." } },
          {
            type: "code_block",
            content: {
              language: "json",
              code: '{\n  "element": {\n    "selector": ".sidebar > button.primary",\n    "xpath": "/html/body/div[1]/aside/button[2]"\n  },\n  "feedback": {\n    "text": "Button text is unclear",\n    "priority": "high",\n    "type": "bug"\n  }\n}',
            },
          },
        ],
      },
      {
        title: "GET /annotations",
        blocks: [
          { type: "paragraph", content: { text: "List all annotations for the current project. Supports status, page, and limit query parameters." } },
        ],
      },
      {
        title: "DELETE /annotations/:id",
        blocks: [
          { type: "paragraph", content: { text: "Remove a specific annotation." } },
          {
            type: "code_block",
            content: { language: "bash", code: "curl -X DELETE http://localhost:3001/api/v1/annotations/ann_abc123" },
          },
        ],
      },
    ]);

    // ── Theming ──
    await seed("theming", [
      {
        title: "Built-in Themes",
        blocks: [
          { type: "paragraph", content: { text: "Agentation ships with three built-in themes: Light, Dark, and Auto." } },
        ],
      },
      {
        title: "Custom CSS",
        blocks: [
          { type: "paragraph", content: { text: "Override any toolbar style with CSS custom properties:" } },
          {
            type: "code_block",
            content: {
              language: "css",
              code: ":root {\n  --agentation-bg: #1a1a1a;\n  --agentation-fg: #ffffff;\n  --agentation-accent: #4a9eff;\n  --agentation-border: #333;\n  --agentation-radius: 8px;\n  --agentation-font: 'Inter', sans-serif;\n}",
            },
          },
        ],
      },
      {
        title: "Marker Colors",
        blocks: [
          { type: "paragraph", content: { text: "Customize annotation marker colors. Available defaults: #4a9eff, #ff6b35, #22c55e, #eab308, #ef4444, #8b5cf6." } },
          {
            type: "code_block",
            content: { language: "typescript", code: "agent.configure({\n  markerColor: '#4a9eff',\n});" },
          },
        ],
      },
    ]);

    // ── Examples ──
    await seed("examples", [
      {
        title: "React Integration",
        blocks: [
          { type: "paragraph", content: { text: "Real-world examples and common integration patterns." } },
          {
            type: "code_block",
            content: {
              language: "tsx",
              code: "import { useAgentation } from 'agentation/react';\n\nfunction App() {\n  const { annotations, isActive } = useAgentation();\n\n  return (\n    <div>\n      <h1>My App</h1>\n      {isActive && (\n        <div className=\"annotation-count\">\n          {annotations.length} annotations\n        </div>\n      )}\n    </div>\n  );\n}",
            },
          },
        ],
      },
      {
        title: "Webhook Handler",
        blocks: [
          {
            type: "code_block",
            content: {
              language: "typescript",
              code: "app.post('/webhooks/agentation', (req, res) => {\n  const { event, annotation } = req.body;\n  \n  switch (event) {\n    case 'annotation.created':\n      createIssue(annotation);\n      break;\n    case 'annotation.resolved':\n      closeIssue(annotation.id);\n      break;\n  }\n  \n  res.status(200).json({ received: true });\n});",
            },
          },
        ],
      },
      {
        title: "CI/CD Integration",
        blocks: [
          {
            type: "code_block",
            content: {
              language: "yaml",
              code: "name: Process Annotations\non:\n  workflow_dispatch:\n    inputs:\n      annotation_id:\n        description: 'Annotation ID to process'\n        required: true\n\njobs:\n  process:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npx agentation resolve ${{ inputs.annotation_id }}",
            },
          },
        ],
      },
    ]);

    // ── FAQ ──
    await seed("faq", [
      {
        title: "Is Agentation free?",
        blocks: [
          { type: "paragraph", content: { text: "Yes. Agentation is free for individuals and companies for internal use. Contact us for a commercial license if you're redistributing it as part of a product." } },
        ],
      },
      {
        title: "Which AI tools does it work with?",
        blocks: [
          { type: "paragraph", content: { text: "Agentation works with any AI coding tool that accepts text input — Claude Code, Cursor, GitHub Copilot, Windsurf, and more. MCP integration provides the deepest experience with Claude Code." } },
        ],
      },
      {
        title: "Does it work with Vue or Angular?",
        blocks: [
          { type: "paragraph", content: { text: "Basic annotation works with any web framework. React-specific features like component tree detection are currently React-only. Vue support is partial, Angular/Svelte planned for v3.0." } },
        ],
      },
      {
        title: "Is my data sent to any server?",
        blocks: [
          { type: "paragraph", content: { text: "No. All annotation data stays on your local machine. The HTTP and MCP servers run on localhost. Nothing is sent externally unless you configure webhooks." } },
        ],
      },
    ]);

    // ── Changelog ──
    await seed("changelog", [
      {
        title: "v2.3.0 — March 2025",
        blocks: [
          {
            type: "unordered_list",
            content: {
              items: [
                "Added animation pause mode for annotating specific frames",
                "New keyboard shortcuts for all toolbar actions",
                "Improved component tree detection for React 19",
                "Fixed marker positioning on scrolled pages",
              ],
            },
          },
        ],
      },
      {
        title: "v2.2.0 — February 2025",
        blocks: [
          {
            type: "unordered_list",
            content: {
              items: [
                "Webhook support for external integrations",
                "Custom marker colors in settings",
                "Block page interactions mode during annotation",
                "Performance improvements for large DOMs",
              ],
            },
          },
        ],
      },
      {
        title: "v2.1.0 — January 2025",
        blocks: [
          {
            type: "unordered_list",
            content: {
              items: [
                "MCP server for real-time agent sync",
                "Agent response annotations",
                "Self-driving mode (experimental)",
                "Critique mode for automated feedback",
              ],
            },
          },
        ],
      },
    ]);

    return new Response(JSON.stringify({ success: true, project_id: pid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
