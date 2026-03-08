import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseOpenAPI, type ParsedOpenAPI } from "@/lib/openapi-parser";
import { Upload, FileJson, AlertCircle, Check } from "lucide-react";

interface OpenAPIImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (parsed: ParsedOpenAPI) => Promise<void>;
}

const OpenAPIImportDialog = ({ open, onOpenChange, onImport }: OpenAPIImportDialogProps) => {
  const [rawInput, setRawInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedOpenAPI | null>(null);
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    setError(null);
    setPreview(null);
    try {
      const parsed = parseOpenAPI(rawInput);
      if (parsed.endpoints.length === 0) {
        setError("No endpoints found in the spec.");
        return;
      }
      setPreview(parsed);
    } catch (e: any) {
      setError(e.message || "Failed to parse OpenAPI spec.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawInput(ev.target?.result as string || "");
      setError(null);
      setPreview(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      await onImport(preview);
      onOpenChange(false);
      setRawInput("");
      setPreview(null);
    } catch (e: any) {
      setError(e.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setRawInput("");
    setError(null);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Import OpenAPI Spec
          </DialogTitle>
          <DialogDescription>
            Paste your OpenAPI 3.x or Swagger 2.x JSON spec, or upload a file. Endpoints will be auto-generated as API blocks.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                <Upload className="h-3.5 w-3.5" />
                Upload file
                <input type="file" accept=".json,.yaml,.yml" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            <textarea
              className="flex-1 min-h-[200px] w-full border rounded-lg p-3 font-mono text-xs bg-muted/30 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={`Paste OpenAPI JSON here...\n\n{\n  "openapi": "3.0.0",\n  "info": { "title": "My API", "version": "1.0" },\n  "paths": { ... }\n}`}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-semibold text-sm">{preview.title}</span>
                <span className="text-xs text-muted-foreground">v{preview.version}</span>
              </div>
              {preview.description && (
                <p className="text-xs text-muted-foreground mb-3">{preview.description}</p>
              )}
              <div className="text-xs text-muted-foreground mb-2">
                {preview.endpoints.length} endpoint{preview.endpoints.length !== 1 ? "s" : ""} across {preview.tags.length} tag{preview.tags.length !== 1 ? "s" : ""}
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {preview.endpoints.map((ep, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] text-white ${
                      ep.method === "GET" ? "bg-green-600" :
                      ep.method === "POST" ? "bg-blue-600" :
                      ep.method === "PUT" ? "bg-yellow-600" :
                      ep.method === "DELETE" ? "bg-red-600" : "bg-purple-600"
                    }`}>{ep.method}</span>
                    <code className="font-mono text-foreground">{ep.path}</code>
                    {ep.summary && <span className="text-muted-foreground truncate">— {ep.summary}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {preview ? (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" size="sm" onClick={() => setPreview(null)}>Back</Button>
              <Button size="sm" onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : `Import ${preview.endpoints.length} endpoints`}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={handleParse} disabled={!rawInput.trim()}>
              Parse spec
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpenAPIImportDialog;
