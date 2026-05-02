import {
  ChevronDown, ChevronRight, FileText, Folder, Plus, Settings, Search,
  SlidersHorizontal, Eye, Code2, Play, Upload, RotateCw, BookOpen,
} from "lucide-react";
import "./_group.css";

/**
 * Current 0docs Builder — replicates the existing /builder/:id/editor view.
 * 3-pane: NavigationTree (left) + content header + article editor.
 * No project rail. Neutral cool-blue tinted dark (no green accent).
 */
export default function Current() {
  return (
    <div className="zdocs-shell" data-variant="current">
      {/* ─── LEFT: Navigation tree ─────────────────────────── */}
      <aside
        className="pane"
        style={{ width: 268, background: "var(--tree-bg)" }}
      >
        {/* Editor tabs (Navigation | Files) */}
        <div
          className="row"
          style={{
            height: 40,
            padding: "0 12px",
            borderBottom: "1px solid var(--border)",
            gap: 4,
          }}
        >
          <Tab active>Navigation</Tab>
          <Tab>Files</Tab>
        </div>

        {/* Tree content */}
        <div style={{ padding: "8px 6px", flex: 1, overflowY: "auto" }}>
          <SectionLabel>Pages</SectionLabel>

          <Group label="Getting started" expanded count={3}>
            <Page label="Introduction" active />
            <Page label="Quickstart" />
            <Page label="Installation" />
          </Group>

          <Group label="Guides" expanded count={4}>
            <Page label="Authentication" />
            <Page label="Database setup" />
            <Page label="Deployment" />
            <Page label="Configuration" />
          </Group>

          <Group label="API reference" />
          <Group label="Examples" />
        </div>

        {/* Bottom: Configurations button */}
        <button
          className="row"
          style={{
            height: 36,
            padding: "0 12px",
            borderTop: "1px solid var(--border)",
            gap: 8,
            color: "var(--text2)",
            fontSize: 12,
            fontWeight: 500,
            background: "transparent",
            border: 0,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: "var(--border)",
            cursor: "pointer",
          }}
        >
          <SlidersHorizontal size={14} />
          <span>Configurations</span>
        </button>
      </aside>

      {/* ─── CENTER: Content area ─────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Top header */}
        <div
          className="row"
          style={{
            height: 52,
            padding: "0 16px",
            borderBottom: "1px solid var(--border)",
            justifyContent: "space-between",
            background: "rgba(13,13,13,0.8)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Left: view toggle + configurations */}
          <div className="row" style={{ gap: 8 }}>
            <ViewToggle />
            <button
              className="icon-btn"
              style={{ height: 32, width: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)" }}
              aria-label="Configurations"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
          {/* Right: search + preview + publish */}
          <div className="row" style={{ gap: 8 }}>
            <SearchBar />
            <button
              className="icon-btn"
              style={{ height: 32, width: 32, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg2)" }}
              aria-label="Preview"
            >
              <Play size={14} fill="currentColor" />
            </button>
            <button
              className="row"
              style={{
                height: 32,
                padding: "0 16px",
                borderRadius: 8,
                background: "var(--publish-bg)",
                color: "var(--publish-fg)",
                fontWeight: 500,
                fontSize: 12,
                gap: 6,
                border: 0,
                cursor: "pointer",
                position: "relative",
              }}
            >
              <Upload size={13} />
              Publish
              <span style={{
                position: "absolute", top: -2, right: -2,
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--warning-dot)",
                border: "2px solid var(--content-bg)",
              }} />
            </button>
          </div>
        </div>

        {/* Article editor area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
          <article style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{
              fontSize: 30, fontWeight: 600, color: "var(--text1)",
              letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.15,
            }}>
              Introduction
            </h1>
            <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, marginBottom: 32 }}>
              Welcome to the new home for your documentation. Get up and running in minutes.
            </p>

            <SectionCard title="Setting up">
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, marginBottom: 12 }}>
                Get your documentation site up and running in minutes. This guide will walk you through the basic setup process.
              </p>
              <CodeBlock />
            </SectionCard>

            <SectionCard title="Make it yours">
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>
                Design a docs site that looks great and empowers your users.
              </p>
            </SectionCard>

            <button
              style={{
                width: "100%",
                marginTop: 20,
                padding: "20px",
                border: "2px dashed var(--border)",
                borderRadius: 12,
                background: "transparent",
                color: "var(--text3)",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Plus size={16} /> Add Section
            </button>
          </article>
        </div>
      </div>
    </div>
  );
}

/* ── Helper components ────────────────────────────────────── */
function Tab({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      style={{
        height: 28, padding: "0 12px", fontSize: 12, fontWeight: 500,
        background: active ? "var(--bg3)" : "transparent",
        color: active ? "var(--text1)" : "var(--text3)",
        border: 0, borderRadius: 6, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 500, letterSpacing: "0.05em",
      textTransform: "uppercase", color: "var(--text4)",
      padding: "8px 10px 6px",
    }}>
      {children}
    </div>
  );
}

function Group({ label, expanded, children, count }: { label: string; expanded?: boolean; children?: React.ReactNode; count?: number }) {
  return (
    <div>
      <div className="tree-row" data-active={false}>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Folder size={13} style={{ color: "var(--text3)" }} />
        <span style={{ flex: 1, color: "var(--text2)" }}>{label}</span>
        {count !== undefined && (
          <span style={{
            fontSize: 10, color: "var(--text4)",
            background: "var(--bg3)", padding: "1px 6px", borderRadius: 4,
          }}>{count}</span>
        )}
      </div>
      {expanded && <div style={{ marginLeft: 14 }}>{children}</div>}
    </div>
  );
}

function Page({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className="tree-row" data-active={active}>
      <span style={{ width: 12 }} />
      <FileText size={13} style={{ color: active ? "var(--text1)" : "var(--text3)" }} />
      <span style={{ flex: 1 }}>{label}</span>
    </div>
  );
}

function ViewToggle() {
  return (
    <div className="row" style={{
      borderRadius: 8, background: "var(--bg2)", padding: 2,
      border: "1px solid var(--border)", gap: 0,
    }}>
      <button style={{
        height: 26, width: 26, borderRadius: 6, border: 0,
        background: "var(--bg4)", color: "var(--text1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 2px rgba(0,0,0,0.3)", cursor: "pointer",
      }} aria-label="Visual">
        <FileText size={13} />
      </button>
      <button style={{
        height: 26, width: 26, borderRadius: 6, border: 0,
        background: "transparent", color: "var(--text3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }} aria-label="Code">
        <Code2 size={13} />
      </button>
    </div>
  );
}

function SearchBar() {
  return (
    <button
      className="row"
      style={{
        height: 32, padding: "0 12px", gap: 8, minWidth: 220,
        background: "var(--bg2)", border: "1px solid var(--border)",
        borderRadius: 8, color: "var(--text3)", fontSize: 12,
        cursor: "pointer",
      }}
    >
      <Search size={13} />
      <span style={{ flex: 1, textAlign: "left" }}>Search</span>
      <kbd style={{
        fontSize: 10, fontFamily: "var(--font-mono)",
        opacity: .7, color: "var(--text3)",
      }}>⌘K</kbd>
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: 18, fontWeight: 600, color: "var(--text1)",
        letterSpacing: "-0.015em", marginBottom: 12,
      }}>{title}</h2>
      {children}
    </section>
  );
}

function CodeBlock() {
  return (
    <div style={{
      background: "var(--bg3)", borderRadius: 6, padding: "12px 14px",
      fontFamily: "var(--font-mono)", fontSize: 12,
      color: "var(--text2)", lineHeight: 1.55,
      border: "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--text3)" }}>$</span> npm install @0docs/cli
      <br />
      <span style={{ color: "var(--text3)" }}>$</span> 0docs init my-project
    </div>
  );
}
