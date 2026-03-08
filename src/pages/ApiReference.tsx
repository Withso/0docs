import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";
import CodeBlock from "@/components/docs/CodeBlock";

const ApiReference = () => {
  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">API Reference</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        Complete API documentation for the Agentation HTTP server.
      </p>

      <DocSection title="Base URL">
        <CodeBlock code={`http://localhost:3001/api/v1`} />
      </DocSection>

      <DocSection title="POST /annotations">
        <p>Create a new annotation.</p>
        <CodeBlock
          language="json"
          code={`{
  "element": {
    "selector": ".sidebar > button.primary",
    "xpath": "/html/body/div[1]/aside/button[2]"
  },
  "feedback": {
    "text": "Button text is unclear",
    "priority": "high",
    "type": "bug"
  }
}`}
        />
        <p>Response:</p>
        <CodeBlock
          language="json"
          code={`{
  "id": "ann_abc123",
  "status": "pending",
  "created_at": "2025-03-08T10:00:00Z"
}`}
        />
      </DocSection>

      <DocSection title="GET /annotations">
        <p>List all annotations for the current project.</p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Parameter</th>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4"><code className="doc-code-inline text-xs">status</code></td>
                <td className="py-2 pr-4 text-muted-foreground">string</td>
                <td className="py-2 text-muted-foreground">Filter by status: pending, resolved, dismissed</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4"><code className="doc-code-inline text-xs">page</code></td>
                <td className="py-2 pr-4 text-muted-foreground">number</td>
                <td className="py-2 text-muted-foreground">Page number for pagination</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><code className="doc-code-inline text-xs">limit</code></td>
                <td className="py-2 pr-4 text-muted-foreground">number</td>
                <td className="py-2 text-muted-foreground">Results per page (max 100)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection title="DELETE /annotations/:id">
        <p>Remove a specific annotation.</p>
        <CodeBlock
          language="bash"
          code={`curl -X DELETE http://localhost:3001/api/v1/annotations/ann_abc123`}
        />
      </DocSection>
    </DocLayout>
  );
};

export default ApiReference;
