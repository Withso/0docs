import { useState } from "react";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tab } from "@/hooks/use-builder";
import type { DesignSettings } from "@/hooks/use-design-settings";

interface Props {
  settings: DesignSettings;
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string | null) => void;
  onAddTab: (label?: string) => Promise<void> | void;
  onUpdateTab: (tabId: string, updates: Partial<Tab>) => Promise<void> | void;
  onDeleteTab: (tabId: string) => Promise<void> | void;
  onReorderTabs: (reordered: Tab[]) => Promise<void> | void;
}

/**
 * Tabs manager — tiny chip strip in the editor sidebar header.
 * Lets the user filter the nav by tab and manage tabs (add/rename/reorder/delete).
 * "All" pseudo-tab shows every nav group.
 */
const TabsManager = ({
  settings: s,
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onUpdateTab,
  onDeleteTab,
  onReorderTabs,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const sortedTabs = [...tabs].sort((a, b) => a.order_index - b.order_index);

  const startRename = (tab: Tab) => {
    setEditingId(tab.id);
    setDraftLabel(tab.label);
  };

  const commitRename = async () => {
    if (!editingId) return;
    const label = draftLabel.trim() || "Untitled";
    await onUpdateTab(editingId, { label });
    setEditingId(null);
  };

  const move = async (tab: Tab, dir: -1 | 1) => {
    const idx = sortedTabs.findIndex((t) => t.id === tab.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sortedTabs.length) return;
    const reordered = [...sortedTabs];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    await onReorderTabs(reordered.map((t, i) => ({ ...t, order_index: i })));
  };

  const handleAdd = async () => {
    const label = newLabel.trim() || "New Tab";
    await onAddTab(label);
    setNewLabel("");
  };

  return (
    <div className="flex items-center gap-1 mb-3">
      {/* "All" pseudo-tab */}
      <button
        onClick={() => onSelectTab(null)}
        className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md transition-colors ${
          activeTabId === null ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        All
      </button>

      {sortedTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md truncate max-w-[120px] transition-colors ${
              isActive ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
            title={tab.label}
          >
            {tab.label}
          </button>
        );
      })}

      {/* Manage / add tabs */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="ml-auto h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50"
            title="Manage tabs"
          >
            <Layers className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">
            Top-level tabs
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {sortedTabs.length === 0 && (
              <div className="text-[12px] text-muted-foreground px-1 py-2">
                No tabs yet. Add one below.
              </div>
            )}
            {sortedTabs.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center gap-1 group rounded-md hover:bg-muted/50 px-1 py-1"
              >
                {editingId === tab.id ? (
                  <>
                    <Input
                      value={draftLabel}
                      onChange={(e) => setDraftLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="h-7 text-[12px] flex-1"
                    />
                    <button onClick={commitRename} className="h-6 w-6 flex items-center justify-center text-emerald-600">
                      <Check className="h-3 w-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="h-6 w-6 flex items-center justify-center text-muted-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[12px] truncate">{tab.label}</span>
                    <button
                      onClick={() => move(tab, -1)}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Move up"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => move(tab, 1)}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Move down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => startRename(tab)}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onDeleteTab(tab.id)}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="New tab label"
              className="h-7 text-[12px] flex-1"
            />
            <Button size="sm" onClick={handleAdd} className="h-7 text-[11px] px-2">
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TabsManager;
