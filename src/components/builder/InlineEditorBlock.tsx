import { useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import type { DesignSettings } from "@/hooks/use-design-settings";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Minus, ImageIcon, LinkIcon, Heading1, Heading2, Heading3, Undo, Redo,
} from "lucide-react";

interface InlineEditorBlockProps {
  content: { html: string };
  settings: DesignSettings;
  onUpdate: (updates: any) => void;
}

const InlineEditorBlock = ({ content, settings, onUpdate }: InlineEditorBlockProps) => {
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

  // Sync external content changes
  useEffect(() => {
    if (editor && content.html !== editor.getHTML()) {
      editor.commands.setContent(content.html || "<p></p>", false);
    }
  }, [content.html]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Link URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
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
        overflow: "hidden",
        marginBottom: "16px",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5"
        style={{
          borderBottom: `1px solid hsl(${settings.borderColor})`,
          backgroundColor: `hsl(${settings.accentColor})`,
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
        <ToolBtn onClick={addLink} active={editor.isActive("link")}><LinkIcon size={iconSize} /></ToolBtn>
        <ToolBtn onClick={addImage}><ImageIcon size={iconSize} /></ToolBtn>
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
