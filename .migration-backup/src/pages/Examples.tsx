import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";
import CodeBlock from "@/components/docs/CodeBlock";

const Examples = () => {
  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Examples</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        Real-world examples and common integration patterns.
      </p>

      <DocSection title="React Integration">
        <CodeBlock
          language="tsx"
          code={`import { useAgentation } from 'agentation/react';

function App() {
  const { annotations, isActive } = useAgentation();

  return (
    <div>
      <h1>My App</h1>
      {isActive && (
        <div className="annotation-count">
          {annotations.length} annotations
        </div>
      )}
    </div>
  );
}`}
        />
      </DocSection>

      <DocSection title="Webhook Handler">
        <CodeBlock
          language="typescript"
          code={`// Express webhook handler
app.post('/webhooks/agentation', (req, res) => {
  const { event, annotation } = req.body;
  
  switch (event) {
    case 'annotation.created':
      // Create a GitHub issue
      createIssue(annotation);
      break;
    case 'annotation.resolved':
      // Close the issue
      closeIssue(annotation.id);
      break;
  }
  
  res.status(200).json({ received: true });
});`}
        />
      </DocSection>

      <DocSection title="CI/CD Integration">
        <CodeBlock
          language="yaml"
          code={`# .github/workflows/agentation.yml
name: Process Annotations
on:
  workflow_dispatch:
    inputs:
      annotation_id:
        description: 'Annotation ID to process'
        required: true

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx agentation resolve \${{ inputs.annotation_id }}`}
        />
      </DocSection>

      <DocSection title="Embedded Preview">
        <p>Here's a live embedded example:</p>
        <div className="rounded-lg overflow-hidden border mb-4 aspect-video">
          <iframe
            src="https://codesandbox.io/embed/new?codemirror=1"
            width="100%"
            height="100%"
            title="CodeSandbox"
            className="border-0"
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          />
        </div>
      </DocSection>
    </DocLayout>
  );
};

export default Examples;
