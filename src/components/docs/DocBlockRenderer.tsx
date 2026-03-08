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

  switch (type) {
    case "heading":
      return wrapHighlight(
        <h3
          className="mb-3"
          style={{
            fontFamily: `'${s.headingFont}', sans-serif`,
            fontWeight: s.headingWeight,
            fontSize: `${s.headingFontSize}px`,
            ...getBlockStyle(),
          }}
        >
          {content.text}
        </h3>
      );

    case "paragraph":
      return wrapHighlight(
        <p className="mb-4" style={{ marginBottom: `${s.paragraphSpacing}px`, ...getBlockStyle() }}>
          {content.text}
        </p>
      );

    case "code_block":
      return wrapHighlight(
        <div
          className="mb-4"
          style={{
            backgroundColor: `hsl(${s.codeBlockBg})`,
            borderRadius: `${s.codeBlockBorderRadius}px`,
            border: `1px solid hsl(${s.borderColor})`,
            padding: "16px",
            fontFamily: `'${s.codeFont}', monospace`,
            fontSize: `${s.baseFontSize - 1}px`,
            ...getBlockStyle(),
          }}
        >
          {content.language && (
            <div className="text-xs mb-2" style={{ color: `hsl(${s.mutedForegroundColor})` }}>
              {content.language}
            </div>
          )}
          <pre className="m-0 whitespace-pre-wrap text-sm">
            <code>{content.code}</code>
          </pre>
        </div>
      );

    case "image":
      return content.url
        ? wrapHighlight(
            <div className="mb-4">
              <div
                className="overflow-hidden border"
                style={{
                  borderRadius: s.imageRounded ? "8px" : "0",
                  borderColor: `hsl(${s.borderColor})`,
                  ...getBlockStyle(),
                }}
              >
                <img src={content.url} alt={content.alt || ""} className="w-full h-auto" loading="lazy" />
              </div>
              {content.alt && (
                <p className="text-sm mt-1" style={{ color: `hsl(${s.mutedForegroundColor})` }}>
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
              className="mb-4 overflow-hidden border aspect-video"
              style={{
                borderRadius: `${bs.borderRadius ?? 8}px`,
                borderColor: `hsl(${s.borderColor})`,
              }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${content.videoId}`}
                className="w-full h-full"
                allowFullScreen
                title={content.title || "Video"}
              />
            </div>
          )
        : null;

    case "video":
      return content.url
        ? wrapHighlight(
            <video
              controls
              className="w-full mb-4 border"
              style={{
                borderRadius: `${bs.borderRadius ?? 8}px`,
                borderColor: `hsl(${s.borderColor})`,
              }}
            >
              <source src={content.url} />
            </video>
          )
        : null;

    case "ordered_list":
      return wrapHighlight(
        <ol className="mb-4 pl-6" style={{ ...getBlockStyle() }}>
          {(content.items || []).map((item: string, i: number) => (
            <li key={i} className="mb-1">{item}</li>
          ))}
        </ol>
      );

    case "unordered_list":
      return wrapHighlight(
        <ul className="mb-4 pl-6 list-disc" style={{ ...getBlockStyle() }}>
          {(content.items || []).map((item: string, i: number) => (
            <li key={i} className="mb-1">{item}</li>
          ))}
        </ul>
      );

    case "note":
      return wrapHighlight(
        <div
          className="mb-4"
          style={{
            backgroundColor: `hsl(${s.noteBg})`,
            borderLeft: `${s.noteBorderWidth}px solid hsl(${s.noteBorderColor})`,
            borderRadius: "0 8px 8px 0",
            padding: "12px 16px",
            fontSize: `${s.baseFontSize - 1}px`,
            ...getBlockStyle(),
          }}
        >
          {content.text}
        </div>
      );

    case "callout":
      return wrapHighlight(
        <div
          className="mb-4 border rounded-lg p-4"
          style={{
            backgroundColor: `hsl(${s.accentColor})`,
            borderColor: `hsl(${s.borderColor})`,
            ...getBlockStyle(),
          }}
        >
          {content.text}
        </div>
      );

    default:
      return null;
  }
};

export default DocBlockRenderer;
