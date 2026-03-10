import { useRef, useState, useEffect, useCallback } from "react";
import { Bold, Italic, Underline, LinkIcon, Palette, X } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { useDebouncedCallback } from "@/hooks/use-debounce";

interface InlineRichTextProps {
  value: string;
  onChange: (html: string) => void;
  settings: DesignSettings;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  tag?: "span" | "div";
  singleLine?: boolean;
}

const PRESET_COLORS = [
  "0 0% 13%",
  "0 0% 45%",
  "214 100% 50%",
  "0 72% 51%",
  "142 71% 45%",
  "38 92% 50%",
  "262 83% 58%",
  "0 0% 100%",
];

/** A contentEditable inline rich-text field with a floating toolbar on selection */
const InlineRichText = ({
  value,
  onChange,
  settings: s,
  className = "",
  style = {},
  placeholder = "",
  tag: _tag = "div",
  singleLine = false,
}: InlineRichTextProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const keepOpenRef = useRef(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  const debouncedChange = useDebouncedCallback((html: string) => {
    onChange(html);
  }, 400);

  // Sync value from outside
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const stripToPlainText = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || "";
  };

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    let html = ref.current.innerHTML;
    // For single-line, strip any block elements
    if (singleLine) {
      html = html.replace(/<br\s*\/?>/gi, "").replace(/<div>|<\/div>/gi, "");
    }
    debouncedChange(html);
  }, [debouncedChange, singleLine]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (singleLine && e.key === "Enter") {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  };

  const checkSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current) {
      setTimeout(() => {
        if (keepOpenRef.current) return;
        const sel2 = window.getSelection();
        if (!sel2 || sel2.isCollapsed) {
          setShowToolbar(false);
          setShowLinkInput(false);
          setShowColorPicker(false);
        }
      }, 200);
      return;
    }

    // Check selection is within our element
    if (!ref.current.contains(sel.anchorNode)) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setToolbarPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });

    saveSelection();
    setShowToolbar(true);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", checkSelection);
    return () => document.removeEventListener("selectionchange", checkSelection);
  }, [checkSelection]);

  const execCommand = (cmd: string, val?: string) => {
    restoreSelection();
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    saveSelection();
    handleInput();
  };

  const handleLink = () => {
    if (showLinkInput) {
      setShowLinkInput(false);
      keepOpenRef.current = false;
      return;
    }
    saveSelection();
    keepOpenRef.current = true;
    setShowLinkInput(true);
    setShowColorPicker(false);
    setTimeout(() => linkInputRef.current?.focus(), 50);
  };

  const applyLink = () => {
    if (linkUrl.trim()) {
      restoreSelection();
      ref.current?.focus();
      document.execCommand("createLink", false, linkUrl.trim());
      // Style links
      const links = ref.current?.querySelectorAll("a");
      links?.forEach((a) => {
        a.style.color = `hsl(${s.linkColor})`;
        a.style.textDecoration = "underline";
        a.target = "_blank";
      });
      handleInput();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  };

  const handleColor = () => {
    setShowColorPicker(!showColorPicker);
    setShowLinkInput(false);
  };

  const applyColor = (hslColor: string) => {
    execCommand("foreColor", `hsl(${hslColor})`);
    setShowColorPicker(false);
  };

  const isActive = (cmd: string) => {
    try {
      return document.queryCommandState(cmd);
    } catch {
      return false;
    }
  };

  const ToolBtn = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="p-1 rounded transition-colors"
      style={{
        backgroundColor: active ? "rgba(255,255,255,0.15)" : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.8)",
      }}
    >
      {children}
    </button>
  );

  return (
    <div className="inline-rich-text-wrapper relative inline-block w-full">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`outline-none ${className}`}
        style={style}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay hide to allow toolbar clicks
          setTimeout(() => {
            if (!toolbarRef.current?.contains(document.activeElement)) {
              setShowToolbar(false);
              setShowLinkInput(false);
              setShowColorPicker(false);
            }
          }, 250);
        }}
        data-placeholder={placeholder}
      />

      {showToolbar && (
        <div
          ref={toolbarRef}
          className="fixed z-[9999] flex items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-xl animate-fade-in"
          style={{
            left: `${toolbarPos.x}px`,
            top: `${toolbarPos.y}px`,
            transform: "translate(-50%, -100%)",
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ToolBtn onClick={() => execCommand("bold")} active={isActive("bold")}>
            <Bold size={13} />
          </ToolBtn>
          <ToolBtn onClick={() => execCommand("italic")} active={isActive("italic")}>
            <Italic size={13} />
          </ToolBtn>
          <ToolBtn onClick={() => execCommand("underline")} active={isActive("underline")}>
            <Underline size={13} />
          </ToolBtn>
          <div className="w-px h-4 mx-0.5" style={{ backgroundColor: "#444" }} />
          <ToolBtn onClick={handleLink}>
            <LinkIcon size={13} />
          </ToolBtn>
          <ToolBtn onClick={handleColor}>
            <Palette size={13} />
          </ToolBtn>

          {/* Link input row */}
          {showLinkInput && (
            <div
              className="absolute left-0 top-full mt-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg shadow-xl"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", minWidth: "260px" }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <input
                ref={linkInputRef}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyLink();
                  if (e.key === "Escape") setShowLinkInput(false);
                }}
                placeholder="https://..."
                className="flex-1 bg-transparent text-white text-xs outline-none px-1.5 py-1 rounded"
                style={{ border: "1px solid #444" }}
              />
              <button
                onClick={applyLink}
                className="text-[11px] font-medium px-2 py-1 rounded"
                style={{ backgroundColor: "#3b82f6", color: "#fff" }}
              >
                Add
              </button>
              <button
                onClick={() => setShowLinkInput(false)}
                className="p-0.5"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Color picker */}
          {showColorPicker && (
            <div
              className="absolute left-0 top-full mt-1 flex flex-wrap gap-1.5 p-2 rounded-lg shadow-xl"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", width: "140px" }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => applyColor(c)}
                  className="w-5 h-5 rounded-full border transition-transform hover:scale-110"
                  style={{
                    backgroundColor: `hsl(${c})`,
                    borderColor: c === "0 0% 100%" ? "#555" : "transparent",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineRichText;
