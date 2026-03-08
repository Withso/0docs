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

/**
 * Shared read-only block renderer used by PublicDocs, DesignSettings, and any
 * other view that needs to display documentation blocks with design settings applied.
 */
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
    ? {
        outline: "2px solid hsl(214 100% 50%)",
        outlineOffset: "4px",
        borderRadius: "4px",
        transition: "outline 0.2s ease",
      }
    : {};

  const wrapHighlight = (el: React.ReactNode) => (
    <div style={highlightStyle} data-block-type={type}>
      {el}
    </div>
  );

  // Resolve effective font size for code blocks
  const codeBlockFontSize = bs.fontSize ?? (s.baseFontSize - 1);
  const codeBlockFont = bs.fontFamily ? `'${bs.fontFamily}', monospace` : `'${s.codeFont}', monospace`;

  switch (type) {
    case "heading":
      return wrapHighlight(
        <h3
          style={{
            fontFamily: `'${s.headingFont}', sans-serif`,
            fontWeight: s.headingWeight,
            fontSize: `${s.headingFontSize}px`,
            marginBottom: "12px",
            ...getBlockStyle(),
          }}
        >
          {content.text}
        </h3>
      );

    case "paragraph":
      return wrapHighlight(
        <p
          style={{
            marginBottom: `${s.paragraphSpacing}px`,
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontSize: `${s.baseFontSize}px`,
            lineHeight: s.lineHeight,
            ...getBlockStyle(),
          }}
        >
          {content.text}
        </p>
      );

    case "code_block": {
      const codeStyle = getBlockStyle();
      return wrapHighlight(
        <div
          style={{
            backgroundColor: codeStyle.backgroundColor || `hsl(${s.codeBlockBg})`,
            borderRadius: codeStyle.borderRadius || `${s.codeBlockBorderRadius}px`,
            border: `1px solid ${codeStyle.borderColor ? `hsl(${bs.borderColor})` : `hsl(${s.borderColor})`}`,
            padding: codeStyle.padding || "16px",
            fontFamily: codeBlockFont,
            fontSize: `${codeBlockFontSize}px`,
            color: codeStyle.color,
            fontWeight: codeStyle.fontWeight,
            marginBottom: "16px",
          }}
        >
          {content.language && (
            <div style={{ color: `hsl(${s.mutedForegroundColor})`, fontSize: "12px", marginBottom: "8px" }}>
              {content.language}
            </div>
          )}
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}>
            <code style={{ fontSize: "inherit", fontFamily: "inherit", color: "inherit" }}>{content.code}</code>
          </pre>
        </div>
      );
    }

    case "image":
      return content.url
        ? wrapHighlight(
            <div style={{ marginBottom: "16px" }}>
              <div
                className="overflow-hidden"
                style={{
                  borderRadius: bs.borderRadius != null ? `${bs.borderRadius}px` : (s.imageRounded ? "8px" : "0"),
                  border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
                  ...(bs.backgroundColor ? { backgroundColor: `hsl(${bs.backgroundColor})` } : {}),
                  ...(bs.padding != null ? { padding: `${bs.padding}px` } : {}),
                }}
              >
                <img src={content.url} alt={content.alt || ""} className="w-full h-auto" loading="lazy" />
              </div>
              {content.alt && (
                <p
                  style={{
                    color: bs.color ? `hsl(${bs.color})` : `hsl(${s.mutedForegroundColor})`,
                    fontFamily: bs.fontFamily ? `'${bs.fontFamily}', sans-serif` : `'${s.bodyFont}', sans-serif`,
                    fontSize: `${bs.fontSize ?? (s.baseFontSize - 1)}px`,
                    fontWeight: (bs.fontWeight as any) || undefined,
                    marginTop: "4px",
                    lineHeight: s.lineHeight,
                  }}
                >
                  {content.alt}
                </p>
              )}
            </div>
          )
        : null;

    case "youtube":
      return content.videoId
        ? wrapHighlight(
            <div
              style={{
                backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : undefined,
                border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
                borderRadius: `${bs.borderRadius ?? 8}px`,
                padding: bs.padding != null ? `${bs.padding}px` : undefined,
                marginBottom: "16px",
              }}
            >
              <div className="overflow-hidden aspect-video" style={{ borderRadius: `${bs.borderRadius ?? 8}px` }}>
                <iframe
                  src={`https://www.youtube.com/embed/${content.videoId}`}
                  className="w-full h-full"
                  allowFullScreen
                  title={content.title || "Video"}
                />
              </div>
            </div>
          )
        : null;

    case "video":
      return content.url
        ? wrapHighlight(
            <div
              style={{
                backgroundColor: bs.backgroundColor ? `hsl(${bs.backgroundColor})` : undefined,
                border: `1px solid hsl(${bs.borderColor || s.borderColor})`,
                borderRadius: `${bs.borderRadius ?? 8}px`,
                padding: bs.padding != null ? `${bs.padding}px` : undefined,
                marginBottom: "16px",
              }}
            >
              <div className="overflow-hidden" style={{ borderRadius: `${bs.borderRadius ?? 8}px` }}>
                <video controls className="w-full" style={{ display: "block" }}>
                  <source src={content.url} />
                </video>
              </div>
            </div>
          )
        : null;

    case "ordered_list":
      return wrapHighlight(
        <ol
          style={{
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontSize: `${s.baseFontSize}px`,
            lineHeight: s.lineHeight,
            listStyleType: "decimal",
            paddingLeft: "24px",
            marginBottom: "16px",
            ...getBlockStyle(),
          }}
        >
          {(content.items || []).map((item: string, i: number) => (
            <li key={i} style={{ marginBottom: "4px" }}>{item}</li>
          ))}
        </ol>
      );

    case "unordered_list":
      return wrapHighlight(
        <ul
          style={{
            fontFamily: `'${s.bodyFont}', sans-serif`,
            fontSize: `${s.baseFontSize}px`,
            lineHeight: s.lineHeight,
            listStyleType: "disc",
            paddingLeft: "24px",
            marginBottom: "16px",
            ...getBlockStyle(),
          }}
        >
          {(content.items || []).map((item: string, i: number) => (
            <li key={i} style={{ marginBottom: "4px" }}>{item}</li>
          ))}
        </ul>
      );

    case "note": {
      const noteStyle = getBlockStyle();
      return wrapHighlight(
        <div
          style={{
            backgroundColor: noteStyle.backgroundColor || `hsl(${s.noteBg})`,
            borderLeft: `${s.noteBorderWidth}px solid ${noteStyle.borderColor ? `hsl(${bs.borderColor})` : `hsl(${s.noteBorderColor})`}`,
            borderRadius: noteStyle.borderRadius || "0 8px 8px 0",
            padding: noteStyle.padding || "12px 16px",
            fontSize: noteStyle.fontSize || `${s.baseFontSize - 1}px`,
            fontFamily: noteStyle.fontFamily || `'${s.bodyFont}', sans-serif`,
            fontWeight: noteStyle.fontWeight,
            color: noteStyle.color,
            lineHeight: s.lineHeight,
            marginBottom: "16px",
          }}
        >
          {content.text}
        </div>
      );
    }

    case "callout": {
      const calloutStyle = getBlockStyle();
      return wrapHighlight(
        <div
          style={{
            backgroundColor: calloutStyle.backgroundColor || `hsl(${s.accentColor})`,
            border: `1px solid ${calloutStyle.borderColor ? `hsl(${bs.borderColor})` : `hsl(${s.borderColor})`}`,
            borderRadius: calloutStyle.borderRadius || "8px",
            padding: calloutStyle.padding || "16px",
            fontFamily: calloutStyle.fontFamily || `'${s.bodyFont}', sans-serif`,
            fontSize: calloutStyle.fontSize || `${s.baseFontSize}px`,
            fontWeight: calloutStyle.fontWeight,
            color: calloutStyle.color,
            lineHeight: s.lineHeight,
            marginBottom: "16px",
          }}
        >
          {content.text}
        </div>
      );
    }

    default:
      return null;
  }
};

export default DocBlockRenderer;
