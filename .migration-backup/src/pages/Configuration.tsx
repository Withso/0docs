import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";
import CodeBlock from "@/components/docs/CodeBlock";

const Configuration = () => {
  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Configuration</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        Customize Agentation's behavior with configuration options.
      </p>

      <DocSection title="Configuration File">
        <p>
          Create an <code className="doc-code-inline">agentation.config.ts</code> file in your
          project root:
        </p>
        <CodeBlock
          language="typescript"
          code={`import { defineConfig } from 'agentation';

export default defineConfig({
  projectId: 'my-project',
  
  // UI settings
  theme: 'auto',           // 'light' | 'dark' | 'auto'
  position: 'bottom-right', // toolbar position
  hotkey: 'ctrl+shift+a',   // activation shortcut
  
  // Output settings
  output: {
    detail: 'standard',     // 'minimal' | 'standard' | 'verbose'
    includeStyles: true,
    includeReactTree: true,
    includeSourceMap: true,
  },
  
  // MCP integration
  mcp: {
    enabled: true,
    port: 3001,
  },
});`}
        />
      </DocSection>

      <DocSection title="Environment Variables">
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Variable</th>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Default</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4"><code className="doc-code-inline text-xs">AGENTATION_ENABLED</code></td>
                <td className="py-2 pr-4 text-muted-foreground">true</td>
                <td className="py-2 text-muted-foreground">Enable/disable toolbar</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4"><code className="doc-code-inline text-xs">AGENTATION_MCP_PORT</code></td>
                <td className="py-2 pr-4 text-muted-foreground">3001</td>
                <td className="py-2 text-muted-foreground">MCP server port</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><code className="doc-code-inline text-xs">AGENTATION_THEME</code></td>
                <td className="py-2 pr-4 text-muted-foreground">auto</td>
                <td className="py-2 text-muted-foreground">Force theme override</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection title="Keyboard Shortcuts">
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          {[
            ["P", "Pause animations"],
            ["H", "Hide markers"],
            ["C", "Copy feedback"],
            ["S", "Send annotations"],
            ["X", "Clear all"],
            ["Esc", "Exit toolbar"],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3">
              <kbd className="doc-code-inline text-xs font-mono min-w-[28px] text-center">{key}</kbd>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </DocSection>
    </DocLayout>
  );
};

export default Configuration;
