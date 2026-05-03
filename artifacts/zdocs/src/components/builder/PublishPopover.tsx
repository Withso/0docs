import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Globe, FileText, Loader2, Upload, ChevronDown, Check, GitPullRequest } from "lucide-react";
import { toast } from "sonner";
import type { EditorChange, DesignChange } from "@/hooks/use-publish";

interface PublishPopoverProps {
  editorChanges: EditorChange[];
  designChanges: DesignChange[];
  nextVersion: string;
  isFirstPublish: boolean;
  publishing: boolean;
  hasUnpublishedChanges: boolean;
  onPublish: (notes?: string) => void;
  projectSlug: string;
  customDomain?: string;
  branchName?: string;
  isDefaultBranch?: boolean;
}

interface FileChange {
  filename: string;
  status: "Added" | "Modified" | "Removed";
  scope?: string;
}

const STATUS_COLOR: Record<FileChange["status"], string> = {
  Added: "text-emerald-500",
  Modified: "text-amber-500",
  Removed: "text-red-400",
};

/**
 * Roll the verbose page/section/block-level edit list into a Mintlify-style
 * "X file changes" file list. Each page maps to one .mdx file (keyed by
 * pageId, displayed by slug/title), plus a `docs.json` line if anything
 * changed at the design / nav-grouping level.
 *
 * Uses the structural `pageId` / `pageSlug` / `pageTitle` carried on every
 * EditorChange (populated in use-publish.ts) so block- and section-only
 * edits roll up to their parent page without label parsing.
 */
function buildFileChanges(
  editorChanges: EditorChange[],
  designChanges: DesignChange[],
): FileChange[] {
  // Keyed by pageId (stable) so multiple edits to the same page collapse.
  const pageMap = new Map<string, FileChange>();
  // Edits with no resolvable page (orphan section/block) — keep one bucket
  // so the user still sees that *something* changed.
  let orphanCount = 0;

  const slugify = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";

  for (const c of editorChanges) {
    if (c.type.startsWith("nav_group_")) continue; // → docs.json below

    if (!c.pageId) {
      orphanCount += 1;
      continue;
    }

    const filename = `${c.pageSlug || (c.pageTitle ? slugify(c.pageTitle) : c.pageId.slice(0, 8))}.mdx`;
    // Page-level type wins; otherwise mark Modified.
    let status: FileChange["status"] = "Modified";
    if (c.type === "page_added") status = "Added";
    else if (c.type === "page_removed") status = "Removed";

    const existing = pageMap.get(c.pageId);
    if (!existing) {
      pageMap.set(c.pageId, { filename, status });
    } else if (existing.status === "Modified" && status !== "Modified") {
      // Page-level Add/Remove overrides a previously-recorded section Modified.
      pageMap.set(c.pageId, { filename, status });
    }
  }

  const files: FileChange[] = [...pageMap.values()];

  if (orphanCount > 0) {
    files.push({ filename: `${orphanCount} orphan change${orphanCount === 1 ? "" : "s"}`, status: "Modified" });
  }

  // Anything sidebar/nav-related lands in docs.json (Mintlify convention).
  const navChanged = editorChanges.some((c) => c.type.startsWith("nav_group_"));
  if (navChanged || designChanges.length > 0) {
    files.push({ filename: "docs.json", status: "Modified" });
  }

  return files.sort((a, b) => {
    if (a.filename === "docs.json") return 1;
    if (b.filename === "docs.json") return -1;
    return a.filename.localeCompare(b.filename);
  });
}

const PublishPopover = ({
  editorChanges,
  designChanges,
  nextVersion,
  isFirstPublish,
  publishing,
  hasUnpublishedChanges,
  onPublish,
  projectSlug,
  customDomain,
  branchName,
  isDefaultBranch = true,
}: PublishPopoverProps) => {
  const [open, setOpen] = useState(false);

  const fileChanges = useMemo(
    () => buildFileChanges(editorChanges, designChanges),
    [editorChanges, designChanges],
  );

  // Default published URL is served by this same app at <host>/p/<slug>
  // (see the `/p/:slug` route in App.tsx). The hard-coded "*.0docs.app"
  // fallback was misleading because no such host is actually wired up.
  const liveHost = customDomain
    ?? (projectSlug
      ? `${typeof window !== "undefined" ? window.location.host : ""}/p/${projectSlug}`
      : "Not published yet");
  const totalFiles = fileChanges.length;
  const onBranch = !isDefaultBranch && branchName;
  const noChangesYet = !isFirstPublish && totalFiles === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className="h-8 rounded-lg pl-4 pr-3 text-[12px] font-medium relative bg-emerald-500 hover:bg-emerald-500/90 text-white"
        >
          Publish
          <ChevronDown
            className={`h-3.5 w-3.5 ml-1 transition-transform ${open ? "rotate-180" : ""}`}
          />
          {hasUnpublishedChanges && !open && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-4 rounded-2xl border bg-popover shadow-2xl"
      >
        {/* Domain row */}
        <div className="flex items-center gap-2.5 text-[13px] mb-3">
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate font-medium">{liveHost}</span>
        </div>

        {/* File changes header */}
        <div className="flex items-center gap-2.5 text-[13px] text-foreground/90 mb-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>
            {noChangesYet
              ? "No file changes"
              : isFirstPublish && totalFiles === 0
                ? "Initial publish"
                : `${totalFiles} file change${totalFiles === 1 ? "" : "s"}`}
          </span>
        </div>

        {/* File list */}
        {fileChanges.length > 0 && (
          <div className="ml-6 border-l border-border/60 pl-3 space-y-1.5 mb-4">
            {fileChanges.map((f) => (
              <div
                key={f.filename}
                className="flex items-center justify-between text-[12px]"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-mono text-[10px] px-1 py-0.5 rounded border border-current/30 ${STATUS_COLOR[f.status]} shrink-0`}
                    aria-hidden
                  >
                    {f.filename.endsWith(".json") ? "{ }" : "M↓"}
                  </span>
                  <span className="truncate text-foreground/90">{f.filename}</span>
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {noChangesYet && (
          <div className="ml-6 text-[12px] text-muted-foreground mb-4 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Everything is up to date.
          </div>
        )}

        {/* CTAs */}
        {onBranch ? (
          <div className="space-y-2">
            {/* "Save in <branch>" publishes a snapshot scoped to the active
                branch — the api-client injects X-Branch-Id, so the existing
                publish() call already writes to the right branch's
                published_versions row. No production effect until the PR
                merges back to default. */}
            <Button
              variant="outline"
              className="w-full h-9 rounded-xl text-[13px] font-medium"
              disabled={publishing || (!hasUnpublishedChanges && !isFirstPublish)}
              onClick={() => {
                onPublish();
                setOpen(false);
              }}
            >
              {publishing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>Save in {branchName}</>
              )}
            </Button>
            <Button
              className="w-full h-9 rounded-xl text-[13px] font-medium bg-foreground text-background hover:bg-foreground/90"
              onClick={() =>
                toast.info("Pull requests are coming soon", {
                  description: `Your changes are saved on “${branchName}”. The PR review and merge flow ships in the next release.`,
                })
              }
            >
              <GitPullRequest className="h-3.5 w-3.5 mr-1.5" />
              Create pull request
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => {
              onPublish();
              setOpen(false);
            }}
            disabled={publishing || (!hasUnpublishedChanges && !isFirstPublish)}
            className="w-full h-9 rounded-xl text-[13px] font-medium bg-emerald-500 hover:bg-emerald-500/90 text-white disabled:opacity-60"
          >
            {publishing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Publishing…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {isFirstPublish ? "Publish" : `Publish v${nextVersion}`}
              </>
            )}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default PublishPopover;
