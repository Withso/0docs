import type { ReactNode } from "react";

interface EditorTabsProps {
  value: "navigation" | "files";
  onChange: (v: "navigation" | "files") => void;
  rightSlot?: ReactNode;
}

const EditorTabs = ({ value, onChange, rightSlot }: EditorTabsProps) => {
  const tabs: { id: "navigation" | "files"; label: string }[] = [
    { id: "navigation", label: "Navigation" },
    { id: "files", label: "Files" },
  ];
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-2 py-1.5">
      <div className="flex items-center gap-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all ${
              value === t.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {rightSlot}
    </div>
  );
};

export default EditorTabs;
