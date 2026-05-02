import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";

const Components = () => {
  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Components</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        Interactive UI components available in the documentation system.
      </p>

      <DocSection title="Buttons">
        <p>Various button styles used across the documentation:</p>
        <div className="flex gap-3 mb-6 flex-wrap">
          <button className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium">
            Primary
          </button>
          <button className="px-4 py-2 rounded-lg border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            Secondary
          </button>
          <button className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium text-muted-foreground">
            Ghost
          </button>
          <button className="px-3 py-1.5 rounded-md border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            Small
          </button>
        </div>
      </DocSection>

      <DocSection title="Cards">
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          {[
            { title: "Annotation Card", desc: "Display user feedback with element context" },
            { title: "Metric Card", desc: "Show numerical data with labels and trends" },
            { title: "Status Card", desc: "Indicate system or connection status" },
            { title: "Action Card", desc: "Clickable cards that trigger workflows" },
          ].map((card) => (
            <div key={card.title} className="border rounded-lg p-4 hover:border-foreground/20 transition-colors">
              <h3 className="font-medium text-sm mb-1">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.desc}</p>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection title="Form Elements">
        <div className="space-y-4 max-w-sm mb-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Project Name</label>
            <input
              type="text"
              placeholder="my-project"
              className="w-full px-3 py-2 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <textarea
              placeholder="Describe your project..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/10 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="enable-mcp" className="rounded" />
            <label htmlFor="enable-mcp" className="text-sm">Enable MCP integration</label>
          </div>
        </div>
      </DocSection>

      <DocSection title="Image Example">
        <div className="rounded-lg overflow-hidden border mb-4">
          <img
            src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=680&h=400&fit=crop"
            alt="Code on a screen"
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Images are rendered with lazy loading and responsive sizing.
        </p>
      </DocSection>
    </DocLayout>
  );
};

export default Components;
