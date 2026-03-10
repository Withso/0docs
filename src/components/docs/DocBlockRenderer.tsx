import { useState } from "react";
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

const DocBlockRenderer = ({ block, settings: s, highlightType }: Props) => {
  const { content, type } = block;
  const bs = s.blockStyles[type as BlockKey] || {};
  const isHighlighted = highlightType === type;

  const getBlockStyle = (): React.CSSProperties => ({
    color: bs.color ? `hsl(${bs.color})` : undefined,
    fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : undefined,
    fontSize: bs.fontSize ? `${bs.fontSize}px` : undefined,
    fontWeight: (bs.fontWeight as any) || undefined,
    backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : undefined,
    borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : undefined,
    padding: bs.padding != null ? `${bs.padding}px` : undefined,
    borderColor: bs.borderColor ? `hsl(${bs.borderColor})` : undefined,
  });

  const highlightStyle: React.CSSProperties = isHighlighted
    ? { outline: "2px solid hsl(214 100% 50%)", outlineOffset: "4px", borderRadius: "4px", transition: "outline 0.2s ease" }
    : {};

  const wrapHighlight = (el: React.ReactNode) => (
    <div style={highlightStyle} data-block-type={type}>{el}</div>
  );

  const codeBlockFontSize = bs.fontSize ?? (s.baseFontSize - 1);
  const codeBlockFont = bs.fontFamily ? `'${bs.fontFamily}', monospace` : `'${s.codeFont}', monospace`;

  switch (type) {
    case "heading":
      return wrapHighlight(
        <h3 style={{ fontFamily: `'${s.headingFont}', sans-serif`, fontWeight: s.headingWeight, fontSize: `${s.headingFontSize}px`, marginBottom: "12px", ...getBlockStyle() }}>
          {content.text}
        </h3>
      );

    case "paragraph":
      return wrapHighlight(
        <p style={{ marginBottom: `${s.paragraphSpacing}px`, fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${s.baseFontSize}px`, lineHeight: s.lineHeight, ...getBlockStyle() }}>
          {content.text}
        </p>
      );

    case "code_block": {
      const codeStyle = getBlockStyle();
      return wrapHighlight(
        <div style={{
          backgroundColor: codeStyle.backgroundColor || `hsl(${s.codeBlockBg})`,
          borderRadius: codeStyle.borderRadius || `${s.codeBlockBorderRadius}px`,
          border: `1px solid ${codeStyle.borderColor ? `hsl(${bs.borderColor})` : `hsl(${s.borderColor})`}`,
          padding: codeStyle.padding || "16px",
          fontFamily: codeBlockFont, fontSize: `${codeBlockFontSize}px`,
          color: codeStyle.color, fontWeight: codeStyle.fontWeight, marginBottom: "16px",
        }}>
          {content.language && (
            <div style={{ color: `hsl(${s.mutedForegroundColor})`, fontSize: "12px", marginBottom: "8px" }}>{content.language}</div>
          )}
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}>
            <code style={{ fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}>{content.code}</code>
          </pre>
        </div>
      );
    }

    case "image":
      return content.url ? wrapHighlight(
        <div style={{ marginBottom: "16px" }}>
          <div className="overflow-hidden" style={{
            borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : (s.imageRounded ? "8px" : "0"),
            border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
            ...(bs.backgroundColor ? { backgroundColor: `hsl(${bs.backgroundColor})` } : {}),
            ...(bs.padding != null ? { padding: `${bs.padding}px` } : {}),
          }}>
            <img src={content.url} alt={content.alt || ""} className="w-full h-auto" loading="lazy" />
          </div>
          {content.alt && (
            <p style={{
              color: bs.color ? `hsl(${bs.color})` : `hsl(${s.mutedForegroundColor})`,
              fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.bodyFont}', sans-serif`,
              fontSize: `${bs.fontSize ?? (s.baseFontSize - 1)}px`,
              fontWeight: (bs.fontWeight as any) || undefined, marginTop: "4px", lineHeight: s.lineHeight,
            }}>{content.alt}</p>
          )}
        </div>
      ) : null;

    case "youtube":
      return content.videoId ? wrapHighlight(
        <div style={{
          backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : undefined,
          border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
          borderRadius: `${bs.borderRadius ?? 8}px`, padding: bs.padding != null ? `${bs.padding}px` : undefined, marginBottom: "16px",
        }}>
          <div className="overflow-hidden aspect-video" style={{ borderRadius: `${bs.borderRadius ?? 8}px` }}>
            <iframe src={`https://www.youtube.com/embed/${content.videoId}`} className="w-full h-full" allowFullScreen title={content.title || "Video"} />
          </div>
        </div>
      ) : null;

    case "video":
      return content.url ? wrapHighlight(
        <div style={{
          backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : undefined,
          border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
          borderRadius: `${bs.borderRadius ?? 8}px`, padding: bs.padding != null ? `${bs.padding}px` : undefined, marginBottom: "16px",
        }}>
          <div className="overflow-hidden" style={{ borderRadius: `${bs.borderRadius ?? 8}px` }}>
            <video controls className="w-full" style={{ display: "block" }}><source src={content.url} /></video>
          </div>
        </div>
      ) : null;

    case "ordered_list":
      return wrapHighlight(
        <ol style={{
          fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${s.baseFontSize}px`, lineHeight: s.lineHeight,
          listStyleType: "decimal", paddingLeft: "24px", marginBottom: "16px", ...getBlockStyle(),
        }}>
          {(content.items || []).map((item: string, i: number) => <li key={i} style={{ marginBottom: "4px" }}>{item}</li>)}
        </ol>
      );

    case "unordered_list":
      return wrapHighlight(
        <ul style={{
          fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${s.baseFontSize}px`, lineHeight: s.lineHeight,
          listStyleType: "disc", paddingLeft: "24px", marginBottom: "16px", ...getBlockStyle(),
        }}>
          {(content.items || []).map((item: string, i: number) => <li key={i} style={{ marginBottom: "4px" }}>{item}</li>)}
        </ul>
      );

    case "note": {
      const noteStyle = getBlockStyle();
      return wrapHighlight(
        <div style={{
          backgroundColor: noteStyle.backgroundColor || `hsl(${s.noteBg})`,
          borderLeft: `${s.noteBorderWidth}px solid ${noteStyle.borderColor ? `hsl(${bs.borderColor})` : `hsl(${s.noteBorderColor})`}`,
          borderRadius: noteStyle.borderRadius || "0 8px 8px 0",
          padding: noteStyle.padding || "12px 16px",
          fontSize: noteStyle.fontSize || `${s.baseFontSize - 1}px`,
          fontFamily: noteStyle.fontFamily || `'${s.bodyFont}', sans-serif`,
          fontWeight: noteStyle.fontWeight, color: noteStyle.color, lineHeight: s.lineHeight, marginBottom: "16px",
        }}>{content.text}</div>
      );
    }

    case "callout": {
      const calloutStyle = getBlockStyle();
      return wrapHighlight(
        <div style={{
          backgroundColor: calloutStyle.backgroundColor || `hsl(${s.accentColor})`,
          border: `1px solid ${calloutStyle.borderColor ? `hsl(${bs.borderColor})` : `hsl(${s.borderColor})`}`,
          borderRadius: calloutStyle.borderRadius || "8px",
          padding: calloutStyle.padding || "16px",
          fontFamily: calloutStyle.fontFamily || `'${s.bodyFont}', sans-serif`,
          fontSize: calloutStyle.fontSize || `${s.baseFontSize}px`,
          fontWeight: calloutStyle.fontWeight, color: calloutStyle.color, lineHeight: s.lineHeight, marginBottom: "16px",
        }}>{content.text}</div>
      );
    }

    case "tabs":
      return wrapHighlight(<TabsBlock content={content} settings={s} bs={bs} />);

    case "accordion":
      return wrapHighlight(<AccordionBlock content={content} settings={s} bs={bs} />);

    case "card":
      return wrapHighlight(
        <div style={{
          border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
          borderRadius: `${bs.borderRadius ?? 8}px`,
          padding: `${bs.padding ?? 20}px`,
          backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : `hsl(${s.accentColor})`,
          marginBottom: "16px",
        }}>
          <h4 style={{
            fontFamily: `'${s.headingFont}', sans-serif`, fontWeight: s.headingWeight,
            fontSize: `${bs.fontSize ?? s.baseFontSize}px`, marginBottom: "6px",
            color: bs.color ? `hsl(${bs.color})` : undefined,
          }}>{content.title}</h4>
          <p style={{
            fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${s.baseFontSize - 1}px`,
            color: `hsl(${s.mutedForegroundColor})`, lineHeight: s.lineHeight,
          }}>{content.description}</p>
          {content.link && (
            <a href={content.link} target="_blank" rel="noopener noreferrer" style={{
              color: `hsl(${s.linkColor})`, fontSize: `${s.baseFontSize - 1}px`, marginTop: "8px", display: "inline-block",
            }}>Learn more →</a>
          )}
        </div>
      );

    case "steps":
      return wrapHighlight(
        <div style={{ marginBottom: "16px" }}>
          {(content.items || []).map((step: any, i: number) => (
            <div key={i} className="flex gap-4" style={{ marginBottom: "16px" }}>
              <div className="flex flex-col items-center shrink-0">
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  backgroundColor: `hsl(${s.primaryColor})`, color: `hsl(${s.primaryForegroundColor})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 600, fontFamily: `'${s.bodyFont}', sans-serif`,
                }}>{i + 1}</div>
                {i < (content.items || []).length - 1 && (
                  <div style={{ width: "2px", flex: 1, marginTop: "4px", backgroundColor: `hsl(${s.borderColor})` }} />
                )}
              </div>
              <div style={{ paddingBottom: "8px" }}>
                <h4 style={{
                  fontFamily: `'${s.headingFont}', sans-serif`, fontWeight: s.headingWeight,
                  fontSize: `${bs.fontSize ?? s.baseFontSize}px`,
                  color: bs.color ? `hsl(${bs.color})` : undefined, marginBottom: "4px",
                }}>{step.title}</h4>
                <p style={{
                  fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${s.baseFontSize - 1}px`,
                  color: `hsl(${s.mutedForegroundColor})`, lineHeight: s.lineHeight,
                }}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      );

    case "table":
      return wrapHighlight(
        <div style={{
          border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
          borderRadius: `${bs.borderRadius ?? 8}px`, overflow: "hidden", marginBottom: "16px",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: `hsl(${s.accentColor})` }}>
                {(content.headers || []).map((h: string, i: number) => (
                  <th key={i} style={{
                    padding: "10px 14px", textAlign: "left",
                    fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${s.baseFontSize - 1}px`,
                    fontWeight: 600, borderBottom: `1px solid hsl(${s.borderColor})`,
                    color: bs.color ? `hsl(${bs.color})` : undefined,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(content.rows || []).map((row: string[], ri: number) => (
                <tr key={ri}>
                  {row.map((cell: string, ci: number) => (
                    <td key={ci} style={{
                      padding: "10px 14px",
                      fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${s.baseFontSize - 1}px`,
                      borderBottom: ri < (content.rows || []).length - 1 ? `1px solid hsl(${s.borderColor})` : undefined,
                      lineHeight: s.lineHeight,
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "divider":
      return wrapHighlight(
        <hr style={{
          border: "none", borderTop: `1px solid hsl(${bs.borderColor || s.borderColor})`,
          margin: "24px 0",
        }} />
      );

    case "quote":
      return wrapHighlight(
        <blockquote style={{
          borderLeft: `3px solid hsl(${bs.borderColor || s.primaryColor})`,
          paddingLeft: "16px", margin: "0 0 16px 0",
          fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.bodyFont}', sans-serif`,
          fontSize: `${bs.fontSize ?? s.baseFontSize}px`,
          fontStyle: "italic", lineHeight: s.lineHeight,
          color: bs.color ? `hsl(${bs.color})` : undefined,
        }}>
          <p>{content.text}</p>
          {content.attribution && (
            <footer style={{ fontSize: `${s.baseFontSize - 2}px`, color: `hsl(${s.mutedForegroundColor})`, fontStyle: "normal", marginTop: "8px" }}>
              — {content.attribution}
            </footer>
          )}
        </blockquote>
      );

    case "api_endpoint":
      return wrapHighlight(<ApiEndpointBlock content={content} settings={s} bs={bs} />);

    case "code_tabs":
      return wrapHighlight(<CodeTabsBlock content={content} settings={s} bs={bs} />);

    case "inline_editor":
      return wrapHighlight(
        <div
          className="inline-editor-content inline-editor-readonly"
          style={{
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontSize: `${s.baseFontSize}px`,
            lineHeight: s.lineHeight,
            marginBottom: "16px",
            ...getBlockStyle(),
          }}
          dangerouslySetInnerHTML={{ __html: content.html || "" }}
        />
      );

    default:
      return null;
  }
};

// --- Sub-components ---

const TabsBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const [active, setActive] = useState(0);
  const tabs = content.tabs || [];
  return (
    <div style={{ marginBottom: "16px" }}>
      <div className="flex" style={{ borderBottom: `1px solid hsl(${s.borderColor})`, gap: "0" }}>
        {tabs.map((tab: any, i: number) => (
          <button key={i} onClick={() => setActive(i)} style={{
            padding: "8px 16px",
            fontSize: `${bs.fontSize ?? (s.baseFontSize - 1)}px`,
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontWeight: active === i ? 500 : 400,
            color: active === i ? `hsl(${s.primaryColor})` : `hsl(${s.mutedForegroundColor})`,
            borderBottom: active === i ? `2px solid hsl(${s.primaryColor})` : "2px solid transparent",
            background: "none", cursor: "pointer", transition: "all 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>
      <div style={{
        padding: "12px 0",
        fontFamily: `'${s.bodyFont}', sans-serif`,
        fontSize: `${s.baseFontSize}px`,
        lineHeight: s.lineHeight,
      }}>
        {tabs[active]?.content}
      </div>
    </div>
  );
};

const AccordionBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = content.items || [];
  return (
    <div style={{ marginBottom: "16px", border: `1px solid hsl(${s.borderColor})`, borderRadius: `${bs.borderRadius ?? 8}px`, overflow: "hidden" }}>
      {items.map((item: any, i: number) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid hsl(${s.borderColor})` : undefined }}>
          <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full text-left flex items-center justify-between" style={{
            padding: "12px 16px",
            fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${bs.fontSize ?? s.baseFontSize}px`,
            fontWeight: 500, color: bs.color ? `hsl(${bs.color})` : undefined, background: "none", cursor: "pointer",
          }}>
            {item.title}
            <span style={{ transform: openIndex === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", fontSize: "12px" }}>▼</span>
          </button>
          {openIndex === i && (
            <div style={{
              padding: "0 16px 12px 16px",
              fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${s.baseFontSize - 1}px`,
              color: `hsl(${s.mutedForegroundColor})`, lineHeight: s.lineHeight,
            }}>{item.content}</div>
          )}
        </div>
      ))}
    </div>
  );
};

const ApiEndpointBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const methodColors: Record<string, string> = {
    GET: "142 76% 36%", POST: "214 100% 50%", PUT: "38 92% 50%", DELETE: "0 84% 60%", PATCH: "270 60% 55%",
  };
  const methodColor = methodColors[content.method?.toUpperCase()] || s.primaryColor;
  return (
    <div style={{
      border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
      borderRadius: `${bs.borderRadius ?? 8}px`, overflow: "hidden", marginBottom: "16px",
    }}>
      <div className="flex items-center gap-3" style={{
        padding: "12px 16px", backgroundColor: `hsl(${s.accentColor})`,
        borderBottom: `1px solid hsl(${s.borderColor})`,
      }}>
        <span style={{
          backgroundColor: `hsl(${methodColor})`, color: "#fff",
          padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700,
          fontFamily: `'${s.codeFont}', monospace`,
        }}>{content.method?.toUpperCase() || "GET"}</span>
        <code style={{
          fontFamily: `'${s.codeFont}', monospace`, fontSize: `${s.baseFontSize - 1}px`,
          color: bs.color ? `hsl(${bs.color})` : undefined,
        }}>{content.path}</code>
      </div>
      {content.description && (
        <div style={{
          padding: "12px 16px",
          fontFamily: `'${s.bodyFont}', sans-serif`, fontSize: `${s.baseFontSize - 1}px`,
          color: `hsl(${s.mutedForegroundColor})`, lineHeight: s.lineHeight,
        }}>{content.description}</div>
      )}
      {content.parameters && content.parameters.length > 0 && (
        <div style={{ padding: "0 16px 12px 16px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: `hsl(${s.mutedForegroundColor})` }}>Parameters</div>
          {content.parameters.map((p: any, i: number) => (
            <div key={i} className="flex gap-2 items-baseline" style={{ marginBottom: "4px" }}>
              <code style={{ fontFamily: `'${s.codeFont}', monospace`, fontSize: "13px" }}>{p.name}</code>
              <span style={{ fontSize: "12px", color: `hsl(${s.mutedForegroundColor})` }}>{p.type}{p.required ? " · required" : ""}</span>
            </div>
          ))}
        </div>
      )}
      {content.response && (
        <div style={{
          padding: "12px 16px", borderTop: `1px solid hsl(${s.borderColor})`,
          backgroundColor: `hsl(${s.codeBlockBg})`,
          fontFamily: `'${s.codeFont}', monospace`, fontSize: `${s.baseFontSize - 2}px`,
          whiteSpace: "pre-wrap",
        }}>{content.response}</div>
      )}
    </div>
  );
};

const CodeTabsBlock = ({ content, settings: s, bs }: { content: any; settings: DesignSettings; bs: Partial<BlockStyleSettings> }) => {
  const [active, setActive] = useState(0);
  const tabs = content.tabs || [];
  const codeFont = bs.fontFamily ? `'${bs.fontFamily}', monospace` : `'${s.codeFont}', monospace`;
  const codeFontSize = bs.fontSize ?? (s.baseFontSize - 1);
  return (
    <div style={{
      border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
      borderRadius: `${bs.borderRadius ?? s.codeBlockBorderRadius}px`,
      overflow: "hidden", marginBottom: "16px",
    }}>
      <div className="flex" style={{ backgroundColor: `hsl(${s.accentColor})`, borderBottom: `1px solid hsl(${s.borderColor})` }}>
        {tabs.map((tab: any, i: number) => (
          <button key={i} onClick={() => setActive(i)} style={{
            padding: "8px 14px", fontSize: "12px", fontFamily: codeFont,
            fontWeight: active === i ? 600 : 400,
            color: active === i ? `hsl(${s.primaryColor})` : `hsl(${s.mutedForegroundColor})`,
            borderBottom: active === i ? `2px solid hsl(${s.primaryColor})` : "2px solid transparent",
            background: "none", cursor: "pointer", transition: "all 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>
      <div style={{
        backgroundColor: `hsl(${bs.backgroundColor || s.codeBlockBg})`,
        padding: "16px", fontFamily: codeFont, fontSize: `${codeFontSize}px`,
        color: bs.color ? `hsl(${bs.color})` : undefined,
      }}>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}>
          <code style={{ fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}>{tabs[active]?.code}</code>
        </pre>
      </div>
    </div>
  );
};

export default DocBlockRenderer;
