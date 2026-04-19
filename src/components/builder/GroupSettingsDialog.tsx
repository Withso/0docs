import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { NavGroup, Tab } from "@/hooks/use-builder";

interface GroupMetadata {
  hidden?: boolean;
  expanded?: boolean;
  tag?: string;
  icon?: string;
  openapiSpec?: string;
  asyncapiSpec?: string;
}

interface Props {
  group: NavGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updated?: any) => void;
  tabs?: Tab[];
}

/** Settings dialog for a nav group (Mintlify parity) */
const GroupSettingsDialog = ({ group, open, onOpenChange, onSaved, tabs = [] }: Props) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState<GroupMetadata>({});
  const [type, setType] = useState<"label" | "text" | "dropdown">("label");
  const [tabId, setTabId] = useState<string>("__none__");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setTitle(group.title);
      setMeta(((group as any).metadata || {}) as GroupMetadata);
      setType((group.type as any) || "label");
      setTabId((group.tab_id as string) || "__none__");
    }
  }, [group?.id]);

  if (!group) return null;

  const updateMeta = <K extends keyof GroupMetadata>(key: K, value: GroupMetadata[K]) =>
    setMeta((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      title,
      metadata: meta,
      type,
      tab_id: tabId === "__none__" ? null : tabId,
    } as any;
    console.log("[GroupSettingsDialog] saving", { groupId: group.id, updates });
    const { data, error } = await (supabase as any)
      .from("nav_groups")
      .update(updates)
      .eq("id", group.id)
      .select();
    console.log("[GroupSettingsDialog] save result", { data, error });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Group settings saved" });
      onSaved?.(data?.[0]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px]">Group Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-[12px]" />
          </Field>

          <Field label="Type">
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="label" className="text-[12px]">Label (uppercase header)</SelectItem>
                <SelectItem value="text" className="text-[12px]">Text (plain row)</SelectItem>
                <SelectItem value="dropdown" className="text-[12px]">Dropdown (top-bar menu)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {tabs.length > 0 && (
            <Field label="Belongs to Tab">
              <Select value={tabId} onValueChange={setTabId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="No tab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-[12px]">— None (always visible) —</SelectItem>
                  {tabs.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-[12px]">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Icon">
            <Input
              value={meta.icon || ""}
              onChange={(e) => updateMeta("icon", e.target.value)}
              placeholder="lucide icon name"
              className="h-9 text-[12px]"
            />
          </Field>

          <Field label="Tag">
            <Input
              value={meta.tag || ""}
              onChange={(e) => updateMeta("tag", e.target.value)}
              placeholder="e.g. NEW, Beta"
              className="h-9 text-[12px]"
            />
          </Field>

          <Field label="OpenAPI Spec URL">
            <Input
              value={meta.openapiSpec || ""}
              onChange={(e) => updateMeta("openapiSpec", e.target.value)}
              placeholder="https://.../openapi.json"
              className="h-9 text-[12px]"
            />
          </Field>

          <Field label="AsyncAPI Spec URL">
            <Input
              value={meta.asyncapiSpec || ""}
              onChange={(e) => updateMeta("asyncapiSpec", e.target.value)}
              placeholder="https://.../asyncapi.json"
              className="h-9 text-[12px]"
            />
          </Field>

          <div className="flex items-center justify-between pt-2">
            <Label className="text-[12px] font-medium">Hidden</Label>
            <Switch checked={meta.hidden === true} onCheckedChange={(v) => updateMeta("hidden", v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-medium">Expanded by default</Label>
            <Switch checked={meta.expanded !== false} onCheckedChange={(v) => updateMeta("expanded", v)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
      {label}
    </Label>
    {children}
  </div>
);

export default GroupSettingsDialog;
