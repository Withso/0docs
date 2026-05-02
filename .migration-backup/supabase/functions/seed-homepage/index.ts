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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check — require a valid JWT from an admin user
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Admin role check
    const adminCheck = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminCheck
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden — admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const PROJECT_ID = "4a705271-9c84-49cf-8e84-7c1b019e4c85";

    // 1. Delete all existing content
    // Get all page IDs
    const { data: existingPages } = await supabase
      .from("pages")
      .select("id")
      .eq("project_id", PROJECT_ID);

    if (existingPages && existingPages.length > 0) {
      const pageIds = existingPages.map((p: any) => p.id);
      
      // Get all section IDs
      const { data: existingSections } = await supabase
        .from("sections")
        .select("id")
        .in("page_id", pageIds);

      if (existingSections && existingSections.length > 0) {
        const sectionIds = existingSections.map((s: any) => s.id);
        await supabase.from("blocks").delete().in("section_id", sectionIds);
      }

      await supabase.from("sections").delete().in("page_id", pageIds);
      await supabase.from("pages").delete().eq("project_id", PROJECT_ID);
    }

    // Delete nav groups
    await supabase.from("nav_groups").delete().eq("project_id", PROJECT_ID);

    // 2. Create nav groups
    const navGroupsData = [
      { project_id: PROJECT_ID, title: "Getting Started", order_index: 0, type: "label" },
      { project_id: PROJECT_ID, title: "Features", order_index: 1, type: "label" },
      { project_id: PROJECT_ID, title: "Advanced", order_index: 2, type: "label" },
    ];

    const { data: navGroups, error: ngErr } = await supabase
      .from("nav_groups")
      .insert(navGroupsData)
      .select();

    if (ngErr) throw ngErr;

    const ngMap: Record<string, string> = {};
    for (const ng of navGroups!) {
      ngMap[ng.title] = ng.id;
    }

    // 3. Create pages
    const pagesData = [
      { project_id: PROJECT_ID, title: "Welcome to 0docs", slug: "welcome", order_index: 0, nav_group_id: null, meta_description: "0docs — the visual documentation builder. Create, design, and publish beautiful docs without writing code." },
      { project_id: PROJECT_ID, title: "Quick Start", slug: "quick-start", order_index: 1, nav_group_id: ngMap["Getting Started"], meta_description: "Get started with 0docs in under 2 minutes." },
      { project_id: PROJECT_ID, title: "Creating a Project", slug: "creating-a-project", order_index: 2, nav_group_id: ngMap["Getting Started"], meta_description: "Learn how to create your first documentation project." },
      { project_id: PROJECT_ID, title: "The Builder", slug: "the-builder", order_index: 3, nav_group_id: ngMap["Features"], meta_description: "Explore the WYSIWYG documentation builder." },
      { project_id: PROJECT_ID, title: "Content Blocks", slug: "content-blocks", order_index: 4, nav_group_id: ngMap["Features"], meta_description: "20+ content blocks to build rich documentation." },
      { project_id: PROJECT_ID, title: "Design Customization", slug: "design-customization", order_index: 5, nav_group_id: ngMap["Features"], meta_description: "Full design control — fonts, colors, spacing, and layout." },
      { project_id: PROJECT_ID, title: "Publishing & Versioning", slug: "publishing-versioning", order_index: 6, nav_group_id: ngMap["Features"], meta_description: "Publish docs with snapshot versioning and one-click rollback." },
      { project_id: PROJECT_ID, title: "Analytics & Feedback", slug: "analytics-feedback", order_index: 7, nav_group_id: ngMap["Features"], meta_description: "Track page views, search queries, and reader feedback." },
      { project_id: PROJECT_ID, title: "Search & Navigation", slug: "search-navigation", order_index: 8, nav_group_id: ngMap["Advanced"], meta_description: "Built-in full-text search and customizable navigation." },
      { project_id: PROJECT_ID, title: "API Import", slug: "api-import", order_index: 9, nav_group_id: ngMap["Advanced"], meta_description: "Import OpenAPI specs to auto-generate API documentation." },
      { project_id: PROJECT_ID, title: "Custom Domains", slug: "custom-domains", order_index: 10, nav_group_id: ngMap["Advanced"], meta_description: "Connect your own domain to your published docs." },
    ];

    const { data: pages, error: pagesErr } = await supabase
      .from("pages")
      .insert(pagesData)
      .select();

    if (pagesErr) throw pagesErr;

    const pageMap: Record<string, string> = {};
    for (const p of pages!) {
      pageMap[p.slug] = p.id;
    }

    // Helper
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

    // ═══════════════════════════════════════════════════════
    // PAGE: Welcome to 0docs (Homepage / Landing)
    // ═══════════════════════════════════════════════════════
    await seed("welcome", [
      {
        title: "Build Beautiful Documentation — Visually",
        blocks: [
          { type: "paragraph", content: { text: "0docs is a visual documentation builder that lets you create, design, and publish professional documentation sites — without writing a single line of code. Whether you're documenting an API, a product, or an internal knowledge base, 0docs gives you complete creative control." } },
          { type: "divider", content: {} },
        ],
      },
      {
        title: "Why 0docs?",
        blocks: [
          { type: "paragraph", content: { text: "Most documentation tools force you into rigid templates with minimal design flexibility. 0docs is different. It combines the power of a block-based content editor with a full design system — so your docs look exactly the way you want." } },
          {
            type: "steps",
            content: {
              items: [
                { title: "Visual Builder", description: "A WYSIWYG editor with 20+ content blocks. Drag, drop, and edit content inline — see changes instantly in a live preview." },
                { title: "Full Design Control", description: "Customize every detail: fonts, colors, spacing, borders, code themes, and layout. Global settings cascade, with per-block overrides when you need precision." },
                { title: "One-Click Publishing", description: "Publish to a live URL with snapshot versioning. Roll back to any previous version instantly. Your draft and live sites are completely independent." },
                { title: "Built-in Analytics", description: "Track page views, search queries, and reader feedback — all from the same dashboard where you build." },
              ],
            },
          },
        ],
      },
      {
        title: "How It Works",
        blocks: [
          {
            type: "ordered_list",
            content: {
              items: [
                "Sign up and create a new project from the dashboard.",
                "Add pages, sections, and content blocks using the visual builder.",
                "Customize typography, colors, and layout in the Design panel.",
                "Preview your docs in real time — what you see is what gets published.",
                "Hit Publish. Your documentation is live, instantly shareable.",
              ],
            },
          },
          { type: "note", content: { text: "0docs handles hosting, search, navigation, and responsive design for you. Focus on writing great content — we handle the rest." } },
        ],
      },
      {
        title: "Key Features at a Glance",
        blocks: [
          {
            type: "table",
            content: {
              headers: ["Feature", "Description"],
              rows: [
                ["Block-Based Editor", "20+ content blocks including code, tabs, accordions, API endpoints, tables, and more."],
                ["WYSIWYG Preview", "The builder mirrors the exact published layout — no surprises."],
                ["Design System", "HSL color engine, Google Fonts integration, and granular spacing controls."],
                ["Drag & Drop", "Reorder pages, sections, and blocks with intuitive drag-and-drop."],
                ["Publishing & Versions", "Snapshot-based publishing with full version history and one-click rollback."],
                ["Full-Text Search", "Built-in ⌘K search across all pages and content."],
                ["Analytics Dashboard", "Page views, time on page, search queries, and reader feedback."],
                ["OpenAPI Import", "Import Swagger/OpenAPI specs to auto-generate API reference pages."],
                ["Navigation Groups", "Organize sidebar navigation with labeled groups and custom ordering."],
                ["Custom Domains", "Connect your own domain to your published documentation."],
                ["Responsive Design", "All published docs are fully responsive out of the box."],
                ["Dark & Light Modes", "Design tokens support both light and dark color schemes."],
              ],
            },
          },
        ],
      },
      {
        title: "Get Started",
        blocks: [
          { type: "paragraph", content: { text: "Ready to build? Head to the Quick Start guide to create your first project in under 2 minutes." } },
          { type: "callout", content: { text: "0docs is free to use. Sign up, create a project, and start building — no credit card required.", type: "info" } },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: Quick Start
    // ═══════════════════════════════════════════════════════
    await seed("quick-start", [
      {
        title: "Create Your First Docs in 2 Minutes",
        blocks: [
          { type: "paragraph", content: { text: "Getting started with 0docs takes less than 2 minutes. No installation, no configuration files, no command line. Everything happens in your browser." } },
        ],
      },
      {
        title: "Step-by-Step",
        blocks: [
          {
            type: "steps",
            content: {
              items: [
                { title: "Sign Up", description: "Create an account at 0docs. Email and password — that's it." },
                { title: "Create a Project", description: "Click 'New Project' from the dashboard. Give it a name and an optional description. A default page is created automatically." },
                { title: "Add Content", description: "Use the builder to add sections and blocks. Choose from headings, paragraphs, code blocks, tables, accordions, and 15+ other block types." },
                { title: "Customize Design", description: "Switch to the Design tab to adjust fonts, colors, spacing, and layout. Changes apply globally and preview in real time." },
                { title: "Publish", description: "Click Publish in the top bar. Your docs are live at /docs/your-project-slug. Share the link with anyone." },
              ],
            },
          },
        ],
      },
      {
        title: "What's Next?",
        blocks: [
          { type: "paragraph", content: { text: "Explore the full feature set:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "The Builder — Learn about the editor interface, sidebar, and inline editing.",
                "Content Blocks — Discover all 20+ block types and what each one does.",
                "Design Customization — Deep dive into the design system, fonts, and color engine.",
                "Publishing & Versioning — Understand snapshot publishing and version management.",
              ],
            },
          },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: Creating a Project
    // ═══════════════════════════════════════════════════════
    await seed("creating-a-project", [
      {
        title: "Projects Overview",
        blocks: [
          { type: "paragraph", content: { text: "A project in 0docs represents a single documentation site. Each project has its own pages, design settings, published versions, and analytics. You can create unlimited projects from the dashboard." } },
        ],
      },
      {
        title: "Creating a New Project",
        blocks: [
          {
            type: "ordered_list",
            content: {
              items: [
                "Navigate to the Dashboard.",
                "Click the 'New Project' button in the top right.",
                "Enter a project name (e.g., 'My API Docs').",
                "Optionally add a description.",
                "Click 'Create Project'. You'll be redirected to the builder.",
              ],
            },
          },
          { type: "note", content: { text: "The project slug is auto-generated from the name. Your docs will be published at /docs/your-slug." } },
        ],
      },
      {
        title: "Project Settings",
        blocks: [
          { type: "paragraph", content: { text: "From the builder, click the Settings tab to manage:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Project name and description",
                "Custom slug for the published URL",
                "Homepage designation (only one project can be the homepage)",
                "Custom domain configuration",
                "Project deletion",
              ],
            },
          },
        ],
      },
      {
        title: "Homepage Project",
        blocks: [
          { type: "paragraph", content: { text: "One project can be designated as the homepage. When visitors navigate to the root URL, they see the homepage project's published documentation. This is perfect for product landing pages or primary documentation sites." } },
          { type: "callout", content: { text: "The homepage project syncs directly with the root URL. Any changes published to the homepage project are immediately reflected.", type: "info" } },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: The Builder
    // ═══════════════════════════════════════════════════════
    await seed("the-builder", [
      {
        title: "Builder Overview",
        blocks: [
          { type: "paragraph", content: { text: "The builder is the heart of 0docs. It's a WYSIWYG environment where you compose, organize, and style your documentation. The builder mirrors the exact layout and typography of the published site — what you see is what readers get." } },
        ],
      },
      {
        title: "Builder Modes",
        blocks: [
          { type: "paragraph", content: { text: "The builder has six modes, accessible from the top navigation:" } },
          {
            type: "table",
            content: {
              headers: ["Mode", "Purpose"],
              rows: [
                ["Editor", "Add and edit pages, sections, and content blocks."],
                ["Design", "Customize fonts, colors, spacing, and layout."],
                ["Preview", "Full-screen preview of the published documentation."],
                ["Analytics", "View page metrics, search queries, and feedback."],
                ["Settings", "Manage project name, slug, domain, and more."],
                ["Publish", "Create new versions and manage publishing."],
              ],
            },
          },
        ],
      },
      {
        title: "The Sidebar",
        blocks: [
          { type: "paragraph", content: { text: "The left sidebar in Editor mode shows your full page tree. Key capabilities:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Add new pages with the '+' button",
                "Drag and drop pages to reorder them",
                "Organize pages under navigation groups (labels)",
                "Click a page to switch to it in the editor",
                "Right-click or use the menu to rename, delete, or move pages",
                "Edit page slugs and nav titles inline",
              ],
            },
          },
        ],
      },
      {
        title: "Sections & Blocks",
        blocks: [
          { type: "paragraph", content: { text: "Each page contains sections, and each section contains blocks. This hierarchy gives you fine-grained control over content organization." } },
          {
            type: "steps",
            content: {
              items: [
                { title: "Sections", description: "Sections act as logical groupings within a page. Each section has a title that appears in the sidebar's table of contents. You can drag sections to reorder them, rename them, or delete them." },
                { title: "Blocks", description: "Blocks are the atomic content units. Each block has a specific type (paragraph, code, table, etc.) and its own content. Blocks can be reordered within a section or moved between sections via drag and drop." },
              ],
            },
          },
        ],
      },
      {
        title: "Inline Editing",
        blocks: [
          { type: "paragraph", content: { text: "All text content in the builder supports inline editing. Click any heading, paragraph, or block text to edit it directly — no modals or separate editors. Changes are saved automatically as you type." } },
          { type: "note", content: { text: "Page titles, section titles, and navigation titles all support inline editing. Click the text, make your change, and it's saved." } },
        ],
      },
      {
        title: "Navigation Groups",
        blocks: [
          { type: "paragraph", content: { text: "Navigation groups let you organize pages in the sidebar with labeled headers. For example, you might have groups like 'Getting Started', 'Features', and 'API Reference'. Pages can be assigned to groups or left ungrouped." } },
          { type: "paragraph", content: { text: "There are two types of nav groups:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Label — Renders as a bold section header in the sidebar.",
                "Text — Renders as static descriptive text (useful for notes or context).",
              ],
            },
          },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: Content Blocks
    // ═══════════════════════════════════════════════════════
    await seed("content-blocks", [
      {
        title: "Block Types Overview",
        blocks: [
          { type: "paragraph", content: { text: "0docs ships with 20+ content block types. Each block is purpose-built for documentation and fully customizable." } },
        ],
      },
      {
        title: "Text & Structure",
        blocks: [
          {
            type: "table",
            content: {
              headers: ["Block", "Description"],
              rows: [
                ["Heading", "H1–H6 headings with configurable level. Used for section titles and sub-headings."],
                ["Paragraph", "Rich text content. Supports inline formatting via the rich text editor."],
                ["Quote", "Blockquote with optional attribution. Great for testimonials or callouts."],
                ["Divider", "A horizontal line to visually separate content sections."],
              ],
            },
          },
        ],
      },
      {
        title: "Lists & Steps",
        blocks: [
          {
            type: "table",
            content: {
              headers: ["Block", "Description"],
              rows: [
                ["Ordered List", "Numbered list items. Add, remove, or reorder items inline."],
                ["Unordered List", "Bullet point list. Same editing capabilities as ordered lists."],
                ["Steps", "Numbered step-by-step instructions with title and description for each step. Perfect for tutorials and guides."],
              ],
            },
          },
        ],
      },
      {
        title: "Code",
        blocks: [
          {
            type: "table",
            content: {
              headers: ["Block", "Description"],
              rows: [
                ["Code Block", "Syntax-highlighted code with language selector. Supports 50+ languages."],
                ["Code Tabs", "Multiple code snippets in a tabbed interface. Great for showing the same concept in different languages."],
              ],
            },
          },
          { type: "code_block", content: { language: "typescript", code: "// Example: A code block in action\nconst greeting = (name: string): string => {\n  return `Hello, ${name}! Welcome to 0docs.`;\n};" } },
        ],
      },
      {
        title: "Media",
        blocks: [
          {
            type: "table",
            content: {
              headers: ["Block", "Description"],
              rows: [
                ["Image", "Image with URL, alt text, and optional caption. Supports lazy loading."],
                ["Video", "Embedded video player with URL source."],
                ["YouTube", "YouTube video embed with video ID and title."],
              ],
            },
          },
          { type: "image", content: { url: "", alt: "Add your product screenshot here", caption: "Replace this with a screenshot of your product or documentation." } },
        ],
      },
      {
        title: "Interactive Components",
        blocks: [
          {
            type: "table",
            content: {
              headers: ["Block", "Description"],
              rows: [
                ["Tabs", "Tabbed content panels. Each tab has a label and content area."],
                ["Accordion", "Collapsible content sections. Great for FAQs or optional details."],
                ["Card", "Styled card with title, description, and optional link. Use for feature highlights or navigation."],
                ["Table", "Data table with configurable headers and rows. Add and remove rows inline."],
              ],
            },
          },
          {
            type: "accordion",
            content: {
              items: [
                { title: "How do I add a new block?", content: "Click the '+' button at the bottom of any section, then choose a block type from the menu." },
                { title: "Can I move blocks between sections?", content: "Yes — drag and drop any block to a different section. The block will be re-parented automatically." },
                { title: "Are blocks reusable across pages?", content: "Not currently. Each block belongs to a specific section on a specific page. Reusable components are on the roadmap." },
              ],
            },
          },
        ],
      },
      {
        title: "Documentation-Specific",
        blocks: [
          {
            type: "table",
            content: {
              headers: ["Block", "Description"],
              rows: [
                ["Note", "Highlighted info box for tips, warnings, or important notes."],
                ["Callout", "Prominent callout box with type variants: info, warning, success, error."],
                ["API Endpoint", "Structured API endpoint display with method, path, parameters, and response."],
                ["Inline Editor", "Full rich text editor block powered by TipTap. Supports formatting, links, and images."],
              ],
            },
          },
          { type: "note", content: { text: "This is a Note block — use it to highlight important information, tips, or warnings for your readers." } },
          { type: "callout", content: { text: "This is a Callout block — it's more prominent than a note and supports different types (info, warning, success, error).", type: "info" } },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: Design Customization
    // ═══════════════════════════════════════════════════════
    await seed("design-customization", [
      {
        title: "Design System Overview",
        blocks: [
          { type: "paragraph", content: { text: "0docs includes a comprehensive design system that gives you full control over the look and feel of your documentation. All design settings are managed from the Design tab in the builder and apply globally to your published site." } },
        ],
      },
      {
        title: "Typography",
        blocks: [
          { type: "paragraph", content: { text: "Configure every aspect of typography:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Heading Font — Choose from any Google Font for headings (H1–H6).",
                "Body Font — Separate font selection for body text and paragraphs.",
                "Heading Weight — Control heading font weight (100–900).",
                "Base Font Size — Set the root font size (default 15px).",
                "Heading Font Size — Control the size of section headings.",
                "Page Title Size — Set the size of the main page title.",
                "Line Height — Adjust the global line height for readability.",
              ],
            },
          },
          { type: "note", content: { text: "Font changes are previewed in real time in the Design tab. The live preview shows your actual documentation content with the new fonts applied." } },
        ],
      },
      {
        title: "Colors",
        blocks: [
          { type: "paragraph", content: { text: "0docs uses an HSL-based color engine with semantic color tokens. Every color in the system is defined as an HSL value, giving you precise control over hue, saturation, and lightness." } },
          {
            type: "table",
            content: {
              headers: ["Token", "Purpose"],
              rows: [
                ["Background", "The main background color of the documentation."],
                ["Foreground", "Primary text color."],
                ["Primary", "Accent color for links and interactive elements."],
                ["Muted", "Subdued background for cards and secondary areas."],
                ["Muted Foreground", "Secondary text color for descriptions and metadata."],
                ["Border", "Border color for cards, dividers, and containers."],
                ["Link Color", "Color for hyperlinks and navigation items."],
                ["Section Line", "Color of the decorative line next to section headings."],
                ["Code Background", "Background color for code blocks."],
                ["Note Background", "Background color for note and callout blocks."],
                ["Note Border", "Border color for note and callout blocks."],
              ],
            },
          },
          { type: "paragraph", content: { text: "Each color is edited using a visual color picker with HSL sliders. You can also enter hex values directly." } },
        ],
      },
      {
        title: "Layout & Spacing",
        blocks: [
          { type: "paragraph", content: { text: "Control the structural layout of your documentation:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Content Max Width — The maximum width of the main content area (default 680px).",
                "Sidebar Width — Width of the navigation sidebar (default 220px).",
                "Section Spacing — Vertical space between sections (default 40px).",
                "Sidebar Page Gap — Vertical gap between page links in the sidebar.",
              ],
            },
          },
        ],
      },
      {
        title: "Design Examples",
        blocks: [
          { type: "paragraph", content: { text: "The Design tab includes preset examples you can apply with one click — minimal light, dark mode, warm tones, and more. Use them as starting points and customize further to match your brand." } },
          { type: "callout", content: { text: "All design settings are saved automatically and sync between the Design tab and the live preview. No manual save required.", type: "info" } },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: Publishing & Versioning
    // ═══════════════════════════════════════════════════════
    await seed("publishing-versioning", [
      {
        title: "How Publishing Works",
        blocks: [
          { type: "paragraph", content: { text: "0docs uses a snapshot-based publishing model. When you publish, the system captures a complete snapshot of your entire project — pages, sections, blocks, navigation groups, and design settings. This snapshot becomes a versioned release that powers the live documentation site." } },
          { type: "paragraph", content: { text: "Your draft (the builder) and the live published site are completely independent. You can freely edit content in the builder without affecting what readers see until you explicitly publish a new version." } },
        ],
      },
      {
        title: "Publishing a Version",
        blocks: [
          {
            type: "steps",
            content: {
              items: [
                { title: "Open the Publish Tab", description: "Click 'Publish' in the builder's top navigation bar." },
                { title: "Review Changes", description: "The publish dialog shows a summary of changes since the last published version — content changes and design changes are tracked separately." },
                { title: "Add Version Details", description: "Enter a version number (e.g., 1.0.0) and optional release notes." },
                { title: "Publish", description: "Click 'Publish'. The snapshot is created and the live site is updated immediately." },
              ],
            },
          },
        ],
      },
      {
        title: "Version History",
        blocks: [
          { type: "paragraph", content: { text: "Every published version is stored permanently. From the Publish tab, you can:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "View a list of all published versions with timestamps and notes.",
                "See what changed in each version (content diff and design diff).",
                "Restore any previous version with one click — the live site reverts instantly.",
                "Compare current draft against the last published version.",
              ],
            },
          },
          { type: "note", content: { text: "Restoring a version only changes the live published site. Your draft in the builder is not affected." } },
        ],
      },
      {
        title: "Change Tracking",
        blocks: [
          { type: "paragraph", content: { text: "The publishing system automatically tracks two categories of changes:" } },
          {
            type: "table",
            content: {
              headers: ["Category", "What's Tracked"],
              rows: [
                ["Editor Changes", "Pages added/removed/modified, sections reordered, blocks edited, navigation groups changed."],
                ["Design Changes", "Typography updates, color changes, spacing adjustments, layout modifications."],
              ],
            },
          },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: Analytics & Feedback
    // ═══════════════════════════════════════════════════════
    await seed("analytics-feedback", [
      {
        title: "Analytics Dashboard",
        blocks: [
          { type: "paragraph", content: { text: "The Analytics tab in the builder gives you insight into how readers interact with your documentation. All data is collected automatically from your published docs — no additional setup required." } },
        ],
      },
      {
        title: "Page Views",
        blocks: [
          { type: "paragraph", content: { text: "Track which pages get the most traffic. The analytics dashboard shows:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Total view count per page",
                "Average time spent on each page",
                "Last viewed timestamp",
                "Relative popularity ranking",
              ],
            },
          },
          { type: "image", content: { url: "", alt: "Analytics dashboard screenshot", caption: "The analytics dashboard showing page view metrics." } },
        ],
      },
      {
        title: "Search Analytics",
        blocks: [
          { type: "paragraph", content: { text: "Every search query made by readers is logged. This data is invaluable for understanding what users are looking for and identifying content gaps." } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Most searched terms",
                "Queries with zero results (content gaps)",
                "Search frequency over time",
              ],
            },
          },
        ],
      },
      {
        title: "Reader Feedback",
        blocks: [
          { type: "paragraph", content: { text: "Each published page includes an optional feedback widget at the bottom. Readers can indicate whether a page was helpful and leave optional comments. Feedback data is visible in the Analytics tab." } },
          { type: "callout", content: { text: "Use zero-result search queries and negative feedback to identify areas where your documentation needs improvement.", type: "info" } },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: Search & Navigation
    // ═══════════════════════════════════════════════════════
    await seed("search-navigation", [
      {
        title: "Built-in Search",
        blocks: [
          { type: "paragraph", content: { text: "Every published documentation site includes a built-in full-text search. Readers can press ⌘K (or Ctrl+K) to open the search dialog, which searches across all pages, sections, and block content." } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Full-text search across all content",
                "Results grouped by page with highlighted matches",
                "Keyboard-navigable results list",
                "Search queries tracked for analytics",
              ],
            },
          },
        ],
      },
      {
        title: "Sidebar Navigation",
        blocks: [
          { type: "paragraph", content: { text: "The sidebar navigation is auto-generated from your page structure. It includes:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "Page links organized by navigation groups",
                "Active page highlighting",
                "Section-level table of contents for the current page",
                "Collapsible groups for large documentation sites",
                "Custom nav titles (display a different title in the sidebar vs. the page heading)",
              ],
            },
          },
        ],
      },
      {
        title: "Table of Contents",
        blocks: [
          { type: "paragraph", content: { text: "The right sidebar shows a table of contents for the current page. It lists all sections and scrolls to the relevant section when clicked. The active section is highlighted based on scroll position." } },
        ],
      },
      {
        title: "Mobile Navigation",
        blocks: [
          { type: "paragraph", content: { text: "On mobile devices, the sidebar collapses into a hamburger menu. The search function, navigation, and table of contents are all accessible from the mobile menu. All published docs are fully responsive." } },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: API Import
    // ═══════════════════════════════════════════════════════
    await seed("api-import", [
      {
        title: "OpenAPI / Swagger Import",
        blocks: [
          { type: "paragraph", content: { text: "0docs can import OpenAPI (Swagger) specification files and automatically generate API reference documentation. This is the fastest way to create comprehensive API docs." } },
        ],
      },
      {
        title: "How to Import",
        blocks: [
          {
            type: "steps",
            content: {
              items: [
                { title: "Open the Builder", description: "Navigate to any project in the builder." },
                { title: "Click Import", description: "Use the import button in the sidebar to open the OpenAPI import dialog." },
                { title: "Paste or Upload", description: "Paste your OpenAPI JSON/YAML spec or upload a file." },
                { title: "Generate", description: "0docs parses the spec and creates pages with API endpoint blocks for every route." },
              ],
            },
          },
        ],
      },
      {
        title: "What Gets Generated",
        blocks: [
          { type: "paragraph", content: { text: "For each endpoint in the spec, 0docs creates an API Endpoint block containing:" } },
          {
            type: "unordered_list",
            content: {
              items: [
                "HTTP method (GET, POST, PUT, DELETE, PATCH)",
                "Endpoint path",
                "Description from the spec",
                "Request parameters with types and descriptions",
                "Response schema and example responses",
              ],
            },
          },
          { type: "note", content: { text: "After import, all generated content is fully editable. You can add context, reorder endpoints, or merge them with existing documentation." } },
        ],
      },
    ]);

    // ═══════════════════════════════════════════════════════
    // PAGE: Custom Domains
    // ═══════════════════════════════════════════════════════
    await seed("custom-domains", [
      {
        title: "Custom Domain Setup",
        blocks: [
          { type: "paragraph", content: { text: "By default, your documentation is published at /docs/your-project-slug. You can optionally connect a custom domain so your docs are served from your own URL (e.g., docs.yourcompany.com)." } },
        ],
      },
      {
        title: "Configuration",
        blocks: [
          {
            type: "steps",
            content: {
              items: [
                { title: "Open Project Settings", description: "In the builder, switch to the Settings tab." },
                { title: "Enter Domain", description: "Add your custom domain in the 'Custom Domain' field (e.g., docs.example.com)." },
                { title: "Update DNS", description: "Add a CNAME record pointing your domain to the 0docs hosting endpoint." },
                { title: "Verify", description: "DNS propagation may take up to 48 hours. Once verified, your docs will be served from the custom domain." },
              ],
            },
          },
          { type: "callout", content: { text: "Custom domains require DNS configuration with your domain registrar. The exact steps depend on your DNS provider.", type: "info" } },
        ],
      },
    ]);

    // Update project description
    await supabase
      .from("projects")
      .update({ 
        description: "Official documentation and guide for 0docs — the visual documentation builder.",
        name: "0docs"
      })
      .eq("id", PROJECT_ID);

    return new Response(JSON.stringify({ success: true, message: "Homepage content seeded successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
