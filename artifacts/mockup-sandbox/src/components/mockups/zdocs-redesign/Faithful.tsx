import {
  Home, FileText, BarChart3, Settings, Workflow, Bot, MessageSquare, Layers,
  ChevronDown, ChevronRight, Folder, Plus, Search, Eye, Code2, Play, Upload,
  GitBranch, RotateCw, X, Copy, ExternalLink, Image as ImageIcon, Recycle,
  Type, EyeOff, Link2, FileJson, Sparkles, PanelLeftClose,
} from "lucide-react";
import "./_group.css";

/**
 * Faithful Mintlify clone — pixel-faithful reproduction of Mintlify's
 * dashboard. 4-pane: project rail + tree + tab settings + content (code view).
 *
 * Hue: warm-tinted near-black (#0a0a0a, sat ~4%).
 * Accent: emerald green (#10b981) on Editor active, +, Publish, NEW pill.
 */
export default function Faithful() {
  return (
    <div className="zdocs-shell" data-variant="faithful">
      {/* ─── 1. Project Rail ─────────────────────────────── */}
      <aside
        style={{
          width: 156, background: "var(--rail-bg)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          alignItems: "stretch", padding: "12px 0",
          flexShrink: 0,
        }}
      >
        {/* Project chip */}
        <button
          className="row"
          style={{
            margin: "0 12px 16px",
            padding: "8px 10px", gap: 10,
            background: "var(--bg3)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10, cursor: "pointer",
          }}
          title="Project"
        >
          <span style={{
            width: 24, height: 24, borderRadius: 6,
            background: "linear-gradient(135deg, var(--primary), #14b8a6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#052e16" }}>0</span>
          </span>
          <span style={{
            flex: 1, fontSize: 12, fontWeight: 500,
            color: "var(--text1)", textAlign: "left",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            withso-d5e10879
          </span>
          <ChevronDown size={11} style={{ color: "var(--text3)" }} />
        </button>

        {/* Primary nav */}
        <RailItem icon={Home} label="Home" />
        <RailItem icon={FileText} label="Editor" active />
        <RailItem icon={BarChart3} label="Analytics" />
        <RailItem icon={Settings} label="Settings" />

        {/* Section divider */}
        <div style={{
          padding: "16px 16px 6px", fontSize: 9, fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: "var(--text4)",
        }}>
          Agents
        </div>

        <RailItem icon={Workflow} label="Workflows" badge="NEW" />
        <RailItem icon={Bot} label="Agent" />
        <RailItem icon={Sparkles} label="Assistant" />
        <RailItem icon={Layers} label="MCP" />

        {/* Bottom: collapse */}
        <div style={{ marginTop: "auto", padding: "8px 12px" }}>
          <button
            className="icon-btn"
            style={{ width: "100%", height: 32, justifyContent: "flex-start", gap: 6, paddingLeft: 6 }}
            title="Collapse"
          >
            <PanelLeftClose size={14} />
            <span style={{ fontSize: 11, color: "var(--text3)" }}>Collapse</span>
          </button>
        </div>
      </aside>

      {/* ─── 2. Navigation Tree (260px) ────────────────────── */}
      <aside
        className="pane"
        style={{ width: 260, background: "var(--tree-bg)", flexShrink: 0 }}
      >
        {/* Tabs */}
        <div className="row" style={{
          height: 44, padding: "0 12px", gap: 16,
          borderBottom: "1px solid var(--border)",
        }}>
          <TabHeader icon={Layers} label="Navigation" active />
          <TabHeader icon={FileText} label="Files" />
        </div>

        {/* Title row */}
        <div className="row" style={{
          padding: "12px 14px 6px", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)" }}>Navigation</span>
          <button className="icon-btn" aria-label="Add"><Plus size={13} /></button>
        </div>

        {/* Tree */}
        <div style={{ padding: "0 6px 12px", flex: 1, overflowY: "auto", fontSize: 12.5 }}>
          <ExternalRow icon={Layers} label="Documentation" />
          <ExternalRow icon={Layers} label="Blog" />

          <GroupRow icon={Folder} label="Guides" expanded selected count={4}>
            <GroupRow icon={Folder} label="Getting started" expanded indent={1}>
              <PageRow icon={FileText} label="Introduction" active indent={2} />
              <PageRow icon={FileText} label="Quickstart" indent={2} />
              <PageRow icon={FileText} label="Development" indent={2} />
            </GroupRow>
            <GroupRow icon={Folder} label="Customization" indent={1} />
            <GroupRow icon={Folder} label="Writing content" expanded indent={1}>
              <PageRow icon={Type} label="Markdown" indent={2} />
              <PageRow icon={Code2} label="Code blocks" indent={2} />
              <PageRow icon={ImageIcon} label="Images and embeds" indent={2} />
              <PageRow icon={Recycle} label="Reusable snippets" indent={2} />
            </GroupRow>
            <GroupRow icon={Folder} label="AI tools" indent={1} />
          </GroupRow>

          <GroupRow icon={Layers} label="API reference" />

          <button className="tree-row" style={{ width: "100%", color: "var(--text3)" }}>
            <span style={{ width: 12 }} />
            <Plus size={13} />
            <span>Add new</span>
          </button>
        </div>

        {/* Bottom: Configurations */}
        <button
          className="row"
          style={{
            height: 38, padding: "0 14px", gap: 8,
            borderTop: "1px solid var(--border)",
            color: "var(--text2)", fontSize: 12, fontWeight: 500,
            background: "transparent", border: 0,
            borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "var(--border)",
            cursor: "pointer",
          }}
        >
          <Layers size={13} />
          Configurations
        </button>
      </aside>

      {/* ─── 3. Tab Settings panel (280px, conditional) ────── */}
      <aside
        className="pane"
        style={{ width: 296, background: "var(--bg1)", flexShrink: 0 }}
      >
        <div className="row" style={{
          height: 44, padding: "0 14px", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text1)" }}>Tab settings</span>
          <div className="row" style={{ gap: 4 }}>
            <button className="icon-btn" aria-label="Duplicate"><Copy size={12} /></button>
            <button className="icon-btn" aria-label="Close"><X size={13} /></button>
          </div>
        </div>

        <div style={{ padding: "14px 14px 18px", overflowY: "auto", flex: 1 }}>
          <SettingsField icon={Type} label="Title">
            <input
              defaultValue="Guides"
              style={{
                width: "100%", height: 28, padding: "0 8px",
                background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: 6, color: "var(--text1)", fontSize: 12,
                outline: 0, fontFamily: "inherit",
              }}
            />
          </SettingsField>

          <SettingsField icon={Sparkles} label="Icon">
            <button style={{
              height: 28, width: 28, borderRadius: 6,
              background: "var(--bg2)", border: "1px solid var(--border)",
              color: "var(--text2)", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Bot size={14} />
            </button>
          </SettingsField>

          <SettingsField icon={EyeOff} label="Hidden">
            <Toggle />
          </SettingsField>

          <SettingsField icon={Link2} label="Link">
            <Toggle />
          </SettingsField>

          <SettingsField icon={FileJson} label="OpenAPI">
            <SegmentedControl options={["File", "URL"]} active={0} />
            <div style={{
              marginTop: 6, fontSize: 11, color: "var(--text3)",
              padding: "6px 8px", border: "1px dashed var(--border-strong)",
              borderRadius: 6, textAlign: "center", cursor: "pointer",
            }}>
              Select OpenAPI spec
            </div>
          </SettingsField>

          <SettingsField icon={FileJson} label="AsyncAPI">
            <SegmentedControl options={["File", "URL"]} active={0} />
            <div style={{
              marginTop: 6, fontSize: 11, color: "var(--text3)",
              padding: "6px 8px", border: "1px dashed var(--border-strong)",
              borderRadius: 6, textAlign: "center", cursor: "pointer",
            }}>
              Select AsyncAPI spec
            </div>
          </SettingsField>
        </div>
      </aside>

      {/* ─── 4. Content / Code view ─────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "var(--content-bg)" }}>
        {/* Top header */}
        <div className="row" style={{
          height: 48, padding: "0 16px", gap: 10,
          borderBottom: "1px solid var(--border)",
          justifyContent: "space-between",
          background: "rgba(10,10,10,.85)", backdropFilter: "blur(12px)",
        }}>
          <div className="row" style={{ gap: 10 }}>
            {/* View toggle */}
            <div className="row" style={{
              borderRadius: 8, background: "var(--bg2)", padding: 2,
              border: "1px solid var(--border)",
            }}>
              <button style={{
                height: 26, width: 26, borderRadius: 6, border: 0,
                background: "transparent", color: "var(--text3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}><Eye size={13} /></button>
              <button style={{
                height: 26, width: 26, borderRadius: 6, border: 0,
                background: "var(--bg4)", color: "var(--text1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}><Code2 size={13} /></button>
            </div>
            {/* Branch selector */}
            <button className="row" style={{
              height: 30, padding: "0 10px", gap: 6,
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text2)", fontSize: 12,
              cursor: "pointer",
            }}>
              <GitBranch size={12} />
              main
              <ChevronDown size={11} />
            </button>
            <button className="icon-btn" style={{ height: 30, width: 30, border: "1px solid var(--border)", background: "var(--bg2)", borderRadius: 8 }}>
              <RotateCw size={12} />
            </button>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button className="row" style={{
              height: 30, padding: "0 12px", gap: 8, minWidth: 200,
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text3)", fontSize: 12, cursor: "pointer",
            }}>
              <Search size={12} />
              <span style={{ flex: 1, textAlign: "left" }}>Search</span>
              <kbd style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}>⌘K</kbd>
            </button>
            <button className="icon-btn" style={{ height: 30, width: 30, border: "1px solid var(--border)", background: "var(--bg2)", borderRadius: 8 }} aria-label="Preview">
              <Play size={12} fill="currentColor" />
            </button>
            {/* Publish — bright emerald */}
            <button className="row" style={{
              height: 30, padding: "0 14px", gap: 6,
              background: "var(--publish-bg)", color: "var(--publish-fg)",
              borderRadius: 8, border: 0, fontSize: 12, fontWeight: 600,
              cursor: "pointer", position: "relative",
            }}>
              <Upload size={12} />
              Publish
              <ChevronDown size={11} />
            </button>
          </div>
        </div>

        {/* Code view */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex" }}>
          {/* Line numbers */}
          <div style={{
            padding: "16px 12px 16px 16px", color: "var(--text4)",
            fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: "20px",
            textAlign: "right", userSelect: "none",
            background: "var(--content-bg)",
            borderRight: "1px solid var(--border)",
            minWidth: 44,
          }}>
            {Array.from({ length: 26 }, (_, i) => i + 1).map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>
          {/* Code */}
          <pre style={{
            flex: 1, margin: 0, padding: 16,
            fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: "20px",
            color: "var(--text2)", whiteSpace: "pre",
          }}>
{`---
title: "Introduction"
description: "Welcome to the new home for your documentation"
---

## Setting up

Get your documentation site up and running in minutes.

## Make it yours

Design a docs site that looks great and empowers your users.

<Columns cols={2}>
  `}<span style={{ color: "var(--primary)" }}>{`<Card`}</span>{` title=`}<span style={{ color: "#fbbf24" }}>{`"Edit locally"`}</span>{` icon=`}<span style={{ color: "#fbbf24" }}>{`"pen-to-square"`}</span>{` href=`}<span style={{ color: "#fbbf24" }}>{`"/development"`}</span><span style={{ color: "var(--primary)" }}>{`>`}</span>{`
    Edit your docs locally and preview them in real time.
  `}<span style={{ color: "var(--primary)" }}>{`</Card>`}</span>{`

  `}<span style={{ color: "var(--primary)" }}>{`<Card`}</span>{` title=`}<span style={{ color: "#fbbf24" }}>{`"Customize your site"`}</span>{` icon=`}<span style={{ color: "#fbbf24" }}>{`"palette"`}</span>{` href=`}<span style={{ color: "#fbbf24" }}>{`"/essentials/settings"`}</span><span style={{ color: "var(--primary)" }}>{`>`}</span>{`
    Customize the design and colors of your site to match your brand.
  `}<span style={{ color: "var(--primary)" }}>{`</Card>`}</span>{`
</Columns>`}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */
function RailItem({ icon: Icon, label, active, badge }: { icon: any; label: string; active?: boolean; badge?: string }) {
  return (
    <button
      className="row"
      style={{
        height: 30, padding: "0 16px", gap: 10,
        background: active ? "var(--primary-soft)" : "transparent",
        color: active ? "var(--primary)" : "var(--text2)",
        border: 0, fontSize: 12, fontWeight: active ? 500 : 400,
        cursor: "pointer", width: "100%", textAlign: "left",
        borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent",
      }}
      title={label}
    >
      <Icon size={14} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9, fontWeight: 600,
          background: "var(--primary-soft)", color: "var(--primary)",
          padding: "1px 5px", borderRadius: 4,
        }}>{badge}</span>
      )}
    </button>
  );
}

function TabHeader({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <button
      className="row"
      style={{
        height: 44, gap: 6, color: active ? "var(--text1)" : "var(--text3)",
        fontSize: 12.5, fontWeight: active ? 500 : 400,
        background: "transparent", border: 0, cursor: "pointer",
        borderBottom: active ? "2px solid var(--text1)" : "2px solid transparent",
        marginBottom: -1, padding: "0 2px",
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function ExternalRow({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="tree-row">
      <span style={{ width: 12 }} />
      <Icon size={13} style={{ color: "var(--text3)" }} />
      <span style={{ flex: 1 }}>{label}</span>
      <ExternalLink size={11} style={{ color: "var(--text4)" }} />
    </div>
  );
}

function GroupRow({ icon: Icon, label, expanded, selected, count, indent = 0, children }: {
  icon: any; label: string; expanded?: boolean; selected?: boolean; count?: number; indent?: number; children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="tree-row"
        data-active={selected}
        style={{ paddingLeft: 8 + indent * 14 }}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Icon size={13} style={{ color: selected ? "var(--text1)" : "var(--text3)" }} />
        <span style={{ flex: 1, color: selected ? "var(--text1)" : "var(--text2)" }}>{label}</span>
        {count !== undefined && (
          <span style={{ fontSize: 14, color: "var(--primary)", fontWeight: 300 }}>+</span>
        )}
      </div>
      {expanded && children}
    </div>
  );
}

function PageRow({ icon: Icon, label, active, indent = 0 }: { icon: any; label: string; active?: boolean; indent?: number }) {
  return (
    <div className="tree-row" data-active={active} style={{ paddingLeft: 8 + indent * 14 }}>
      <span style={{ width: 12 }} />
      <Icon size={13} style={{ color: active ? "var(--text1)" : "var(--text3)" }} />
      <span style={{ flex: 1 }}>{label}</span>
    </div>
  );
}

function SettingsField({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="row" style={{
      gap: 12, padding: "8px 0",
      borderBottom: "1px solid var(--border)", alignItems: "center",
    }}>
      <div className="row" style={{ gap: 8, width: 110, flexShrink: 0 }}>
        <Icon size={13} style={{ color: "var(--text3)" }} />
        <span style={{ fontSize: 12, color: "var(--text2)" }}>{label}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ on }: { on?: boolean }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      <span style={{
        width: 28, height: 16, borderRadius: 9999,
        background: on ? "var(--primary)" : "var(--bg4)",
        position: "relative", display: "inline-block",
        border: "1px solid var(--border)",
      }}>
        <span style={{
          position: "absolute", top: 1, left: on ? 13 : 1,
          width: 12, height: 12, borderRadius: "50%",
          background: "var(--text1)", transition: "left .15s ease",
        }} />
      </span>
      <span style={{ fontSize: 11, color: "var(--text3)" }}>No</span>
    </div>
  );
}

function SegmentedControl({ options, active }: { options: string[]; active: number }) {
  return (
    <div className="row" style={{
      borderRadius: 6, background: "var(--bg2)", padding: 2,
      border: "1px solid var(--border)", width: "fit-content",
    }}>
      {options.map((opt, i) => (
        <button key={opt} style={{
          height: 22, padding: "0 10px", borderRadius: 4, border: 0,
          background: i === active ? "var(--bg4)" : "transparent",
          color: i === active ? "var(--text1)" : "var(--text3)",
          fontSize: 11, cursor: "pointer", display: "flex",
          alignItems: "center", gap: 4,
        }}>
          {opt === "File" && <FileJson size={11} />}
          {opt === "URL" && <Link2 size={11} />}
          {opt}
        </button>
      ))}
    </div>
  );
}
