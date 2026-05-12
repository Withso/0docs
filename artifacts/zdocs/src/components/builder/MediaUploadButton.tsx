import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaUploadButtonProps {
  /** Allowed MIME prefixes, e.g. ["image/"], ["video/"], or ["image/", "video/"]. */
  accept: string;
  /** Called with the public URL after a successful upload. */
  onUploaded: (url: string) => void;
  label?: string;
}

/**
 * File-picker button that uploads to /api/uploads and hands the returned
 * URL back to the parent. ProjectId is read from the current route so
 * any block editor inside /builder/:projectId/... can drop this in
 * without threading props.
 */
export function MediaUploadButton({
  accept,
  onUploaded,
  label = "Upload",
}: MediaUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { projectId } = useParams<{ projectId: string }>();
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function handleFile(file: File) {
    if (!projectId) {
      toast({
        title: "Cannot upload",
        description: "No project context — open this from a project's editor.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const qs = new URLSearchParams({
        projectId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
      });
      const res = await fetch(`/api/uploads?${qs.toString()}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Upload failed (${res.status}).`);
      }
      const data = (await res.json()) as { url: string };
      onUploaded(data.url);
    } catch (e) {
      toast({
        title: "Upload failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-[12px] font-medium hover:bg-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {busy ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
    </>
  );
}
