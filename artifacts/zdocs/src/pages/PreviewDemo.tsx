import { useState } from "react";
import DocContentView from "@/components/docs/DocContentView";
import { defaultDesignSettings } from "@/hooks/use-design-settings";

const SETTINGS = {
  ...defaultDesignSettings,
  backgroundColor: "222 20% 7%",
  foregroundColor: "210 20% 96%",
  primaryColor: "152 78% 40%",
  primaryForegroundColor: "0 0% 100%",
  mutedColor: "222 18% 12%",
  mutedForegroundColor: "215 16% 55%",
  accentColor: "222 18% 14%",
  borderColor: "215 16% 18%",
  linkColor: "152 78% 48%",
  sectionLineColor: "215 16% 18%",
  codeBlockBg: "222 18% 10%",
  noteBg: "152 40% 8%",
  noteBorderColor: "152 50% 22%",
  sidebarBg: "222 20% 5%",
  sidebarTextColor: "215 16% 65%",
  sidebarActiveColor: "152 78% 48%",
  sidebarIndicatorColor: "152 78% 48%",
  sidebarLabelColor: "210 20% 96%",
  appearance: { default: "dark" as const, strict: true },
  colors: { primary: "#15B36E", light: "#4ADE80", dark: "#15B36E" },
  backgroundColors: { light: "#ffffff", dark: "#0d1117" },
};

const NAV_GROUPS = [
  { id: "g1", title: "Getting Started", order_index: 0, type: "label" },
  { id: "g2", title: "Core Concepts", order_index: 1, type: "label" },
  { id: "g3", title: "API Reference", order_index: 2, type: "label" },
];

const PAGES = [
  { id: "p1", title: "Introduction", slug: "introduction", order_index: 0, nav_group_id: "g1", nav_title: null },
  { id: "p2", title: "Quickstart", slug: "quickstart", order_index: 1, nav_group_id: "g1", nav_title: null },
  { id: "p3", title: "Installation", slug: "installation", order_index: 2, nav_group_id: "g1", nav_title: null },
  { id: "p4", title: "Configuration", slug: "configuration", order_index: 3, nav_group_id: "g2", nav_title: null },
  { id: "p5", title: "Navigation", slug: "navigation", order_index: 4, nav_group_id: "g2", nav_title: null },
  { id: "p6", title: "Components", slug: "components", order_index: 5, nav_group_id: "g2", nav_title: null },
  { id: "p7", title: "Theming", slug: "theming", order_index: 6, nav_group_id: "g2", nav_title: null },
  { id: "p8", title: "Projects", slug: "projects", order_index: 7, nav_group_id: "g3", nav_title: null },
  { id: "p9", title: "Pages", slug: "pages", order_index: 8, nav_group_id: "g3", nav_title: null },
  { id: "p10", title: "Publishing", slug: "publishing", order_index: 9, nav_group_id: "g3", nav_title: null },
];

const SECTIONS = [
  { id: "s1", page_id: "p2", title: "Prerequisites", order_index: 0, nav_title: "Prerequisites" },
  { id: "s2", page_id: "p2", title: "Setup your project", order_index: 1, nav_title: "Setup" },
  { id: "s3", page_id: "p2", title: "Deploy", order_index: 2, nav_title: "Deploy" },
];

const BLOCKS = [
  // Intro paragraph
  {
    id: "b1", section_id: "s1", type: "paragraph", order_index: 0,
    content: { text: "0docs is an open source documentation platform with a Mintlify-grade editor, themable design system, and a beautiful public reader — all self-hostable for free." },
  },
  {
    id: "b2", section_id: "s1", type: "note", order_index: 1,
    content: { text: "You need Node.js 18+ and pnpm installed before starting. A PostgreSQL database is required for persistence.", variant: "info" },
  },
  // Heading
  {
    id: "b3", section_id: "s2", type: "heading", order_index: 0,
    content: { text: "Clone the repository" },
  },
  {
    id: "b4", section_id: "s2", type: "code_block", order_index: 1,
    content: {
      language: "bash",
      code: "git clone https://github.com/Withso/0docs\ncd 0docs\npnpm install",
    },
  },
  {
    id: "b5", section_id: "s2", type: "heading", order_index: 2,
    content: { text: "Configure environment" },
  },
  {
    id: "b6", section_id: "s2", type: "paragraph", order_index: 3,
    content: { text: "Copy the example environment file and fill in your database credentials and auth settings." },
  },
  {
    id: "b7", section_id: "s2", type: "code_block", order_index: 4,
    content: {
      language: "bash",
      code: "cp .env.example .env\n# Edit .env with your DATABASE_URL and AUTH_MODE",
    },
  },
  {
    id: "b8", section_id: "s3", type: "heading", order_index: 0,
    content: { text: "Start the server" },
  },
  {
    id: "b9", section_id: "s3", type: "code_block", order_index: 1,
    content: {
      language: "bash",
      code: "pnpm run dev\n# API runs on :8080, web on :25883",
    },
  },
  {
    id: "b10", section_id: "s3", type: "paragraph", order_index: 2,
    content: { text: "The database schema is applied automatically on first boot. Open http://localhost:25883 to access the editor." },
  },
];

const PreviewDemo = () => {
  const [activePage, setActivePage] = useState(PAGES[1]);

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "hsl(222 20% 7%)" }}>
      <DocContentView
        settings={SETTINGS}
        projectName="0docs"
        pages={PAGES}
        activePage={activePage}
        sections={SECTIONS.filter((s) => s.page_id === activePage.id)}
        blocks={BLOCKS.filter((b) => SECTIONS.filter((s) => s.page_id === activePage.id).map((s) => s.id).includes(b.section_id))}
        allSections={SECTIONS}
        allBlocks={BLOCKS}
        onSelectPage={(p) => setActivePage(p as typeof PAGES[0])}
        navGroups={NAV_GROUPS}
        showFeedback={false}
        showMobileNav={false}
      />
    </div>
  );
};

export default PreviewDemo;
