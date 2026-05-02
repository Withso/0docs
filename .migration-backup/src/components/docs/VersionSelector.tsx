import { ChevronDown } from "lucide-react";
import type { DocVersion } from "@/hooks/use-versions";
import type { DesignSettings } from "@/hooks/use-design-settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VersionSelectorProps {
  versions: DocVersion[];
  activeVersion: DocVersion | null;
  onSelect: (version: DocVersion) => void;
  settings: DesignSettings;
}

const VersionSelector = ({ versions, activeVersion, onSelect, settings }: VersionSelectorProps) => {
  if (versions.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-colors hover:bg-accent"
          style={{
            borderColor: `hsl(${settings.borderColor})`,
            color: `hsl(${settings.mutedForegroundColor})`,
            fontFamily: `'${settings.bodyFont}', sans-serif`,
          }}
        >
          {activeVersion?.version_label || "Version"}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {versions.map((v) => (
          <DropdownMenuItem
            key={v.id}
            onClick={() => onSelect(v)}
            className={`text-xs ${v.id === activeVersion?.id ? "font-semibold" : ""}`}
          >
            {v.version_label}
            {v.is_default && <span className="ml-2 text-[10px] text-muted-foreground">(default)</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default VersionSelector;
