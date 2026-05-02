import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";
import CodeBlock from "@/components/docs/CodeBlock";
import DocNote from "@/components/docs/DocNote";

const Installation = () => {
  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Installation</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        Install Agentation via your preferred package manager.
      </p>

      <DocSection title="Package Managers">
        <CodeBlock
          language="bash"
          code={`# npm
npm install agentation

# pnpm
pnpm add agentation

# yarn
yarn add agentation

# bun
bun add agentation`}
        />
      </DocSection>

      <DocSection title="CDN">
        <p>You can also include Agentation directly via a CDN for quick prototyping:</p>
        <CodeBlock
          language="html"
          code={`<script src="https://cdn.agentation.dev/v2/agentation.min.js"></script>
<script>
  Agentation.init({ theme: 'auto' });
</script>`}
        />
        <DocNote type="warning">
          CDN usage is not recommended for production. Use a package manager instead for
          tree-shaking and version control.
        </DocNote>
      </DocSection>

      <DocSection title="TypeScript">
        <p>
          Agentation includes TypeScript declarations out of the box. No additional{" "}
          <code className="doc-code-inline">@types</code> package is needed.
        </p>
        <CodeBlock
          language="typescript"
          code={`import type { AgentationConfig, Annotation } from 'agentation';

const config: AgentationConfig = {
  projectId: 'my-project',
  theme: 'light',
  output: 'standard',
};`}
        />
      </DocSection>

      <DocSection title="Verify Installation">
        <p>Run the following to verify everything is working:</p>
        <CodeBlock language="bash" code={`npx agentation --version\n# Expected: agentation v2.3.0`} />
      </DocSection>
    </DocLayout>
  );
};

export default Installation;
