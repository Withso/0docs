import {
  Search,
  Sparkles,
  Home,
  Pencil,
  SlidersHorizontal,
  BarChart3,
  Workflow,
  Bot,
  Plug,
  GitBranch,
  Rocket,
  Globe,
  Users,
  Key,
  Database,
  Terminal,
  Info,
  Boxes,
  Layout,
} from "lucide-react";

const COLORS = {
  bg: "#0a0d12",
  panel: "#0c1018",
  border: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.10)",
  text: "rgba(255,255,255,0.94)",
  textMuted: "rgba(255,255,255,0.58)",
  textDim: "rgba(255,255,255,0.40)",
  accent: "#3B82F6",
  accentSoft: "rgba(59,130,246,0.12)",
  accentSofter: "rgba(59,130,246,0.06)",
  card: "#0f131c",
  cardArt: "#0c1119",
  gridLine: "rgba(59,130,246,0.07)",
  noteBg: "rgba(59,130,246,0.06)",
  noteBorder: "rgba(59,130,246,0.22)",
  codeBg: "#0b0f17",
};

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
};
type NavSection = { heading?: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    items: [
      { label: "Project Home", icon: Home },
      { label: "Visual Editor", icon: Pencil, active: true },
      { label: "Configurations", icon: SlidersHorizontal },
      { label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    heading: "Agents",
    items: [
      { label: "Workflows", icon: Workflow },
      { label: "Agent", icon: Bot },
      { label: "MCP Server", icon: Plug },
    ],
  },
  {
    heading: "Publishing",
    items: [
      { label: "Versioning", icon: GitBranch },
      { label: "Publish", icon: Rocket },
      { label: "Custom Domain", icon: Globe },
    ],
  },
  {
    heading: "Workspace",
    items: [
      { label: "Members", icon: Users },
      { label: "API Keys", icon: Key },
      { label: "Database", icon: Database },
    ],
  },
];

const TABS = [
  { label: "Docs", active: true },
  { label: "Reference", active: false },
  { label: "Changelog", active: false },
];

const TOC = [
  { label: "Overview", active: true },
  { label: "Three steps to ship", active: false },
  { label: "Run locally", active: false },
  { label: "Next steps", active: false },
];

const LogoMark = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden>
    <circle cx="16" cy="16" r="13" stroke={COLORS.accent} strokeWidth="3.2" />
  </svg>
);

const Sidebar = () => (
  <aside
    className="flex flex-col flex-shrink-0 h-full overflow-hidden"
    style={{
      width: 232,
      borderRight: `1px solid ${COLORS.border}`,
      background: COLORS.bg,
    }}
  >
    <div className="flex items-center gap-2 px-5 h-[52px] flex-shrink-0">
      <LogoMark />
      <span
        style={{
          color: COLORS.text,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        0docs
      </span>
    </div>
    <div className="flex-1 overflow-hidden px-3 pt-2 pb-4">
      {NAV.map((section, idx) => (
        <div key={idx} className={idx > 0 ? "mt-5" : ""}>
          {section.heading && (
            <div
              className="px-2.5 mb-1.5 uppercase"
              style={{
                color: COLORS.textDim,
                fontSize: 10.5,
                letterSpacing: "0.08em",
                fontWeight: 500,
              }}
            >
              {section.heading}
            </div>
          )}
          <ul className="flex flex-col gap-px">
            {section.items.map((it, i) => {
              const Icon = it.icon;
              return (
                <li key={i}>
                  <div
                    className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-[6px]"
                    style={{
                      background: it.active ? COLORS.accentSoft : "transparent",
                      color: it.active ? COLORS.accent : COLORS.textMuted,
                      fontSize: 12.5,
                      fontWeight: it.active ? 500 : 400,
                      lineHeight: 1.2,
                    }}
                  >
                    <Icon className="w-[14px] h-[14px] flex-shrink-0" />
                    <span>{it.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  </aside>
);

const TopBar = () => (
  <div
    className="flex items-center justify-between flex-shrink-0 px-7"
    style={{
      height: 52,
      borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.bg,
    }}
  >
    <div className="flex items-center gap-7 h-full">
      {TABS.map((t) => (
        <div
          key={t.label}
          className="relative h-full flex items-center"
          style={{
            color: t.active ? COLORS.accent : COLORS.textMuted,
            fontSize: 13,
            fontWeight: t.active ? 500 : 400,
          }}
        >
          {t.label}
          {t.active && (
            <span
              className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full"
              style={{ background: COLORS.accent }}
            />
          )}
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center gap-2 px-3 h-8 rounded-[8px]"
        style={{
          width: 280,
          border: `1px solid ${COLORS.border}`,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <Search
          className="w-[13px] h-[13px]"
          style={{ color: COLORS.textDim }}
        />
        <span style={{ fontSize: 12, color: COLORS.textDim, flex: 1 }}>
          Search the docs
        </span>
        <span
          className="px-1 rounded text-[10px]"
          style={{ color: COLORS.textDim, border: `1px solid ${COLORS.border}` }}
        >
          ⌘K
        </span>
      </div>
      <button
        className="flex items-center gap-1.5 h-8 px-3 rounded-[8px]"
        style={{
          border: `1px solid ${COLORS.borderStrong}`,
          background: "rgba(255,255,255,0.02)",
          color: COLORS.text,
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <Sparkles
          className="w-[12px] h-[12px]"
          style={{ color: COLORS.accent }}
        />
        Ask 0docs
      </button>
    </div>
  </div>
);

const NoteBlock = ({ children }: { children: React.ReactNode }) => (
  <div
    className="flex items-start gap-2.5 px-3.5 py-3 my-5 rounded-[10px]"
    style={{
      background: COLORS.noteBg,
      border: `1px solid ${COLORS.noteBorder}`,
    }}
  >
    <Info
      className="w-[14px] h-[14px] mt-[2px] flex-shrink-0"
      style={{ color: COLORS.accent }}
    />
    <div style={{ color: COLORS.text, fontSize: 12.5, lineHeight: 1.55 }}>
      {children}
    </div>
  </div>
);

const StepsBlock = ({
  items,
}: {
  items: { title: string; body: string }[];
}) => (
  <div className="my-6">
    {items.map((it, i) => {
      const isLast = i === items.length - 1;
      return (
        <div
          key={i}
          className="flex gap-3.5 relative"
          style={{ paddingBottom: isLast ? 0 : 18 }}
        >
          <div
            className="flex flex-col items-center"
            style={{ width: 26, flexShrink: 0 }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: COLORS.accentSoft,
                color: COLORS.accent,
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${COLORS.noteBorder}`,
              }}
            >
              {i + 1}
            </div>
            {!isLast && (
              <div
                className="flex-1 mt-1"
                style={{
                  width: 1,
                  background: COLORS.border,
                  minHeight: 18,
                }}
              />
            )}
          </div>
          <div className="pb-1 flex-1 min-w-0">
            <div
              style={{
                color: COLORS.text,
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: "-0.005em",
              }}
            >
              {it.title}
            </div>
            <div
              className="mt-1"
              style={{
                color: COLORS.textMuted,
                fontSize: 12.5,
                lineHeight: 1.55,
              }}
            >
              {it.body}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const CodeBlock = () => (
  <div
    className="my-5 overflow-hidden"
    style={{
      borderRadius: 10,
      border: `1px solid ${COLORS.border}`,
      background: COLORS.codeBg,
    }}
  >
    <div
      className="flex items-center justify-between px-3.5 py-2"
      style={{ borderBottom: `1px solid ${COLORS.border}` }}
    >
      <div
        className="flex items-center gap-1.5"
        style={{ color: COLORS.textMuted, fontSize: 11 }}
      >
        <Terminal className="w-[11px] h-[11px]" />
        <span>terminal</span>
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 10.5 }}>bash</div>
    </div>
    <pre
      className="px-3.5 py-3 overflow-hidden"
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11.5,
        lineHeight: 1.7,
        color: COLORS.text,
        margin: 0,
      }}
    >
      <span style={{ color: COLORS.textDim }}>$ </span>
      <span>git clone https://github.com/Withso/0docs</span>
      {"\n"}
      <span style={{ color: COLORS.textDim }}>$ </span>
      <span>cd 0docs && pnpm install</span>
      {"\n"}
      <span style={{ color: COLORS.textDim }}>$ </span>
      <span style={{ color: COLORS.accent }}>./install.sh</span>
    </pre>
  </div>
);

type Card = {
  title: string;
  desc: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
};

const FOOTER_CARDS: Card[] = [
  {
    title: "Block library",
    desc: "Cards, steps, callouts, tabs, code, API endpoints, and more.",
    icon: Boxes,
  },
  {
    title: "Theming",
    desc: "Tweak colors, fonts, sidebar, and per-block styles in one place.",
    icon: Layout,
  },
];

const FeatureCard = ({ card }: { card: Card }) => (
  <div
    className="p-3.5"
    style={{
      borderRadius: 10,
      border: `1px solid ${COLORS.border}`,
      background: COLORS.card,
    }}
  >
    <div
      className="flex items-center justify-center mb-3"
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: COLORS.accentSofter,
        border: `1px solid ${COLORS.noteBorder}`,
      }}
    >
      <card.icon
        className="w-[15px] h-[15px]"
        style={{ color: COLORS.accent }}
      />
    </div>
    <div
      style={{
        color: COLORS.text,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "-0.005em",
      }}
    >
      {card.title}
    </div>
    <div
      className="mt-1"
      style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5 }}
    >
      {card.desc}
    </div>
  </div>
);

const TOCPanel = () => (
  <aside className="flex-shrink-0 pt-9 pl-6 pr-7" style={{ width: 200 }}>
    <div
      className="flex items-center gap-1.5 mb-2.5"
      style={{ color: COLORS.textMuted, fontSize: 11.5, fontWeight: 500 }}
    >
      <span
        className="inline-block w-3 h-[1.5px]"
        style={{ background: COLORS.textDim }}
      />
      On this page
    </div>
    <ul className="flex flex-col">
      {TOC.map((t, i) => (
        <li key={i} className="relative pl-3 py-[5px]">
          {t.active && (
            <span
              className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
              style={{ background: COLORS.accent }}
            />
          )}
          <span
            style={{
              color: t.active ? COLORS.accent : COLORS.textMuted,
              fontSize: 12,
              fontWeight: t.active ? 500 : 400,
            }}
          >
            {t.label}
          </span>
        </li>
      ))}
    </ul>
  </aside>
);

const PreviewDemo = () => (
  <div
    className="w-full h-full flex overflow-hidden"
    style={{
      background: COLORS.bg,
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}
  >
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 min-w-0 px-10 pt-9 pb-10 overflow-hidden">
          <div style={{ maxWidth: 720 }}>
            <div
              style={{
                color: COLORS.accent,
                fontSize: 12.5,
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              Welcome
            </div>
            <h1
              className="mt-1.5"
              style={{
                color: COLORS.text,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              Your docs, your way
            </h1>
            <p
              className="mt-2"
              style={{
                color: COLORS.textMuted,
                fontSize: 13.5,
                lineHeight: 1.55,
              }}
            >
              0docs gives you a block-based editor, a themable design system,
              and a beautiful public reader — fully open source and
              self-hostable in one command.
            </p>

            <NoteBlock>
              <strong style={{ color: COLORS.text, fontWeight: 600 }}>
                Heads up.
              </strong>{" "}
              Every page you write is rendered by the same DocBlockRenderer
              that powers this preview — what you build is what your readers
              see.
            </NoteBlock>

            <StepsBlock
              items={[
                {
                  title: "Create a project",
                  body: "Spin up a workspace and pick a theme. Branding cascades to every block.",
                },
                {
                  title: "Author with blocks",
                  body: "Drag in callouts, steps, code tabs, cards, accordions, API endpoints — no markdown required.",
                },
                {
                  title: "Publish a version",
                  body: "Snapshot your docs, point a custom domain, and ship — with full version history.",
                },
              ]}
            />

            <CodeBlock />

            <div className="mt-7 grid grid-cols-2 gap-3.5">
              {FOOTER_CARDS.map((c) => (
                <FeatureCard key={c.title} card={c} />
              ))}
            </div>
          </div>
        </main>
        <TOCPanel />
      </div>
    </div>
  </div>
);

export default PreviewDemo;
