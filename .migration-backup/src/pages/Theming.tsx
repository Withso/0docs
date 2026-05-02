import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";
import CodeBlock from "@/components/docs/CodeBlock";

const Theming = () => {
  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Theming</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        Customize the look and feel of the annotation toolbar.
      </p>

      <DocSection title="Built-in Themes">
        <p>Agentation ships with three built-in themes:</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { name: "Light", bg: "bg-background", text: "text-foreground", border: "border" },
            { name: "Dark", bg: "bg-foreground", text: "text-background", border: "border-foreground/20" },
            { name: "Auto", bg: "bg-secondary", text: "text-foreground", border: "border" },
          ].map((theme) => (
            <div key={theme.name} className={`${theme.bg} ${theme.text} ${theme.border} border rounded-lg p-4 text-center text-sm font-medium`}>
              {theme.name}
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection title="Custom CSS">
        <p>Override any toolbar style with CSS custom properties:</p>
        <CodeBlock
          language="css"
          code={`:root {
  --agentation-bg: #1a1a1a;
  --agentation-fg: #ffffff;
  --agentation-accent: #4a9eff;
  --agentation-border: #333;
  --agentation-radius: 8px;
  --agentation-font: 'Inter', sans-serif;
}`}
        />
      </DocSection>

      <DocSection title="Marker Colors">
        <p>Customize annotation marker colors:</p>
        <div className="flex gap-3 mb-4">
          {["#4a9eff", "#ff6b35", "#22c55e", "#eab308", "#ef4444", "#8b5cf6"].map((color) => (
            <div
              key={color}
              className="w-8 h-8 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <CodeBlock
          language="typescript"
          code={`agent.configure({
  markerColor: '#4a9eff',  // any valid CSS color
});`}
        />
      </DocSection>
    </DocLayout>
  );
};

export default Theming;
