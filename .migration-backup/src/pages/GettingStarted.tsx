import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";
import CodeBlock from "@/components/docs/CodeBlock";
import DocNote from "@/components/docs/DocNote";

const GettingStarted = () => {
  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Getting Started</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        Get up and running with Agentation in under 5 minutes.
      </p>

      <DocSection title="Prerequisites">
        <ul>
          <li>Node.js 18 or higher</li>
          <li>A modern browser (Chrome, Firefox, Safari, Edge)</li>
          <li>An AI coding tool (Claude Code, Cursor, Copilot, etc.)</li>
        </ul>
      </DocSection>

      <DocSection title="Quick Start">
        <p>1. Install the package</p>
        <CodeBlock
          language="bash"
          code={`npm install agentation
# or
pnpm add agentation`}
        />

        <p>2. Add to your project</p>
        <CodeBlock
          language="typescript"
          code={`import { Agentation } from 'agentation';

// Initialize with default settings
const agent = new Agentation({
  projectId: 'my-project',
  theme: 'auto',
});

// Start the annotation toolbar
agent.start();`}
        />

        <p>3. Open your app in the browser and click the toolbar icon</p>

        <DocNote>
          The toolbar only appears in development mode by default. See{" "}
          <a href="/configuration">Configuration</a> for production options.
        </DocNote>
      </DocSection>

      <DocSection title="Video Walkthrough">
        <div className="rounded-lg overflow-hidden border mb-4 aspect-video bg-secondary flex items-center justify-center">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="Getting Started with Agentation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="border-0"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          A 3-minute walkthrough of the core features.
        </p>
      </DocSection>

      <DocSection title="Framework Support">
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Framework</th>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">React</td>
                <td className="py-2 pr-4"><span className="text-green-600">✓ Full support</span></td>
                <td className="py-2 text-muted-foreground">Component tree detection</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">Next.js</td>
                <td className="py-2 pr-4"><span className="text-green-600">✓ Full support</span></td>
                <td className="py-2 text-muted-foreground">App & Pages router</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">Vue</td>
                <td className="py-2 pr-4"><span className="text-yellow-600">◐ Partial</span></td>
                <td className="py-2 text-muted-foreground">No component tree yet</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Svelte</td>
                <td className="py-2 pr-4"><span className="text-muted-foreground">◯ Planned</span></td>
                <td className="py-2 text-muted-foreground">Coming in v3.0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DocSection>
    </DocLayout>
  );
};

export default GettingStarted;
