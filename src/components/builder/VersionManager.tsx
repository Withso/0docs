import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Star, Trash2, Tag } from "lucide-react";
import { useVersions } from "@/hooks/use-versions";

interface VersionManagerProps {
  projectId: string;
}

const VersionManager = ({ projectId }: VersionManagerProps) => {
  const { versions, addVersion, setDefault, deleteVersion } = useVersions(projectId);
  const [newLabel, setNewLabel] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await addVersion(newLabel.trim());
    setNewLabel("");
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Tag className="h-3.5 w-3.5 mr-1.5" /> Versions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Documentation Versions</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {versions.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No versions yet. Create your first version to enable version switching in public docs.
            </p>
          )}
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{v.version_label}</span>
                {v.is_default && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Default</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!v.is_default && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDefault(v.id)} title="Set as default">
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteVersion(v.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. v2.0, latest, beta"
            className="h-9 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <Button size="sm" className="h-9" onClick={handleAdd} disabled={!newLabel.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VersionManager;
