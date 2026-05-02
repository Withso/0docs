import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";

const Changelog = () => {
  const entries = [
    {
      version: "v2.3.0",
      date: "March 2025",
      changes: [
        "Added animation pause mode for annotating specific frames",
        "New keyboard shortcuts for all toolbar actions",
        "Improved component tree detection for React 19",
        "Fixed marker positioning on scrolled pages",
      ],
    },
    {
      version: "v2.2.0",
      date: "February 2025",
      changes: [
        "Webhook support for external integrations",
        "Custom marker colors in settings",
        "Block page interactions mode during annotation",
        "Performance improvements for large DOMs",
      ],
    },
    {
      version: "v2.1.0",
      date: "January 2025",
      changes: [
        "MCP server for real-time agent sync",
        "Agent response annotations",
        "Self-driving mode (experimental)",
        "Critique mode for automated feedback",
      ],
    },
    {
      version: "v2.0.0",
      date: "December 2024",
      changes: [
        "Complete rewrite with TypeScript",
        "Real-time agent sync via MCP",
        "New annotation format schema",
        "Breaking: deprecated v1 output format",
      ],
    },
  ];

  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Changelog</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        All notable changes to this project.
      </p>

      {entries.map((entry) => (
        <DocSection key={entry.version} title={`${entry.version} — ${entry.date}`}>
          <ul>
            {entry.changes.map((change, i) => (
              <li key={i}>{change}</li>
            ))}
          </ul>
        </DocSection>
      ))}
    </DocLayout>
  );
};

export default Changelog;
