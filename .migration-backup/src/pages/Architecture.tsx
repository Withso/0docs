import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";
import CodeBlock from "@/components/docs/CodeBlock";

const Architecture = () => {
  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Architecture</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        How Agentation connects browsers, servers, and AI agents.
      </p>

      <DocSection title="System Overview">
        <p>
          Agentation runs as a three-part system: a browser toolbar, an HTTP/MCP server,
          and your AI agent. Each component communicates through structured annotation data.
        </p>

        <div className="flex items-center justify-center gap-4 my-8 text-sm flex-wrap">
          {["Browser", "HTTP", "MCP", "AI Agent"].map((label, i) => (
            <div key={label} className="flex items-center gap-4">
              <div className="border rounded-lg px-5 py-3 text-center">
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {["Toolbar", "Server", "Server", "Claude"][i]}
                </div>
              </div>
              {i < 3 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>

        <CodeBlock code={`toolbar  →  server  →  agent`} />
      </DocSection>

      <DocSection title="Data Flow">
        <ol>
          <li>User clicks an element in the browser toolbar</li>
          <li>Toolbar captures CSS selector, component tree, computed styles</li>
          <li>Annotation is POSTed to the HTTP server at <code className="doc-code-inline">/annotations</code></li>
          <li>Server stores annotation and notifies MCP clients</li>
          <li>AI agent calls <code className="doc-code-inline">get_pending</code> to retrieve new annotations</li>
          <li>Agent processes feedback and responds with code changes</li>
        </ol>
      </DocSection>

      <DocSection title="Annotation Schema">
        <CodeBlock
          language="typescript"
          code={`interface Annotation {
  id: string;
  timestamp: number;
  element: {
    selector: string;
    xpath: string;
    rect: DOMRect;
    computedStyles: Record<string, string>;
  };
  component?: {
    name: string;
    file: string;
    line: number;
    props: Record<string, unknown>;
  };
  feedback: {
    text: string;
    priority: 'low' | 'medium' | 'high';
    type: 'bug' | 'improvement' | 'question';
  };
  metadata: {
    url: string;
    viewport: { width: number; height: number };
    userAgent: string;
  };
}`}
        />
      </DocSection>

      <DocSection title="Embedded Diagram">
        <p>Below is an interactive architecture diagram:</p>
        <div className="rounded-lg overflow-hidden border mb-4 aspect-video bg-secondary flex items-center justify-center">
          <iframe
            src="https://excalidraw.com"
            width="100%"
            height="100%"
            title="Architecture Diagram"
            className="border-0"
          />
        </div>
      </DocSection>
    </DocLayout>
  );
};

export default Architecture;
