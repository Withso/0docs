import { useState } from "react";
import { GitBranch, Check, ChevronDown, Star } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocVersion } from "@/hooks/use-versions";
import VersionManager from "./VersionManager";

interface VersionSwitcherProps {
  projectId: string;
  versions: DocVersion[];
  activeVersionId: string | null;
  onSelect: (versionId: string | null) => void;
  // Pass-through to VersionManager — using the parent's single useVersions instance
  // is critical so creating/cloning/deleting versions reflects everywhere instantly.
  addVersion: (label: string) => Promise<DocVersion | null>;
  cloneVersion: (sourceId: string, label: string) => Promise<DocVersion | null>;
  setDefault: (id: string) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;
}

/**
 * Editor-side version switcher. Sits in the builder header next to the view
 * toggle. When versions exist, it lets the author pick which version they're
 * editing — that selection drives page filtering and `addPage` assignment so
 * the editor experience matches Mintlify's branched-docs workflow.
 */
const VersionSwitcher = ({
  projectId,
  versions,
  activeVersionId,
  onSelect,
  addVersion,
  cloneVersion,
  setDefault,
  deleteVersion,
}: VersionSwitcherProps) => {
  const [open, setOpen] = useState(false);

  const managerProps = {
    projectId,
    versions,
    addVersion,
    cloneVersion,
    setDefault,
    deleteVersion,
  };

  if (versions.length === 0) {
    // Surface "Manage Versions" so the user can create the first one.
    return <VersionManager {...managerProps} />;
  }

  const active = versions.find((v) => v.id === activeVersionId) || null;
  const label = active?.version_label || "All versions";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch editing version"
          className="h-7 inline-flex items-center gap-1.5 rounded-md px-2 text-[12px] font-mono bg-muted/60 border border-border/40 text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        >
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate max-w-[120px]">{label}</span>
          {active?.is_default && <Star className="h-3 w-3 text-primary fill-primary" />}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
          Editing version
        </DropdownMenuLabel>
        {versions.map((v) => {
          const isActive = v.id === activeVersionId;
          return (
            <DropdownMenuItem
              key={v.id}
              onSelect={() => onSelect(v.id)}
              className="flex items-center justify-between gap-2 text-[12.5px]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono truncate">{v.version_label}</span>
                {v.is_default && <Star className="h-3 w-3 text-primary fill-primary shrink-0" />}
              </span>
              {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <VersionManager {...managerProps} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default VersionSwitcher;
