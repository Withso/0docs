import {
  Type, AlignLeft, Code, ImageIcon, Film, Youtube,
  ListOrdered, List, StickyNote, AlertCircle, X,
  Columns, ChevronDown, CreditCard, Footprints,
  Table2, Minus, Quote, Globe, CodeXml, FileJson,
} from "lucide-react";

const blockTypes = [
  { type: "heading", label: "Heading", icon: Type },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft },
  { type: "code_block", label: "Code Block", icon: Code },
  { type: "code_tabs", label: "Code Tabs", icon: CodeXml },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "video", label: "Video", icon: Film },
  { type: "youtube", label: "YouTube", icon: Youtube },
  { type: "ordered_list", label: "Numbered List", icon: ListOrdered },
  { type: "unordered_list", label: "Bullet List", icon: List },
  { type: "note", label: "Note", icon: StickyNote },
  { type: "callout", label: "Callout", icon: AlertCircle },
  { type: "tabs", label: "Tabs", icon: Columns },
  { type: "accordion", label: "Accordion", icon: ChevronDown },
  { type: "card", label: "Card", icon: CreditCard },
  { type: "steps", label: "Steps", icon: Footprints },
  { type: "table", label: "Table", icon: Table2 },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "api_endpoint", label: "API Endpoint", icon: Globe },
];

interface AddBlockMenuProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

const AddBlockMenu = ({ onSelect, onClose }: AddBlockMenuProps) => {
  return (
    <div className="border rounded-xl bg-card shadow-platform-lg p-2 animate-fade-in">
      <div className="flex items-center justify-between px-2.5 pb-2 mb-1 border-b">
        <span className="platform-label">Add Block</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-0.5 max-h-[320px] overflow-y-auto">
        {blockTypes.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 text-left"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AddBlockMenu;
