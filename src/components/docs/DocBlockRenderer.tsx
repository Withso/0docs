import { useState } from "react";
import DOMPurify from "dompurify";
import {
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import type { DesignSettings, BlockStyleSettings } from "@/hooks/use-design-settings";

type BlockKey = keyof DesignSettings["blockStyles"];

interface DocBlock {
  id: string;
  section_id: string;
  type: string;
  content: any;
  order_index: number;
}

interface Props {
  block: DocBlock;
  settings: DesignSettings;
  highlightType?: string | null;
}

/* ───────────────────────── Mintlify callout palette ─────────────────────────
   Mintlify renders callouts as: tinted bg + same-hue stronger left/full border
   + colored icon. Variants come from block.content.variant ("note" | "info" |
   "tip" | "warning" | "check" | "danger") OR — for legacy — from block.type
   "note" | "callout".
*/
type CalloutVariant = "note" | "info" | "tip" | "warning" | "check" | "danger";

const CALLOUT_PALETTE: Record<
  CalloutVariant,
  { bg: string; border: string; icon: string; Icon: React.ComponentType<any> }
> = {
  note: {
    bg: "214 100% 97%",
    border: "214 95% 88%",
    icon: "214 90% 50%",
    Icon: Info,
  },
  info: {
    bg: "0 0% 97%",
    border: "0 0% 88%",
    icon: "0 0% 35%",
    Icon: Info,
  },
  tip: {
    bg: "152 76% 96%",
    border: "152 65% 82%",
    icon: "152 70% 38%",
    Icon: Lightbulb,
  },
  warning: {
    bg: "45 100% 95%",
    border: "38 95% 78%",
    icon: "32 95% 44%",
    Icon: AlertTriangle,
  },
  check: {
    bg: "152 76% 96%",
    border: "152 65% 82%",
    icon: "152 70% 38%",
    Icon: CheckCircle2,
  },
  danger: {
    bg: "0 86% 97%",
    border: "0 86% 88%",
    icon: "0 80% 55%",
    Icon: XCircle,
  },
};

const Callout = ({
  text,
  variant,
  settings: s,
  bs,
}: {
  text: string;
  variant: CalloutVariant;
  settings: DesignSettings;
  bs: Partial<BlockStyleSettings>;
}) => {
  const p = CALLOUT_PALETTE[variant];
  const Icon = p.Icon;
  const bgOverride = bs.backgroundColor;
  const borderOverride = bs.borderColor;
  const iconOverride = bs.color;
  return (
    <div
      className="flex gap-3 my-4"
      style={{
        backgroundColor: `hsl(${bgOverride || p.bg})`,
        border: `1px solid hsl(${borderOverride || p.border})`,
        borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : "10px",
        padding: bs.padding != null ? `${bs.padding}px` : "14px 16px",
      }}
    >
      <Icon
        className="shrink-0 mt-[3px]"
        style={{
          color: `hsl(${iconOverride || p.icon})`,
          width: 16,
          height: 16,
        }}
      />
      <div
        style={{
          fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.bodyFont}', sans-serif`,
          fontSize: `${bs.fontSize ?? s.baseFontSize}px`,
          fontWeight: bs.fontWeight as any,
          color: `hsl(${s.foregroundColor})`,
          lineHeight: s.lineHeight,
          flex: 1,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const DocBlockRenderer = ({ block, settings: s, highlightType }: Props) => {
  const { content, type } = block;
  const bs = s.blockStyles[type as BlockKey] || {};
  const isHighlighted = highlightType === type;

  const highlightStyle: React.CSSProperties = isHighlighted
    ? { outline: "2px solid hsl(214 100% 50%)", outlineOffset: "4px", borderRadius: "8px", transition: "outline 0.2s ease" }
    : {};

  const wrapHighlight = (el: React.ReactNode) => (
    <div style={highlightStyle} data-block-type={type}>
      {el}
    </div>
  );

  switch (type) {
    case "heading":
      return wrapHighlight(
        <h3
          style={{
            fontFamily: `'${s.headingFont}', sans-serif`,
            fontWeight: s.headingWeight,
            fontSize: `${s.headingFontSize}px`,
            letterSpacing: "-0.01em",
            marginTop: "1.5em",
            marginBottom: "0.6em",
            color: bs.color ? `hsl(${bs.color})` : `hsl(${s.foregroundColor})`,
          }}
        >
          {content.text}
        </h3>,
      );

    case "paragraph":
      return wrapHighlight(
        <p
          style={{
            marginBottom: `${s.paragraphSpacing}px`,
            fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.bodyFont}', sans-serif`,
            fontSize: `${bs.fontSize ?? s.baseFontSize}px`,
            fontWeight: bs.fontWeight as any,
            lineHeight: s.lineHeight,
            color: bs.color ? `hsl(${bs.color})` : `hsl(${s.foregroundColor})`,
          }}
        >
          {content.text}
        </p>,
      );

    case "code_block":
      return wrapHighlight(<CodeBlock content={content} settings={s} bs={bs} />);

    case "image": {
      if (!content.url) return null;
      const imageWidth = content.width ? `${content.width}%` : "100%";
      const alignment = content.align || "left";
      const justifyMap: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };
      return wrapHighlight(
        <div className="my-5 flex" style={{ justifyContent: justifyMap[alignment] || "flex-start" }}>
          <div style={{ width: imageWidth, maxWidth: "100%" }}>
            <div
              className="overflow-hidden"
              style={{
                borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : s.imageRounded ? "10px" : "0",
                border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
                ...(bs.backgroundColor ? { backgroundColor: `hsl(${bs.backgroundColor})` } : {}),
                ...(bs.padding != null ? { padding: `${bs.padding}px` } : {}),
              }}
            >
              <img src={content.url} alt={content.alt || ""} className="w-full h-auto block" loading="lazy" />
            </div>
            {content.alt && (
              <p
                style={{
                  color: `hsl(${s.mutedForegroundColor})`,
                  fontFamily: `'${s.bodyFont}', sans-serif`,
                  fontSize: `${s.baseFontSize - 2}px`,
                  marginTop: "8px",
                  textAlign: alignment as any,
                  lineHeight: s.lineHeight,
                }}
              >
                {content.alt}
              </p>
            )}
          </div>
        </div>,
      );
    }

    case "youtube":
      return content.videoId
        ? wrapHighlight(
            <div className="my-5 overflow-hidden aspect-video" style={{ borderRadius: `${bs.borderRadius ?? 10}px`, border: `1px solid hsl(${bs.borderColor || s.borderColor})` }}>
              <iframe
                src={`https://www.youtube.com/embed/${content.videoId}`}
                className="w-full h-full"
                allowFullScreen
                title={content.title || "Video"}
              />
            </div>,
          )
        : null;

    case "video":
      return content.url
        ? wrapHighlight(
            <div className="my-5 overflow-hidden" style={{ borderRadius: `${bs.borderRadius ?? 10}px`, border: `1px solid hsl(${bs.borderColor || s.borderColor})` }}>
              <video
                controls={content.showControls !== false}
                loop={content.loop === true}
                autoPlay={content.loop === true}
                muted={content.loop === true}
                className="w-full block"
              >
                <source src={content.url} />
              </video>
            </div>,
          )
        : null;

    case "ordered_list":
      return wrapHighlight(
        <ol
          className="my-4"
          style={{
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontSize: `${s.baseFontSize}px`,
            lineHeight: s.lineHeight,
            listStyleType: "decimal",
            paddingLeft: "26px",
            color: `hsl(${s.foregroundColor})`,
          }}
        >
          {(content.items || []).map((item: string, i: number) => (
            <li key={i} style={{ marginBottom: "6px", paddingLeft: "4px" }}>
              {item}
            </li>
          ))}
        </ol>,
      );

    case "unordered_list":
      return wrapHighlight(
        <ul
          className="my-4"
          style={{
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontSize: `${s.baseFontSize}px`,
            lineHeight: s.lineHeight,
            listStyleType: "disc",
            paddingLeft: "26px",
            color: `hsl(${s.foregroundColor})`,
          }}
        >
          {(content.items || []).map((item: string, i: number) => (
            <li key={i} style={{ marginBottom: "6px", paddingLeft: "4px" }}>
              {item}
            </li>
          ))}
        </ul>,
      );

    case "note": {
      const variant = (content.variant as CalloutVariant) || "note";
      return wrapHighlight(<Callout text={content.text} variant={variant} settings={s} bs={bs} />);
    }

    case "callout": {
      const variant = (content.variant as CalloutVariant) || "info";
      return wrapHighlight(<Callout text={content.text} variant={variant} settings={s} bs={bs} />);
    }

    case "tabs":
      return wrapHighlight(<TabsBlock content={content} settings={s} bs={bs} />);

    case "accordion":
      return wrapHighlight(<AccordionBlock content={content} settings={s} bs={bs} />);

    case "card":
      return wrapHighlight(<CardBlock content={content} settings={s} bs={bs} />);

    case "steps":
      return wrapHighlight(<StepsBlock content={content} settings={s} bs={bs} />);

    case "table":
      return wrapHighlight(<TableBlock content={content} settings={s} bs={bs} />);

    case "divider":
      return wrapHighlight(
        <hr
          style={{
            border: "none",
            borderTop: `${bs.thickness ?? 1}px ${bs.dividerStyle || "solid"} hsl(${bs.borderColor || s.borderColor})`,
            margin: `${bs.spacing ?? 32}px 0`,
          }}
        />,
      );

    case "quote":
      return wrapHighlight(
        <blockquote
          className="my-5"
          style={{
            borderLeft: `2px solid hsl(${bs.borderColor || s.borderColor})`,
            paddingLeft: "20px",
            margin: "20px 0",
            fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.bodyFont}', sans-serif`,
            fontSize: `${bs.fontSize ?? s.baseFontSize}px`,
            fontStyle: bs.italic !== false ? "italic" : "normal",
            lineHeight: s.lineHeight,
            color: `hsl(${s.mutedForegroundColor})`,
          }}
        >
          <p style={{ margin: 0 }}>{content.text}</p>
          {content.attribution && (
            <footer
              style={{
                fontSize: `${s.baseFontSize - 2}px`,
                color: `hsl(${s.mutedForegroundColor})`,
                fontStyle: "normal",
                marginTop: "8px",
              }}
            >
              — {content.attribution}
            </footer>
          )}
        </blockquote>,
      );

    case "api_endpoint":
      return wrapHighlight(<ApiEndpointBlock content={content} settings={s} bs={bs} />);

    case "code_tabs":
      return wrapHighlight(<CodeTabsBlock content={content} settings={s} bs={bs} />);

    case "inline_editor":
      return wrapHighlight(
        <div
          className="inline-editor-content inline-editor-readonly my-3"
          style={{
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontSize: `${s.baseFontSize}px`,
            lineHeight: s.lineHeight,
            color: `hsl(${s.foregroundColor})`,
          }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.html || "") }}
        />,
      );

    default:
      return null;
  }
};

/* ───────────────────────── Code Block (Mintlify) ─────────────────────────
   - Title bar with filename (or language) on left, copy button on right
   - Dark grey body (#0e0f12-ish in light, native code bg in dark)
   - Rounded corners, subtle border
*/
const CodeBlock = ({
  content,
  settings: s,
  bs,
}: {
  content: any;
  settings: DesignSettings;
  bs: Partial<BlockStyleSettings>;
}) => {
  const [copied, setCopied] = useState(false);
  const filename = content.filename || content.title;
  const language = content.language;
  const hasHeader = !!(filename || language);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content.code || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const codeBg = bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${s.codeBlockBg})`;
  const radius = bs.borderRadius != null ? `${bs.borderRadius}px` : `${s.codeBlockBorderRadius || 10}px`;

  return (
    <div
      className="my-5 group"
      style={{
        borderRadius: radius,
        border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
        overflow: "hidden",
        backgroundColor: codeBg,
      }}
    >
      {hasHeader && (
        <div
          className="flex items-center justify-between"
          style={{
            padding: "8px 14px",
            borderBottom: `1px solid hsl(${bs.borderColor || s.borderColor})`,
            backgroundColor: `hsl(${s.mutedColor})`,
          }}
        >
          <span
            style={{
              fontFamily: `'${s.codeFont}', monospace`,
              fontSize: "12px",
              color: `hsl(${s.mutedForegroundColor})`,
            }}
          >
            {filename || language}
          </span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 transition-colors"
            style={{
              fontSize: "11px",
              color: `hsl(${s.mutedForegroundColor})`,
              fontFamily: `'${s.bodyFont}', sans-serif`,
            }}
            aria-label="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      <div style={{ position: "relative" }}>
        {!hasHeader && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-md transition-opacity opacity-0 group-hover:opacity-100"
            style={{
              backgroundColor: `hsl(${s.mutedColor})`,
              color: `hsl(${s.mutedForegroundColor})`,
              border: `1px solid hsl(${s.borderColor})`,
            }}
            aria-label="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
        <pre
          style={{
            margin: 0,
            padding: "16px 18px",
            overflow: "auto",
            fontFamily: bs.fontFamily ? `'${bs.fontFamily}', monospace` : `'${s.codeFont}', monospace`,
            fontSize: `${bs.fontSize ?? s.baseFontSize - 2}px`,
            lineHeight: 1.65,
            color: bs.color ? `hsl(${bs.color})` : `hsl(${s.foregroundColor})`,
          }}
        >
          <code style={{ fontFamily: "inherit", fontSize: "inherit", color: "inherit" }}>
            {content.code}
          </code>
        </pre>
      </div>
    </div>
  );
};

/* ───────────────────────── Tabs (Mintlify) ─────────────────────────
   - No outer border. Underline-only indicator. Bottom rule under tab strip.
   - Generous padding above content.
*/
const TabsBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const [active, setActive] = useState(0);
  const tabs = content.tabs || [];
  const activeColor = bs.activeColor ? `hsl(${bs.activeColor})` : `hsl(${s.foregroundColor})`;
  const inactiveColor = bs.inactiveColor ? `hsl(${bs.inactiveColor})` : `hsl(${s.mutedForegroundColor})`;
  const indicatorColor = bs.indicatorColor ? `hsl(${bs.indicatorColor})` : `hsl(${s.primaryColor})`;

  return (
    <div className="my-5">
      <div className="flex" style={{ borderBottom: `1px solid hsl(${bs.borderColor || s.borderColor})`, gap: "20px" }}>
        {tabs.map((tab: any, i: number) => {
          const isActive = active === i;
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                padding: "8px 0",
                marginBottom: "-1px",
                fontSize: `${bs.fontSize ?? s.baseFontSize - 1}px`,
                fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.bodyFont}', sans-serif`,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? activeColor : inactiveColor,
                borderBottom: isActive ? `2px solid ${indicatorColor}` : "2px solid transparent",
                background: "none",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        style={{
          padding: "20px 0 0 0",
          fontFamily: `'${s.bodyFont}', sans-serif`,
          fontSize: `${s.baseFontSize}px`,
          lineHeight: s.lineHeight,
          color: `hsl(${s.foregroundColor})`,
        }}
      >
        {tabs[active]?.content}
      </div>
    </div>
  );
};

/* ───────────────────────── Accordion (Mintlify) ─────────────────────────
   - Single bordered box, chevron right that rotates, smooth open
   - Multiple items stack inside same border, divided by 1px rule
*/
const AccordionBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = content.items || [];

  return (
    <div
      className="my-5"
      style={{
        border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
        borderRadius: `${bs.borderRadius ?? 10}px`,
        overflow: "hidden",
        backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${s.backgroundColor})`,
      }}
    >
      {items.map((item: any, i: number) => {
        const open = openIndex === i;
        return (
          <div
            key={i}
            style={{
              borderBottom: i < items.length - 1 ? `1px solid hsl(${bs.borderColor || s.borderColor})` : undefined,
            }}
          >
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              className="w-full text-left flex items-center justify-between gap-3"
              style={{
                padding: `${bs.padding ?? 14}px 18px`,
                fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.bodyFont}', sans-serif`,
                fontSize: `${bs.fontSize ?? s.baseFontSize}px`,
                fontWeight: bs.fontWeight || 500,
                color: `hsl(${s.foregroundColor})`,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <span>{item.title}</span>
              <ChevronDown
                className="shrink-0 transition-transform"
                style={{
                  width: 16,
                  height: 16,
                  color: `hsl(${s.mutedForegroundColor})`,
                  transform: open ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
            {open && (
              <div
                style={{
                  padding: "0 18px 16px 18px",
                  fontFamily: `'${s.bodyFont}', sans-serif`,
                  fontSize: `${s.baseFontSize}px`,
                  color: `hsl(${s.mutedForegroundColor})`,
                  lineHeight: s.lineHeight,
                }}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ───────────────────────── Card (Mintlify) ─────────────────────────
   - Bordered, soft shadow on hover, optional CTA arrow when linked
   - Title bold, description muted
*/
const CardBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const titleSize = bs.titleFontSize ?? s.baseFontSize;
  const titleWt = bs.titleWeight || 600;
  const isLink = !!content.link;

  const inner = (
    <>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h4
          style={{
            fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.headingFont}', sans-serif`,
            fontWeight: titleWt as any,
            fontSize: `${titleSize}px`,
            color: bs.color ? `hsl(${bs.color})` : `hsl(${s.foregroundColor})`,
            margin: 0,
          }}
        >
          {content.title}
        </h4>
        {isLink && (
          <ArrowRight
            className="shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ width: 14, height: 14, color: `hsl(${s.mutedForegroundColor})` }}
          />
        )}
      </div>
      {content.description && (
        <p
          style={{
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontSize: `${s.baseFontSize - 1}px`,
            color: `hsl(${s.mutedForegroundColor})`,
            lineHeight: s.lineHeight,
            margin: 0,
          }}
        >
          {content.description}
        </p>
      )}
    </>
  );

  const styles: React.CSSProperties = {
    display: "block",
    border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
    borderRadius: `${bs.borderRadius ?? 12}px`,
    padding: `${bs.padding ?? 18}px`,
    backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${s.backgroundColor})`,
    transition: "border-color 0.15s, box-shadow 0.15s",
    textDecoration: "none",
    color: "inherit",
  };

  if (isLink) {
    return (
      <a
        href={content.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block group my-4 hover:shadow-sm"
        style={styles}
        onMouseEnter={(e) => ((e.currentTarget.style.borderColor = `hsl(${s.primaryColor} / 0.4)`))}
        onMouseLeave={(e) => ((e.currentTarget.style.borderColor = `hsl(${bs.borderColor || s.borderColor})`))}
      >
        {inner}
      </a>
    );
  }
  return (
    <div className="my-4 group" style={styles}>
      {inner}
    </div>
  );
};

/* ───────────────────────── Steps (Mintlify) ─────────────────────────
   - Numbered circle on left, title + body on right
   - Vertical guide line drops from circle through to next step
*/
const StepsBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const items = content.items || [];
  const circleSize = bs.circleSize ?? 26;
  const circleBg = bs.circleBg || s.mutedColor;
  const circleColor = bs.circleColor || s.foregroundColor;
  const connColor = bs.connectorColor || s.borderColor;

  return (
    <div className="my-6">
      {items.map((step: any, i: number) => {
        const isLast = i === items.length - 1;
        return (
          <div key={i} className="flex gap-4 relative" style={{ paddingBottom: isLast ? 0 : "24px" }}>
            <div className="shrink-0 relative" style={{ width: circleSize }}>
              <div
                style={{
                  width: circleSize,
                  height: circleSize,
                  borderRadius: "50%",
                  backgroundColor: `hsl(${circleBg})`,
                  color: `hsl(${circleColor})`,
                  border: `1px solid hsl(${s.borderColor})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: `'${s.bodyFont}', sans-serif`,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {i + 1}
              </div>
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: circleSize,
                    bottom: -24,
                    width: 1,
                    transform: "translateX(-50%)",
                    backgroundColor: `hsl(${connColor})`,
                  }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0" style={{ paddingTop: "2px" }}>
              <h4
                style={{
                  fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.bodyFont}', sans-serif`,
                  fontWeight: bs.fontWeight || 600,
                  fontSize: `${bs.fontSize ?? s.baseFontSize}px`,
                  color: `hsl(${s.foregroundColor})`,
                  margin: 0,
                  marginBottom: step.description ? "8px" : 0,
                  lineHeight: 1.4,
                }}
              >
                {step.title}
              </h4>
              {step.description && (
                <p
                  style={{
                    fontFamily: `'${s.bodyFont}', sans-serif`,
                    fontSize: `${s.baseFontSize}px`,
                    color: `hsl(${s.mutedForegroundColor})`,
                    lineHeight: s.lineHeight,
                    margin: 0,
                  }}
                >
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ───────────────────────── Table (Mintlify) ─────────────────────────
   - Borderless cells, header has bottom rule + slightly muted text
   - Subtle row hover, no inner verticals
*/
const TableBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const cellPad = bs.cellPadding ?? 12;
  const striped = bs.stripedRows === true;
  const stripedBg = bs.stripedRowBg || s.mutedColor;

  return (
    <div className="my-5 overflow-x-auto">
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: `'${s.bodyFont}', sans-serif` }}>
        <thead>
          <tr>
            {(content.headers || []).map((h: string, i: number) => (
              <th
                key={i}
                style={{
                  padding: `${cellPad}px ${cellPad + 2}px`,
                  textAlign: "left",
                  fontSize: `${bs.fontSize ?? s.baseFontSize - 1}px`,
                  fontWeight: 600,
                  color: `hsl(${s.foregroundColor})`,
                  borderBottom: `1px solid hsl(${bs.borderColor || s.borderColor})`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(content.rows || []).map((row: string[], ri: number) => (
            <tr
              key={ri}
              style={{
                backgroundColor: striped && ri % 2 === 1 ? `hsl(${stripedBg})` : undefined,
              }}
            >
              {row.map((cell: string, ci: number) => (
                <td
                  key={ci}
                  style={{
                    padding: `${cellPad}px ${cellPad + 2}px`,
                    fontSize: `${bs.fontSize ?? s.baseFontSize - 1}px`,
                    color: `hsl(${s.mutedForegroundColor})`,
                    borderBottom: ri < (content.rows || []).length - 1 ? `1px solid hsl(${bs.borderColor || s.borderColor})` : undefined,
                    lineHeight: s.lineHeight,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ───────────────────────── API Endpoint ───────────────────────── */
const ApiEndpointBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const methodColors: Record<string, string> = {
    GET: "152 70% 38%",
    POST: "214 90% 50%",
    PUT: "32 95% 44%",
    DELETE: "0 80% 55%",
    PATCH: "270 60% 55%",
  };
  const methodColor = methodColors[content.method?.toUpperCase()] || s.primaryColor;
  const badgeRadius = bs.methodBadgeRadius ?? 6;

  return (
    <div
      className="my-5"
      style={{
        border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
        borderRadius: `${bs.borderRadius ?? 10}px`,
        overflow: "hidden",
        backgroundColor: `hsl(${s.backgroundColor})`,
      }}
    >
      <div
        className="flex items-center gap-3"
        style={{
          padding: "12px 16px",
          backgroundColor: `hsl(${s.mutedColor})`,
          borderBottom: `1px solid hsl(${bs.borderColor || s.borderColor})`,
        }}
      >
        <span
          style={{
            backgroundColor: `hsl(${methodColor})`,
            color: "#fff",
            padding: "3px 9px",
            borderRadius: `${badgeRadius}px`,
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            fontFamily: `'${s.codeFont}', monospace`,
          }}
        >
          {content.method?.toUpperCase() || "GET"}
        </span>
        <code
          style={{
            fontFamily: `'${s.codeFont}', monospace`,
            fontSize: `${bs.fontSize ?? s.baseFontSize - 1}px`,
            color: `hsl(${s.foregroundColor})`,
          }}
        >
          {content.path}
        </code>
      </div>
      {content.description && (
        <div
          style={{
            padding: "14px 16px",
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontSize: `${s.baseFontSize - 1}px`,
            color: `hsl(${s.mutedForegroundColor})`,
            lineHeight: s.lineHeight,
          }}
        >
          {content.description}
        </div>
      )}
      {content.parameters && content.parameters.length > 0 && (
        <div style={{ padding: "0 16px 14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "8px", color: `hsl(${s.mutedForegroundColor})`, letterSpacing: "0.04em", textTransform: "uppercase" }}>Parameters</div>
          {content.parameters.map((p: any, i: number) => (
            <div key={i} className="flex gap-2 items-baseline" style={{ marginBottom: "6px" }}>
              <code style={{ fontFamily: `'${s.codeFont}', monospace`, fontSize: "13px", color: `hsl(${s.foregroundColor})` }}>{p.name}</code>
              <span style={{ fontSize: "12px", color: `hsl(${s.mutedForegroundColor})` }}>
                {p.type}
                {p.required ? " · required" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
      {content.response && (
        <div
          style={{
            padding: "14px 16px",
            borderTop: `1px solid hsl(${bs.borderColor || s.borderColor})`,
            backgroundColor: `hsl(${s.codeBlockBg})`,
            fontFamily: `'${s.codeFont}', monospace`,
            fontSize: `${s.baseFontSize - 2}px`,
            whiteSpace: "pre-wrap",
            color: `hsl(${s.foregroundColor})`,
            lineHeight: 1.6,
          }}
        >
          {content.response}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── Code Tabs ───────────────────────── */
const CodeTabsBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const tabs = content.tabs || [];
  const codeFont = bs.fontFamily ? `'${bs.fontFamily}', monospace` : `'${s.codeFont}', monospace`;
  const codeFontSize = bs.fontSize ?? s.baseFontSize - 2;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tabs[active]?.code || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div
      className="my-5"
      style={{
        border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
        borderRadius: `${bs.borderRadius ?? s.codeBlockBorderRadius || 10}px`,
        overflow: "hidden",
        backgroundColor: `hsl(${bs.backgroundColor || s.codeBlockBg})`,
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          backgroundColor: `hsl(${s.mutedColor})`,
          borderBottom: `1px solid hsl(${bs.borderColor || s.borderColor})`,
          paddingRight: "10px",
        }}
      >
        <div className="flex">
          {tabs.map((tab: any, i: number) => {
            const isActive = active === i;
            return (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontFamily: codeFont,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? `hsl(${s.foregroundColor})` : `hsl(${s.mutedForegroundColor})`,
                  borderBottom: isActive ? `2px solid hsl(${s.primaryColor})` : "2px solid transparent",
                  marginBottom: "-1px",
                  background: "none",
                  cursor: "pointer",
                  transition: "color 0.15s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center justify-center"
          style={{
            color: `hsl(${s.mutedForegroundColor})`,
          }}
          aria-label="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "16px 18px",
          overflow: "auto",
          fontFamily: codeFont,
          fontSize: `${codeFontSize}px`,
          lineHeight: 1.65,
          color: bs.color ? `hsl(${bs.color})` : `hsl(${s.foregroundColor})`,
        }}
      >
        <code style={{ fontFamily: "inherit", fontSize: "inherit", color: "inherit" }}>
          {tabs[active]?.code}
        </code>
      </pre>
    </div>
  );
};

export default DocBlockRenderer;
