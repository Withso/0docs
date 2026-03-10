import { useCallback, useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Minus, ImageIcon, LinkIcon, Heading1, Heading2, Heading3, Undo, Redo, X,
} from "lucide-react";

interface InlineEditorBlockProps {
  content: { html: string };
  settings: DesignSettings;
  onUpdate: (updates: any) => void;
}

/** Small inline popover for URL input */
const UrlPopover = ({
  label,
  placeholder,
  onSubmit,
  onClose,
  settings,
}: {
  label: string;
  placeholder: string;
  onSubmit: (url: string) => void;
  onClose: () => void;
  settings: DesignSettings;
}) => {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (url.trim()) onSubmit(url.trim());
    onClose();
  };

  return (
    <div
      className="absolute z-50 top-full left-0 mt-1 flex items-center gap-2 p-2 rounded-lg shadow-lg animate-fade-in"
      style={{
        backgroundColor: `hsl(${settings.backgroundColor})`,
        border: `1px solid hsl(${settings.borderColor})`,
        minWidth: "340px",
      }}
    >
      <span
        className="text-xs font-medium shrink-0"
        style={{ color: `hsl(${settings.mutedForegroundColor})` }}
      >
        {label}
      </span>
      <input
        ref={inputRef}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onClose();
        }}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm px-2 py-1 rounded"
        style={{
          border: `1px solid hsl(${settings.borderColor})`,
          color: `hsl(${settings.foregroundColor})`,
          fontSize: `${settings.baseFontSize - 2}px`,
        }}
      />
      <button
        onClick={handleSubmit}
        className="text-xs font-medium px-3 py-1 rounded transition-colors"
        style={{
          backgroundColor: `hsl(${settings.primaryColor})`,
          color: `hsl(${settings.primaryForegroundColor})`,
        }}
      >
        Add
      </button>
      <button
        onClick={onClose}
        className="p-0.5 rounded transition-colors"
        style={{ color: `hsl(${settings.mutedForegroundColor})` }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

const InlineEditorBlock = ({ content, settings, onUpdate }: InlineEditorBlockProps) => {
  const [popover, setPopover] = useState<"image" | "link" | null>(null);

  const debouncedSave = useDebouncedCallback((html: string) => {
    onUpdate({ html });
  }, 500);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "inline-editor-link" } }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "Start writing rich content..." }),
    ],
    content: content.html || "<p></p>",
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content.html !== editor.getHTML()) {
      editor.commands.setContent(content.html || "<p></p>", { emitUpdate: false });
    }
  }, [content.html]);

  const handleImageSubmit = useCallback((url: string) => {
    if (editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const handleLinkSubmit = useCallback((url: string) => {
    if (editor) editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="p-1.5 rounded transition-colors"
      style={{
        backgroundColor: active ? `hsl(${settings.accentColor})` : "transparent",
        color: active ? `hsl(${settings.foregroundColor})` : `hsl(${settings.mutedForegroundColor})`,
      }}
    >
      {children}
    </button>
  );

  const iconSize = 14;

  return (
    <div
      style={{
        border: `1px solid hsl(${settings.borderColor})`,
        borderRadius: `${settings.codeBlockBorderRadius}px`,
        overflow: "visible",
        marginBottom: "16px",
      }}
    >
      {/* Toolbar */}
      <div
        className="relative flex flex-wrap items-center gap-0.5 px-2 py-1.5"
        style={{
          borderBottom: `1px solid hsl(${settings.borderColor})`,
          backgroundColor: `hsl(${settings.accentColor})`,
          borderRadius: `${settings.codeBlockBorderRadius}px ${settings.codeBlockBorderRadius}px 0 0`,
        }}
      >
        <ToolBtn onClick={() => editor.chain().focus().undo().run()}><Undo size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()}><Redo size={iconSize} /></ToolBtn>
        <div className="w-px h-4 mx-1" style={{ backgroundColor: `hsl(${settings.borderColor})` }} />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}><Heading1 size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}><Heading3 size={iconSize} /></ToolBtn>
        <div className="w-px h-4 mx-1" style={{ backgroundColor: `hsl(${settings.borderColor})` }} />
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><Bold size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><Italic size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}><Strikethrough size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")}><Code size={iconSize} /></ToolBtn>
        <div className="w-px h-4 mx-1" style={{ backgroundColor: `hsl(${settings.borderColor})` }} />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}><List size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}><Quote size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={iconSize} /></ToolBtn>
        <div className="w-px h-4 mx-1" style={{ backgroundColor: `hsl(${settings.borderColor})` }} />
        <ToolBtn onClick={() => setPopover(popover === "link" ? null : "link")} active={editor.isActive("link")}><LinkIcon size={iconSize} /></ToolBtn>
        <ToolBtn onClick={() => setPopover(popover === "image" ? null : "image")}><ImageIcon size={iconSize} /></ToolBtn>

        {/* URL Popovers */}
        {popover === "image" && (
          <UrlPopover
            label="Image"
            placeholder="https://example.com/image.png"
            onSubmit={handleImageSubmit}
            onClose={() => setPopover(null)}
            settings={settings}
          />
        )}
        {popover === "link" && (
          <UrlPopover
            label="Link"
            placeholder="https://example.com"
            onSubmit={handleLinkSubmit}
            onClose={() => setPopover(null)}
            settings={settings}
          />
        )}
      </div>

      {/* Editor */}
      <div
        className="inline-editor-content"
        style={{
          padding: "16px 20px",
          fontFamily: `'${settings.bodyFont}', sans-serif`,
          fontSize: `${settings.baseFontSize}px`,
          lineHeight: settings.lineHeight,
          color: `hsl(${settings.foregroundColor})`,
          minHeight: "120px",
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default InlineEditorBlock;
