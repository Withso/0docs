import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";

const FAQ = () => {
  const faqs = [
    {
      q: "Is Agentation free?",
      a: "Yes. Agentation is free for individuals and companies for internal use. Use it to annotate your own projects, debug your own apps, or streamline feedback within your team. Contact us for a commercial license if you're redistributing Agentation as part of a product you sell.",
    },
    {
      q: "Which AI tools does it work with?",
      a: "Agentation works with any AI coding tool that accepts text input — Claude Code, Cursor, GitHub Copilot, Windsurf, and more. MCP integration provides the deepest experience with Claude Code.",
    },
    {
      q: "Does it work with Vue or Angular?",
      a: "Basic annotation works with any web framework. React-specific features like component tree detection are currently React-only. Vue support is partially available, and Angular/Svelte are planned for v3.0.",
    },
    {
      q: "Can I use it in production?",
      a: "By default, Agentation only loads in development mode. You can enable it in production for internal QA teams by setting AGENTATION_ENABLED=true, but it's not recommended for end users.",
    },
    {
      q: "How does MCP work?",
      a: "MCP (Model Context Protocol) creates a bidirectional channel between the Agentation toolbar and your AI agent. Instead of copy-pasting annotations, the agent can directly read and respond to feedback in real-time.",
    },
    {
      q: "Is my data sent to any server?",
      a: "No. All annotation data stays on your local machine. The HTTP and MCP servers run on localhost. Nothing is sent externally unless you configure webhooks.",
    },
  ];

  return (
    <DocLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">FAQ</h1>
      <p className="doc-prose text-muted-foreground mb-8">
        Frequently asked questions about Agentation.
      </p>

      {faqs.map((faq, i) => (
        <DocSection key={i} title={faq.q}>
          <p>{faq.a}</p>
        </DocSection>
      ))}
    </DocLayout>
  );
};

export default FAQ;
