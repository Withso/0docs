import DocBlockRenderer from "@/components/docs/DocBlockRenderer";
import type { DesignSettings } from "@/hooks/use-design-settings";

type BlockKey = keyof DesignSettings["blockStyles"];

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 90'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23dbeafe'/><stop offset='100%25' stop-color='%23bfdbfe'/></linearGradient></defs><rect width='240' height='90' fill='url(%23g)'/><circle cx='180' cy='28' r='12' fill='%23fbbf24'/><polygon points='40,80 90,40 130,60 200,90' fill='%2360a5fa'/></svg>";

const SAMPLES: Record<string, any> = {
  heading: { text: "Section heading" },
  paragraph: {
    text: "A short paragraph that demonstrates how body copy will render — typography, color, spacing.",
  },
  code_block: {
    language: "typescript",
    filename: "example.ts",
    code: 'const greeting = "hello";\nconsole.log(greeting);',
  },
  ordered_list: { items: ["First item", "Second item", "Third item"] },
  unordered_list: { items: ["First item", "Second item", "Third item"] },
  note: { text: "This is a sample note callout.", variant: "note" },
  callout: { text: "This is an info callout — use for tips and asides.", variant: "info" },
  card: { title: "Card title", description: "Short supporting description text." },
  steps: {
    items: [
      { title: "Install dependencies", description: "Run npm install in your project root." },
      { title: "Start the server", description: "Run npm run dev to launch." },
    ],
  },
  table: {
    headers: ["Name", "Type", "Description"],
    rows: [
      ["count", "integer", "Maximum results to return"],
      ["name", "string", "Display name of the resource"],
    ],
  },
  divider: {},
  quote: { text: "Design is not just what it looks like. Design is how it works.", attribution: "Steve Jobs" },
  accordion: {
    items: [
      { title: "How does this work?", content: "Click the row to expand and reveal the answer." },
      { title: "Can I customize it?", content: "Every color, font, and spacing value is editable below." },
    ],
  },
  tabs: {
    tabs: [
      { title: "First", content: "First tab content." },
      { title: "Second", content: "Second tab content." },
    ],
  },
  image: { url: PLACEHOLDER_IMG, alt: "Sample image", width: 100, align: "left" },
  frame: { url: PLACEHOLDER_IMG, caption: "A framed image with caption", width: 100, align: "center" },
  expandable: { title: "Show details", content: "Hidden content revealed on expand.", defaultOpen: false },
  update: { date: "Dec 01, 2025", version: "v1.2", title: "Sample release", body: "Release notes go here." },
  api_endpoint: {
    method: "GET",
    path: "/v1/users",
    description: "List all users in your workspace.",
    parameters: [{ name: "limit", type: "integer", description: "Maximum results to return" }],
  },
  code_tabs: {
    tabs: [
      { label: "JavaScript", language: "js", code: "const x = 1;\nconsole.log(x);" },
      { label: "TypeScript", language: "ts", code: "const x: number = 1;\nconsole.log(x);" },
    ],
  },
  inline_editor: { html: "<p>Rich <strong>inline</strong> editor content with <em>formatting</em>.</p>" },
};

export const BlockPreview = ({
  blockKey,
  settings,
  height,
}: {
  blockKey: BlockKey;
  settings: DesignSettings;
  height?: number;
}) => {
  const content = SAMPLES[blockKey] ?? { text: "Sample" };

  let body: React.ReactNode;
  if (blockKey === "video" || blockKey === "youtube") {
    body = (
      <div
        style={{
          aspectRatio: "16/9",
          borderRadius: 10,
          background: `hsl(${settings.mutedColor})`,
          border: `1px solid hsl(${settings.borderColor})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: `hsl(${settings.mutedForegroundColor})`,
          fontSize: 12,
          fontFamily: `'${settings.bodyFont}', sans-serif`,
        }}
      >
        {blockKey === "youtube" ? "YouTube video preview" : "Video player preview"}
      </div>
    );
  } else {
    body = (
      <DocBlockRenderer
        block={{ id: "preview", section_id: "preview", type: blockKey, content, order_index: 0 }}
        settings={settings}
      />
    );
  }

  return (
    <PreviewSurface settings={settings} height={height}>
      <div className="block-preview-content">{body}</div>
    </PreviewSurface>
  );
};

export const PreviewSurface = ({
  settings,
  height,
  children,
  label = "Live preview",
  rightSlot,
}: {
  settings: DesignSettings;
  height?: number;
  children: React.ReactNode;
  label?: string;
  rightSlot?: React.ReactNode;
}) => (
  <div
    className="rounded-md overflow-hidden"
    style={{ border: `1px solid hsl(${settings.borderColor})` }}
  >
    <div
      className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium flex items-center justify-between"
      style={{
        background: `hsl(${settings.mutedColor})`,
        color: `hsl(${settings.mutedForegroundColor})`,
        borderBottom: `1px solid hsl(${settings.borderColor})`,
      }}
    >
      <span>{label}</span>
      {rightSlot}
    </div>
    <div
      className="px-4 py-3 overflow-auto"
      style={{
        background: `hsl(${settings.backgroundColor})`,
        maxHeight: height ?? 220,
      }}
    >
      {children}
    </div>
  </div>
);

export default BlockPreview;
