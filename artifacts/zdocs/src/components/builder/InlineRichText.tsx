import { useRef, useState, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { Bold, Italic, Underline, LinkIcon, Palette, X, Check } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { useDebouncedCallback } from "@/hooks/use-debounce";

interface InlineRichTextProps {
  value: string;
  onChange: (html: string) => void;
  onDone?: () => void;
  settings: DesignSettings;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  tag?: "span" | "div";
  singleLine?: boolean;
  autoFocus?: boolean;
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
  onDone,
  settings: s,
  className = "",
  style = {},
  placeholder = "",
  tag: _tag = "div",
  singleLine = false,
  autoFocus = true,
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
  const doneCalledRef = useRef(false);
  // Track all pending timers so we can cancel them on unmount; otherwise a
  // late-arriving setState fires after the component is gone and React warns.
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);
  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();
    };
  }, []);

  const debouncedChange = useDebouncedCallback((html: string) => {
    onChange(html);
  }, 400);

  // Auto-focus and select all on mount
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    doneCalledRef.current = false;
  }, [autoFocus]);

  // Sync value from outside
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    let html = DOMPurify.sanitize(ref.current.innerHTML);
    if (singleLine) {
      html = html.replace(/<br\s*\/?>/gi, "").replace(/<div>|<\/div>/gi, "");
    }
    debouncedChange(html);
  }, [debouncedChange, singleLine]);

  const finishEditing = useCallback(() => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    // Flush any pending changes immediately
    if (ref.current) {
      let html = DOMPurify.sanitize(ref.current.innerHTML);
      if (singleLine) {
        html = html.replace(/<br\s*\/?>/gi, "").replace(/<div>|<\/div>/gi, "");
      }
      onChange(html);
    }
    setShowToolbar(false);
    setShowLinkInput(false);
    setShowColorPicker(false);
    keepOpenRef.current = false;
    onDone?.();
  }, [onChange, onDone, singleLine]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (singleLine && e.key === "Enter") {
      e.preventDefault();
      finishEditing();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      finishEditing();
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
      scheduleTimeout(() => {
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
    scheduleTimeout(() => linkInputRef.current?.focus(), 50);
  };

  const applyLink = () => {
    if (linkUrl.trim()) {
      restoreSelection();
      ref.current?.focus();
      document.execCommand("createLink", false, linkUrl.trim());
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
    keepOpenRef.current = false;
  };

  const handleColor = () => {
    if (showColorPicker) {
      setShowColorPicker(false);
      keepOpenRef.current = false;
    } else {
      saveSelection();
      keepOpenRef.current = true;
      setShowColorPicker(true);
      setShowLinkInput(false);
    }
  };

  const applyColor = (hslColor: string) => {
    execCommand("foreColor", `hsl(${hslColor})`);
    setShowColorPicker(false);
    keepOpenRef.current = false;
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
      className={`p-1 rounded transition-colors ${
        active
          ? "bg-primary/20 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="inline-rich-text-wrapper relative inline-flex items-center w-full gap-1">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`outline-none flex-1 rounded px-1 -mx-1 ring-2 ring-primary/20 bg-primary/[0.03] ${className}`}
        style={style}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          scheduleTimeout(() => {
            if (keepOpenRef.current) return;
            if (toolbarRef.current?.contains(document.activeElement)) return;
            finishEditing();
          }, 250);
        }}
        data-placeholder={placeholder}
      />

      {/* Small confirm button */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={finishEditing}
        className="shrink-0 h-5 w-5 rounded flex items-center justify-center transition-colors hover:bg-primary/10"
        style={{ color: `hsl(${s.sidebarActiveColor})` }}
        title="Done (Enter)"
      >
        <Check size={12} />
      </button>

      {showToolbar && (
        <div
          ref={toolbarRef}
          className="fixed z-[9999] flex items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-xl animate-fade-in border bg-popover text-popover-foreground"
          style={{
            left: `${toolbarPos.x}px`,
            top: `${toolbarPos.y}px`,
            transform: "translate(-50%, -100%)",
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
          <div className="w-px h-4 mx-0.5 bg-border" />
          <ToolBtn onClick={handleLink}>
            <LinkIcon size={13} />
          </ToolBtn>
          <ToolBtn onClick={handleColor}>
            <Palette size={13} />
          </ToolBtn>

          {showLinkInput && (
            <div
              className="absolute left-0 top-full mt-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg shadow-xl border bg-popover text-popover-foreground"
              style={{ minWidth: "260px" }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <input
                ref={linkInputRef}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyLink();
                  if (e.key === "Escape") {
                    setShowLinkInput(false);
                    keepOpenRef.current = false;
                  }
                }}
                placeholder="https://..."
                className="flex-1 bg-transparent text-foreground text-xs outline-none px-1.5 py-1 rounded border border-border placeholder:text-muted-foreground/70 focus:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <button
                onClick={applyLink}
                className="text-[11px] font-medium px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setShowLinkInput(false); keepOpenRef.current = false; }}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {showColorPicker && (
            <div
              className="absolute left-0 top-full mt-1 flex flex-wrap gap-1.5 p-2 rounded-lg shadow-xl border bg-popover text-popover-foreground"
              style={{ width: "140px" }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => applyColor(c)}
                  className="w-5 h-5 rounded-full border-border transition-transform hover:scale-110"
                  style={{
                    backgroundColor: `hsl(${c})`,
                    border: c === "0 0% 100%" ? "1px solid hsl(var(--border))" : "1px solid transparent",
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