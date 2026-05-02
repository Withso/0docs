import {
  Home, FileText, BarChart3, Settings, Workflow, Bot, Sparkles, Layers,
  ChevronDown, ChevronRight, Folder, Plus, Search, Eye, Code2, Play, Upload,
  GitBranch, RotateCw, X, Copy, ExternalLink, Image as ImageIcon, Recycle,
  Type, EyeOff, Link2, FileJson, PanelLeftClose, Command, Zap,
} from "lucide-react";
import "./_group.css";

/**
 * Refined — Mintlify-inspired but elevated. Same 4-pane structure,
 * but with our own polish: DM Sans display face, more generous
 * spacing (32px tree rows), tinted-green selection highlight,
 * publish button with subtle outer glow, proper visual hierarchy
 * via section dividers, animated gradient brand mark.
 */
export default function Refined() {
  return (
    <div className="zdocs-shell" data-variant="refined">
      {/* ─── 1. Project Rail ─────────────────────────────── */}
      <aside
        style={{
          width: 168, background: "var(--rail-bg)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          padding: "14px 0", flexShrink: 0,
        }}
      >
        {/* Brand mark + project name — chip */}
        <button
          className="row"
          style={{
            margin: "0 14px 18px",
            padding: "8px 10px", gap: 10,
            background: "var(--bg2)",
            border: "1px solid var(--border-strong)",
            borderRadius: 12, cursor: "pointer",
          }}
          title="Project"
        >
          <span
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, var(--primary) 0%, #14b8a6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(34,197,94,.25), 0 0 0 1px rgba(255,255,255,.08) inset",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#052e16", letterSpacing: "-0.04em" }}>0</span>
          </span>
          <span
            className="heading-display"
            style={{
              flex: 1, fontSize: 12.5, fontWeight: 600,
              color: "var(--text1)", textAlign: "left",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              letterSpacing: "-0.005em",
            }}
          >
            agentation-docs
          </span>
          <ChevronDown size={11} style={{ color: "var(--text3)" }} />
        </button>

        <RailItem icon={Home} label="Home" />
        <RailItem icon={FileText} label="Editor" active />
        <RailItem icon={BarChart3} label="Analytics" />
        <RailItem icon={Settings} label="Settings" />

        <div style={{
          margin: "16px 14px 6px", height: 1,
          background: "var(--border)",
        }} />

        <div style={{
          padding: "0 18px 6px", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.10em", textTransform: "uppercase",
          color: "var(--text4)",
        }}>
          Agents
        </div>

        <RailItem icon={Workflow} label="Workflows" badge="NEW" />
        <RailItem icon={Bot} label="Agent" />
        <RailItem icon={Sparkles} label="Assistant" />
        <RailItem icon={Layers} label="MCP" />

        <div style={{ marginTop: "auto", padding: "8px 14px" }}>
          <button
            style={{
              width: "100%", height: 32,
              display: "flex", alignItems: "center", gap: 8,
              padding: "0 8px",
              border: "1px solid var(--border)",
              borderRadius: 8, background: "var(--bg2)",
              color: "var(--text3)", fontSize: 11,
              cursor: "pointer",
            }}
            title="Collapse"
          >
            <PanelLeftClose size={13} />
            Collapse
          </button>
        </div>
      </aside>

      {/* ─── 2. Navigation Tree ─────────────────────────── */}
      <aside
        className="pane"
        style={{ width: 272, background: "var(--tree-bg)", flexShrink: 0 }}
      >
        {/* Tabs */}
        <div className="row" style={{
          height: 48, padding: "0 16px", gap: 20,
          borderBottom: "1px solid var(--border)",
        }}>
          <TabHeader icon={Layers} label="Navigation" active />
          <TabHeader icon={FileText} label="Files" />
        </div>

        {/* Heading + add */}
        <div className="row" style={{
          padding: "16px 16px 8px", justifyContent: "space-between",
        }}>
          <div>
            <div className="heading-display" style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>
              Navigation
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
              12 pages · 4 groups
            </div>
          </div>
          <button
            style={{
              height: 28, width: 28, borderRadius: 8,
              background: "var(--primary-soft)",
              border: "1px solid var(--primary)",
              color: "var(--primary)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            aria-label="Add"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Tree (32px rows, more breathing room) */}
        <div style={{ padding: "0 8px 12px", flex: 1, overflowY: "auto" }}>
          <ExternalRow icon={Layers} label="Documentation" />
          <ExternalRow icon={Layers} label="Blog" />

          <div style={{ margin: "8px 0", height: 1, background: "var(--border)" }} />

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
          </GroupRow>

          <GroupRow icon={Layers} label="API reference" />

          <button style={{
            width: "100%", marginTop: 8,
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px",
            border: "1px dashed var(--border-strong)",
            borderRadius: 8, background: "transparent",
            color: "var(--text3)", fontSize: 12,
            cursor: "pointer",
          }}>
            <Plus size={13} />
            Add new
          </button>
        </div>

        {/* Bottom: Configurations card */}
        <div style={{
          padding: 10, borderTop: "1px solid var(--border)",
        }}>
          <button
            className="row"
            style={{
              width: "100%", height: 36, padding: "0 12px", gap: 10,
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text2)", fontSize: 12,
              fontWeight: 500, cursor: "pointer",
            }}
          >
            <Settings size={13} />
            <span style={{ flex: 1, textAlign: "left" }}>Configurations</span>
            <ChevronRight size={12} style={{ color: "var(--text4)" }} />
          </button>
        </div>
      </aside>

      {/* ─── 3. Page settings panel ─────────────────────── */}
      <aside
        className="pane"
        style={{ width: 304, background: "var(--bg1)", flexShrink: 0 }}
      >
        <div className="row" style={{
          height: 48, padding: "0 16px", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div className="heading-display" style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>
              Page settings
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text3)", marginTop: 1, fontFamily: "var(--font-mono)" }}>
              guides/getting-started/introduction
            </div>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className="icon-btn" aria-label="Duplicate"><Copy size={12} /></button>
            <button className="icon-btn" aria-label="Close"><X size={13} /></button>
          </div>
        </div>

        <div style={{ padding: "16px 16px 18px", overflowY: "auto", flex: 1 }}>
          {/* Field: Title */}
          <FieldGroup icon={Type} label="Title" hint="The page title shown in the sidebar">
            <input
              defaultValue="Introduction"
              style={{
                width: "100%", height: 32, padding: "0 10px",
                background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: 7, color: "var(--text1)", fontSize: 12.5,
                outline: 0, fontFamily: "inherit",
              }}
            />
          </FieldGroup>

          <FieldGroup icon={Sparkles} label="Icon">
            <div className="row" style={{ gap: 8 }}>
              <button style={{
                height: 32, width: 32, borderRadius: 7,
                background: "var(--primary-soft)",
                border: "1px solid var(--primary)",
                color: "var(--primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <FileText size={15} />
              </button>
              <span style={{ fontSize: 11.5, color: "var(--text3)" }}>file-text</span>
            </div>
          </FieldGroup>

          <FieldGroup icon={EyeOff} label="Visibility" hint="Hide this page from the public site">
            <Toggle on={false} />
          </FieldGroup>

          <FieldGroup icon={Link2} label="External link">
            <Toggle on={false} />
          </FieldGroup>

          {/* Tags */}
          <FieldGroup icon={Layers} label="Tags">
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              <Pill>tutorial</Pill>
              <Pill>beginner</Pill>
              <button style={{
                height: 22, padding: "0 8px", borderRadius: 9999,
                background: "transparent", border: "1px dashed var(--border-strong)",
                color: "var(--text3)", fontSize: 10.5, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Plus size={10} /> Add
              </button>
            </div>
          </FieldGroup>

          <FieldGroup icon={FileJson} label="OpenAPI spec">
            <SegmentedControl options={["File", "URL"]} active={0} />
            <button style={{
              marginTop: 8, width: "100%", padding: "10px 12px",
              border: "1px dashed var(--border-strong)", borderRadius: 8,
              background: "transparent", color: "var(--text3)",
              fontSize: 11.5, cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <FileJson size={13} />
              Drop OpenAPI spec or browse
            </button>
          </FieldGroup>
        </div>
      </aside>

      {/* ─── 4. Content area ────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "var(--content-bg)" }}>
        <div className="row" style={{
          height: 56, padding: "0 20px", gap: 12,
          borderBottom: "1px solid var(--border)",
          justifyContent: "space-between",
          background: "rgba(11,11,13,.85)", backdropFilter: "blur(16px)",
        }}>
          <div className="row" style={{ gap: 10 }}>
            {/* View toggle — pill */}
            <div className="row" style={{
              borderRadius: 9, background: "var(--bg2)", padding: 3,
              border: "1px solid var(--border)",
            }}>
              <button style={{
                height: 28, padding: "0 10px", borderRadius: 6, border: 0,
                background: "var(--bg4)", color: "var(--text1)",
                display: "flex", alignItems: "center", gap: 6, fontSize: 11.5,
                cursor: "pointer", fontWeight: 500,
                boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }}>
                <Eye size={12} /> Visual
              </button>
              <button style={{
                height: 28, padding: "0 10px", borderRadius: 6, border: 0,
                background: "transparent", color: "var(--text3)",
                display: "flex", alignItems: "center", gap: 6, fontSize: 11.5,
                cursor: "pointer",
              }}>
                <Code2 size={12} /> Code
              </button>
            </div>

            <button className="row" style={{
              height: 32, padding: "0 12px", gap: 7,
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text2)", fontSize: 12,
              cursor: "pointer",
            }}>
              <GitBranch size={12} />
              main
              <ChevronDown size={11} />
            </button>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button className="row" style={{
              height: 32, padding: "0 14px", gap: 10, minWidth: 240,
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text3)", fontSize: 12,
              cursor: "pointer",
            }}>
              <Search size={13} />
              <span style={{ flex: 1, textAlign: "left" }}>Search docs, sections, blocks…</span>
              <kbd style={{
                fontSize: 10, fontFamily: "var(--font-mono)",
                padding: "1px 5px", borderRadius: 3,
                background: "var(--bg4)", color: "var(--text2)",
              }}>⌘K</kbd>
            </button>
            <button className="icon-btn" style={{ height: 32, width: 32, border: "1px solid var(--border)", background: "var(--bg2)", borderRadius: 8 }} aria-label="Preview">
              <Play size={12} fill="currentColor" />
            </button>
            <button
              className="row publish-btn"
              style={{
                height: 32, padding: "0 16px", gap: 7,
                background: "var(--publish-bg)", color: "var(--publish-fg)",
                borderRadius: 8, border: 0, fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", position: "relative",
                letterSpacing: "-0.005em",
              }}
            >
              <Upload size={12} />
              Publish
              <span style={{
                position: "absolute", top: -3, right: -3,
                width: 10, height: 10, borderRadius: "50%",
                background: "var(--warning-dot)",
                border: "2px solid var(--content-bg)",
                animation: "pulse 2s ease-in-out infinite",
              }} />
            </button>
          </div>
        </div>

        {/* Article (visual editor) */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <article style={{ maxWidth: 760, margin: "0 auto", padding: "44px 48px 80px" }}>
            {/* Breadcrumb */}
            <div className="row" style={{ gap: 6, fontSize: 11.5, color: "var(--text3)", marginBottom: 16 }}>
              <span>Guides</span>
              <ChevronRight size={11} />
              <span>Getting started</span>
              <ChevronRight size={11} />
              <span style={{ color: "var(--text2)" }}>Introduction</span>
            </div>

            <h1 className="heading-display" style={{
              fontSize: 36, fontWeight: 600, color: "var(--text1)",
              letterSpacing: "-0.025em", marginBottom: 12,
              lineHeight: 1.1,
            }}>
              Introduction
            </h1>
            <p className="body-text" style={{
              fontSize: 15, color: "var(--text2)", lineHeight: 1.6,
              marginBottom: 36,
            }}>
              Welcome to the new home for your documentation. Get up and running in minutes,
              with everything you need to build a docs site that empowers your users.
            </p>

            {/* Inline call-to-actions cards */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 36,
            }}>
              <FeatureCard icon={Zap} title="Edit locally" body="Edit your docs locally and preview them in real time." />
              <FeatureCard icon={Sparkles} title="Customize your site" body="Match the look of your brand with custom themes." />
            </div>

            {/* Section heading */}
            <SectionBlock title="Setting up">
              <p className="body-text" style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, marginBottom: 14 }}>
                Get your documentation site up and running in minutes. This guide walks you through the basic setup process.
              </p>
              <CodeBlock />
            </SectionBlock>

            <SectionBlock title="Make it yours">
              <p className="body-text" style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7 }}>
                Design a docs site that looks great and empowers your users. Customize colors, typography, and layout to match your brand.
              </p>
            </SectionBlock>

            <button style={{
              width: "100%", marginTop: 24,
              padding: "20px",
              border: "1px dashed var(--border-strong)",
              borderRadius: 12, background: "transparent",
              color: "var(--text3)", fontSize: 13,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all .15s ease",
            }}>
              <Plus size={15} />
              Add section
            </button>
          </article>
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
        height: 34, padding: "0 18px", gap: 11,
        background: active ? "var(--primary-soft)" : "transparent",
        color: active ? "var(--primary)" : "var(--text2)",
        border: 0, fontSize: 12.5,
        fontWeight: active ? 600 : 400,
        cursor: "pointer", width: "100%", textAlign: "left",
        position: "relative",
        transition: "all .15s ease",
      }}
      title={label}
    >
      {active && (
        <span style={{
          position: "absolute", left: 0, top: 8, bottom: 8, width: 2,
          background: "var(--primary)", borderRadius: "0 2px 2px 0",
          boxShadow: "0 0 8px var(--primary-glow)",
        }} />
      )}
      <Icon size={14} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9, fontWeight: 700,
          background: "var(--primary)", color: "var(--primary-fg)",
          padding: "2px 6px", borderRadius: 9999,
          letterSpacing: "0.04em",
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
        height: 48, gap: 7, color: active ? "var(--text1)" : "var(--text3)",
        fontSize: 12.5, fontWeight: active ? 600 : 400,
        background: "transparent", border: 0, cursor: "pointer",
        borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
        marginBottom: -1, padding: "0 4px",
        letterSpacing: "-0.005em",
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function ExternalRow({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      gap: 8, padding: "0 10px", height: 32,
      borderRadius: 8, color: "var(--text2)", fontSize: 12.5,
      cursor: "pointer", transition: "background .15s ease",
    }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover)")}
       onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <Icon size={14} style={{ color: "var(--text3)" }} />
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
      <div style={{
        display: "flex", alignItems: "center",
        gap: 7, height: 32,
        padding: `0 10px 0 ${10 + indent * 16}px`,
        borderRadius: 8,
        background: selected ? "var(--selected-row)" : "transparent",
        color: selected ? "var(--text1)" : "var(--text2)",
        fontSize: 12.5,
        fontWeight: selected ? 500 : 400,
        cursor: "pointer",
        borderLeft: selected ? "2px solid var(--primary)" : "2px solid transparent",
        marginLeft: selected ? -2 : 0,
      }}>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Icon size={13.5} style={{ color: selected ? "var(--primary)" : "var(--text3)" }} />
        <span style={{ flex: 1 }}>{label}</span>
        {count !== undefined && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            background: "var(--bg3)", color: "var(--text3)",
            padding: "1px 6px", borderRadius: 9999, minWidth: 18, textAlign: "center",
          }}>{count}</span>
        )}
      </div>
      {expanded && children}
    </div>
  );
}

function PageRow({ icon: Icon, label, active, indent = 0 }: { icon: any; label: string; active?: boolean; indent?: number }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      gap: 7, height: 30,
      padding: `0 10px 0 ${10 + indent * 16}px`,
      borderRadius: 8,
      background: active ? "var(--selected-row)" : "transparent",
      color: active ? "var(--text1)" : "var(--text2)",
      fontSize: 12.5,
      fontWeight: active ? 500 : 400,
      cursor: "pointer",
      transition: "background .15s ease",
      borderLeft: active ? "2px solid var(--primary)" : "2px solid transparent",
      marginLeft: active ? -2 : 0,
    }}>
      <span style={{ width: 12 }} />
      <Icon size={13} style={{ color: active ? "var(--primary)" : "var(--text3)" }} />
      <span style={{ flex: 1 }}>{label}</span>
    </div>
  );
}

function FieldGroup({ icon: Icon, label, hint, children }: { icon: any; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="row" style={{ gap: 7, marginBottom: 7 }}>
        <Icon size={12.5} style={{ color: "var(--text3)" }} />
        <span style={{ fontSize: 11.5, color: "var(--text2)", fontWeight: 500, letterSpacing: "0.005em" }}>{label}</span>
      </div>
      {children}
      {hint && (
        <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--text3)", lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Toggle({ on }: { on?: boolean }) {
  return (
    <button style={{
      width: 32, height: 18, borderRadius: 9999,
      background: on ? "var(--primary)" : "var(--bg4)",
      position: "relative", display: "inline-block",
      border: "1px solid var(--border)",
      cursor: "pointer", padding: 0,
      boxShadow: on ? "0 0 12px var(--primary-glow)" : "none",
      transition: "all .15s ease",
    }}>
      <span style={{
        position: "absolute", top: 1, left: on ? 15 : 1,
        width: 14, height: 14, borderRadius: "50%",
        background: "#ffffff",
        transition: "left .15s ease",
        boxShadow: "0 1px 2px rgba(0,0,0,.3)",
      }} />
    </button>
  );
}

function SegmentedControl({ options, active }: { options: string[]; active: number }) {
  return (
    <div className="row" style={{
      borderRadius: 7, background: "var(--bg2)", padding: 3,
      border: "1px solid var(--border)", width: "fit-content",
    }}>
      {options.map((opt, i) => (
        <button key={opt} style={{
          height: 24, padding: "0 12px", borderRadius: 5, border: 0,
          background: i === active ? "var(--bg4)" : "transparent",
          color: i === active ? "var(--text1)" : "var(--text3)",
          fontSize: 11, fontWeight: 500, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5,
          boxShadow: i === active ? "0 1px 2px rgba(0,0,0,.3)" : "none",
        }}>
          {opt === "File" && <FileJson size={11} />}
          {opt === "URL" && <Link2 size={11} />}
          {opt}
        </button>
      ))}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      height: 22, padding: "0 9px",
      display: "inline-flex", alignItems: "center", gap: 4,
      borderRadius: 9999, background: "var(--bg3)",
      color: "var(--text2)", fontSize: 10.5, fontWeight: 500,
      border: "1px solid var(--border)",
    }}>
      {children}
    </span>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: "var(--bg2)", border: "1px solid var(--border)",
      cursor: "pointer", transition: "all .15s ease",
    }}>
      <div style={{
        height: 32, width: 32, borderRadius: 8,
        background: "var(--primary-soft)",
        color: "var(--primary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 10,
      }}>
        <Icon size={16} />
      </div>
      <div className="heading-display" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text1)", marginBottom: 4, letterSpacing: "-0.01em" }}>
        {title}
      </div>
      <div className="body-text" style={{ fontSize: 12.5, color: "var(--text3)", lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 className="heading-display" style={{
        fontSize: 22, fontWeight: 600, color: "var(--text1)",
        letterSpacing: "-0.02em", marginBottom: 12,
      }}>{title}</h2>
      {children}
    </section>
  );
}

function CodeBlock() {
  return (
    <div style={{
      background: "var(--bg2)", borderRadius: 10,
      border: "1px solid var(--border)", overflow: "hidden",
    }}>
      <div style={{
        height: 30, padding: "0 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--bg3)",
      }}>
        <span style={{ fontSize: 10.5, color: "var(--text3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          bash
        </span>
        <button className="icon-btn" style={{ height: 22, width: 22 }} aria-label="Copy">
          <Copy size={11} />
        </button>
      </div>
      <pre style={{
        margin: 0, padding: "14px 16px",
        fontFamily: "var(--font-mono)", fontSize: 12.5,
        color: "var(--text2)", lineHeight: 1.7,
      }}>
        <span style={{ color: "var(--text4)" }}>$</span> npm install <span style={{ color: "var(--primary)" }}>@0docs/cli</span>{"\n"}
        <span style={{ color: "var(--text4)" }}>$</span> 0docs init my-project
      </pre>
    </div>
  );
}
