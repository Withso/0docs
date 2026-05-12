import {
  Search,
  Sparkles,
  MessageSquare,
  BookOpen,
  Settings,
  Brain,
  Component,
  Palette,
  Compass,
  GitBranch,
  Globe,
  Code2,
  Wrench,
  FileCode,
  Image as ImageIcon,
  Hash,
  Rocket,
  Download,
  Pencil,
  Boxes,
} from "lucide-react";

const COLORS = {
  bg: "#0a0d0c",
  panel: "#0d1210",
  border: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.10)",
  text: "rgba(255,255,255,0.92)",
  textMuted: "rgba(255,255,255,0.55)",
  textDim: "rgba(255,255,255,0.40)",
  accent: "#15B36E",
  accentSoft: "rgba(21,179,110,0.12)",
  card: "#0f1513",
  cardArt: "#0c1310",
  gridLine: "rgba(21,179,110,0.08)",
};

type NavItem = { label: string; icon: React.ComponentType<{ className?: string }>; active?: boolean };
type NavSection = { heading?: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    items: [
      { label: "Ask Assistant", icon: Sparkles },
      { label: "Quickstart", icon: BookOpen, active: true },
      { label: "Global Settings", icon: Settings },
      { label: "AI Optimization", icon: Brain },
      { label: "Components", icon: Component },
      { label: "Themes", icon: Palette },
    ],
  },
  {
    items: [
      { label: "Navigation", icon: Compass },
      { label: "Versioning", icon: GitBranch },
      { label: "Custom Domain", icon: Globe },
      { label: "Web Editor", icon: Code2 },
      { label: "Development", icon: Wrench },
    ],
  },
  {
    heading: "Markdown Syntax",
    items: [
      { label: "Global Settings", icon: Settings },
      { label: "Code Blocks", icon: FileCode },
      { label: "Media Embeds", icon: ImageIcon },
      { label: "Global Settings", icon: Settings },
      { label: "Navigation", icon: Compass },
      { label: "Snippets", icon: Hash },
    ],
  },
];

const TABS = [
  { label: "Guides", active: true },
  { label: "API Reference", active: false },
  { label: "Changelog", active: false },
];

const TOC = [
  { label: "Introduction", active: true },
  { label: "Getting started", active: false },
  { label: "AI optimization", active: false },
  { label: "Themes", active: false },
];

type Card = {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

const CARDS: Card[] = [
  { title: "Quickstart", desc: "Deploy your first docs site in minutes with our step-by-step guide", icon: Rocket },
  { title: "Installation", desc: "Install the CLI to preview and develop your docs locally", icon: Download },
  { title: "Web editor", desc: "Make quick updates and manage content with our browser-based editor", icon: Pencil },
  { title: "Components", desc: "Build rich, interactive documentation with our ready-to-use components", icon: Boxes },
];

/* ── Sidebar ─────────────────────────────────────────────────────── */

const LogoMark = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden>
    <circle cx="16" cy="16" r="13" stroke={COLORS.accent} strokeWidth="3.2" />
  </svg>
);

const Sidebar = () => (
  <aside
    className="flex flex-col flex-shrink-0 h-full overflow-hidden"
    style={{ width: 232, borderRight: `1px solid ${COLORS.border}`, background: COLORS.bg }}
  >
    <div className="flex items-center gap-2 px-5 h-[52px] flex-shrink-0">
      <LogoMark />
      <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>
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

/* ── Top bar ─────────────────────────────────────────────────────── */

const TopBar = () => (
  <div
    className="flex items-center justify-between flex-shrink-0 px-7"
    style={{ height: 52, borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg }}
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
        <Search className="w-[13px] h-[13px]" style={{ color: COLORS.textDim }} />
        <span style={{ fontSize: 12, color: COLORS.textDim, flex: 1 }}>Search or ask</span>
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
        <Sparkles className="w-[12px] h-[12px]" style={{ color: COLORS.accent }} />
        Ask AI
      </button>
    </div>
  </div>
);

/* ── Cards ───────────────────────────────────────────────────────── */

const CardArt = ({ Icon }: { Icon: Card["icon"] }) => (
  <div
    className="relative w-full overflow-hidden flex items-center justify-center"
    style={{
      height: 132,
      borderRadius: 8,
      background: COLORS.cardArt,
      backgroundImage: `linear-gradient(${COLORS.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.gridLine} 1px, transparent 1px)`,
      backgroundSize: "16px 16px",
      border: `1px solid ${COLORS.border}`,
    }}
  >
    <Icon className="w-9 h-9" style={{ color: COLORS.accent, strokeWidth: 1.4 }} />
  </div>
);

const FeatureCard = ({ card }: { card: Card }) => (
  <div
    className="p-3.5 transition-colors"
    style={{
      borderRadius: 12,
      border: `1px solid ${COLORS.border}`,
      background: COLORS.card,
    }}
  >
    <CardArt Icon={card.icon} />
    <div className="mt-3.5">
      <div style={{ color: COLORS.text, fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.005em" }}>
        {card.title}
      </div>
      <div
        className="mt-1"
        style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5 }}
      >
        {card.desc}
      </div>
    </div>
  </div>
);

/* ── TOC ─────────────────────────────────────────────────────────── */

const TOCPanel = () => (
  <aside
    className="flex-shrink-0 pt-9 pl-6 pr-7"
    style={{ width: 200 }}
  >
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

/* ── Page ────────────────────────────────────────────────────────── */

const PreviewDemo = () => (
  <div
    className="w-full h-screen flex overflow-hidden"
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
              Getting Started
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
              Quickstart Guide
            </h1>
            <p
              className="mt-2"
              style={{
                color: COLORS.textMuted,
                fontSize: 13.5,
                lineHeight: 1.55,
              }}
            >
              Start building intelligent documentation in under five minutes.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3.5">
              {CARDS.map((c) => (
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
