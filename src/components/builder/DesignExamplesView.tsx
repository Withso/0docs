import type { DesignSettings as DS, BlockStyleSettings } from "@/hooks/use-design-settings";
import DocBlockRenderer from "@/components/docs/DocBlockRenderer";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  SliderField, ColorField, ToggleField,
  FontSelect, WeightSelect, ColorControls, LayoutControls,
  SidebarControls, TOCControls, SectionControls, BlockControls, fontOptions, codeFontOptions,
  blockSections, type BlockKey,
} from "@/components/builder/DesignControls";

// ─── Sample Blocks ───────────────────────────────────
const sampleBlocks: Record<string, { type: string; content: any }> = {
  heading: { type: "heading", content: { text: "Getting Started with DocBuilder" } },
  paragraph: { type: "paragraph", content: { text: "DocBuilder is a powerful documentation platform that helps you create beautiful, organized docs for your projects. Customize every aspect of your documentation's appearance." } },
  code_block: { type: "code_block", content: { language: "typescript", code: `import { createClient } from '@supabase/supabase-js'\n\nconst supabase = createClient(\n  process.env.SUPABASE_URL,\n  process.env.SUPABASE_KEY\n)` } },
  image: { type: "image", content: { url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=300&fit=crop", alt: "Code on a screen — sample image block" } },
  video: { type: "video", content: { url: "" } },
  youtube: { type: "youtube", content: { videoId: "dQw4w9WgXcQ", title: "Sample YouTube Embed" } },
  ordered_list: { type: "ordered_list", content: { items: ["Install the package from npm", "Configure your project settings", "Start building your documentation"] } },
  unordered_list: { type: "unordered_list", content: { items: ["Fully customizable design system", "Real-time live preview", "OpenAPI import support"] } },
  note: { type: "note", content: { text: "This is a note block. Use it to highlight important information." } },
  callout: { type: "callout", content: { text: "Callout blocks are great for tips, warnings, or content you want to highlight." } },
  tabs: { type: "tabs", content: { tabs: [{ label: "React", content: "Use React for building interactive UIs." }, { label: "Vue", content: "Vue is progressive and versatile." }] } },
  accordion: { type: "accordion", content: { items: [{ title: "What is DocBuilder?", content: "A documentation platform with full customization." }, { title: "How to get started?", content: "Create a project and start adding pages." }] } },
  card: { type: "card", content: { title: "Quick Start Guide", description: "Learn how to set up your first documentation project in minutes.", link: "#" } },
  steps: { type: "steps", content: { items: [{ title: "Install", description: "Add the package to your project." }, { title: "Configure", description: "Set up your config file." }, { title: "Deploy", description: "Push to production." }] } },
  table: { type: "table", content: { headers: ["Property", "Type", "Default"], rows: [["color", "string", "#000"], ["size", "number", "16"], ["weight", "string", "400"]] } },
  divider: { type: "divider", content: {} },
  quote: { type: "quote", content: { text: "The best documentation is the one that doesn't need to exist.", attribution: "Someone wise" } },
  api_endpoint: { type: "api_endpoint", content: { method: "GET", path: "/api/v1/projects", description: "Retrieve all projects for the authenticated user.", parameters: [{ name: "limit", type: "number", required: false }, { name: "offset", type: "number", required: false }], response: '{\n  "data": [],\n  "total": 0\n}' } },
  code_tabs: { type: "code_tabs", content: { tabs: [{ label: "JavaScript", code: 'console.log("Hello");' }, { label: "Python", code: 'print("Hello")' }] } },
  inline_editor: { type: "inline_editor", content: { html: "<p>Rich text content with <strong>bold</strong> and <em>italic</em> formatting.</p>" } },
};

// ─── Props ───────────────────────────────────────────
interface ExamplesContentProps {
  settings: DS;
  activeNav: string;
  update: <K extends keyof DS>(key: K, value: DS[K]) => void;
  updateBlockStyle: (block: BlockKey, key: keyof BlockStyleSettings, value: any) => void;
}

// ─── Examples Content (left area) ────────────────────
export function ExamplesContent({ settings: local, activeNav, update, updateBlockStyle }: ExamplesContentProps) {
  const makeFakeBlock = (type: string) => ({
    id: `sample-${type}`,
    section_id: "sample",
    type,
    content: sampleBlocks[type]?.content || {},
    order_index: 0,
  });

  const navLabel = activeNav === "typography" ? "Typography"
    : activeNav === "colors" ? "Colors"
    : activeNav === "layout" ? "Layout"
    : activeNav === "sidebar" ? "Sidebar"
    : blockSections.find(b => b.key === activeNav)?.label || activeNav;

  const renderActiveContent = () => {
    switch (activeNav) {
      case "typography":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <FontSelect label="Heading Font" value={local.headingFont} onChange={(v) => update("headingFont", v)} options={fontOptions} />
              <FontSelect label="Body Font" value={local.bodyFont} onChange={(v) => update("bodyFont", v)} options={fontOptions} />
              <FontSelect label="Code Font" value={local.codeFont} onChange={(v) => update("codeFont", v)} options={codeFontOptions} />
              <WeightSelect label="Heading Weight" value={local.headingWeight} onChange={(v) => update("headingWeight", v)} />
              <SliderField label="Base Font Size" value={local.baseFontSize} onChange={(v) => update("baseFontSize", v)} min={12} max={20} step={1} />
              <SliderField label="Heading Size" value={local.headingFontSize} onChange={(v) => update("headingFontSize", v)} min={14} max={32} step={1} />
              <SliderField label="Line Height" value={local.lineHeight} onChange={(v) => update("lineHeight", v)} min={1.2} max={2.2} step={0.1} unit="" />
            </div>
            <PreviewCard settings={local}>
              <h3 style={{ fontFamily: `'${local.headingFont}', sans-serif`, fontWeight: local.headingWeight as any, fontSize: `${local.headingFontSize}px`, marginBottom: "8px" }}>
                Heading Example
              </h3>
              <p style={{ fontFamily: `'${local.bodyFont}', sans-serif`, fontSize: `${local.baseFontSize}px`, lineHeight: local.lineHeight, color: `hsl(${local.foregroundColor})` }}>
                Body text using your selected font.
              </p>
              <pre style={{ fontFamily: `'${local.codeFont}', monospace`, fontSize: `${local.baseFontSize - 1}px`, backgroundColor: `hsl(${local.codeBlockBg})`, padding: "12px", borderRadius: `${local.codeBlockBorderRadius}px`, marginTop: "12px" }}>
                <code>{`const example = "inline code font"`}</code>
              </pre>
            </PreviewCard>
          </div>
        );
      case "colors":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <ColorControls local={local} update={update} />
            </div>
            <PreviewCard settings={local}>
              <div className="flex gap-2 flex-wrap">
                {["backgroundColor", "foregroundColor", "primaryColor", "accentColor", "mutedColor", "borderColor", "linkColor"].map((k) => (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-lg shadow-sm" style={{ backgroundColor: `hsl(${local[k as keyof DS]})`, boxShadow: 'inset 0 0 0 1px hsl(var(--foreground) / 0.08)' }} />
                    <span className="text-[9px] text-muted-foreground">{k.replace("Color", "").replace("ground", "")}</span>
                  </div>
                ))}
              </div>
            </PreviewCard>
          </div>
        );
      case "layout":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <LayoutControls local={local} update={update} />
            </div>
          </div>
        );
      case "sidebar":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <SidebarControls local={local} update={update} />
            </div>
            <PreviewCard settings={local}>
              <div style={{ backgroundColor: `hsl(${local.sidebarBg})`, padding: "12px", borderRadius: "8px", width: `${Math.min(local.sidebarWidth, 260)}px` }}>
                {["Introduction", "Getting Started", "Configuration"].map((p, i) => (
                  <div key={p} style={{
                    padding: `${local.sidebarPageGap + 4}px 8px`,
                    fontSize: `${local.sidebarFontSize}px`,
                    color: i === 0 ? `hsl(${local.sidebarActiveColor})` : `hsl(${local.sidebarTextColor})`,
                    fontWeight: i === 0 ? 600 : 400,
                    borderLeft: i === 0 ? `2px solid hsl(${local.sidebarIndicatorColor})` : "2px solid transparent",
                    fontFamily: `'${local.bodyFont}', sans-serif`,
                  }}>
                    {p}
                  </div>
                ))}
              </div>
            </PreviewCard>
          </div>
        );
      default: {
        const blockKey = activeNav as BlockKey;
        const sample = sampleBlocks[blockKey];
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <BlockControls blockKey={blockKey} local={local} updateBlockStyle={updateBlockStyle} />
            </div>
            {sample && (
              <PreviewCard settings={local}>
                <DocBlockRenderer block={makeFakeBlock(blockKey)} settings={local} />
              </PreviewCard>
            )}
          </div>
        );
      }
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="max-w-[680px] mx-auto px-8 py-8">
        <h2 className="text-[18px] font-semibold text-foreground mb-6">{navLabel}</h2>
        {renderActiveContent()}
        <div className="h-12" />
      </div>
    </ScrollArea>
  );
}

function PreviewCard({ settings, children }: { settings: DS; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: `hsl(${settings.backgroundColor})`,
        border: '1px solid hsl(var(--foreground) / 0.06)',
        color: `hsl(${settings.foregroundColor})`,
      }}
    >
      {children}
    </div>
  );
}

export default ExamplesContent;
