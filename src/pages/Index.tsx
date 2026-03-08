import DocLayout from "@/components/docs/DocLayout";
import DocSection from "@/components/docs/DocSection";
import CodeBlock from "@/components/docs/CodeBlock";
import DocNote from "@/components/docs/DocNote";
import DocCalloutLink from "@/components/docs/DocCalloutLink";

const Index = () => {
  return (
    <DocLayout>
      <h1 className="text-3xl font-bold text-foreground mb-1 leading-tight">
        Point at bugs.
        <br />
        Let AI <span className="underline decoration-doc-section decoration-2 underline-offset-4">fix them</span>.
      </h1>

      <div className="flex items-center gap-3 mb-8 mt-4">
        <div className="doc-code-inline text-xs">npm install agentation</div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>

      <p className="doc-prose mb-6">
        Agentation turns UI annotations into structured context that AI coding agents
        can understand and act on. Click any element, add a note, and paste the output
        into Claude Code, Cursor, or any AI tool.
      </p>

      <DocSection title="How you use it">
        <ol>
          <li>Click the toolbar icon in the bottom-right corner to activate</li>
          <li><strong>Hover</strong> over elements to see their names highlighted</li>
          <li><strong>Click</strong> any element to add an annotation</li>
          <li>Write your feedback and click <strong>Add</strong></li>
          <li>Click the copy icon to copy formatted markdown</li>
          <li>Paste into your agent</li>
        </ol>

        <DocNote type="tip">
          With <a href="/mcp">MCP</a>, you can skip the copy-paste step entirely — your agent already sees
          what you're pointing at. Just say "address my feedback" or "fix annotation 3."
        </DocNote>
      </DocSection>

      <DocSection title="How agents use it">
        <p>
          Agentation works best with AI tools that have access to your codebase (Claude
          Code, Cursor, etc.). When you paste the output, agents get:
        </p>
        <ul>
          <li><strong>CSS selectors</strong> to grep your codebase</li>
          <li><strong>Source file paths</strong> to jump directly to the right line</li>
          <li><strong>React component tree</strong> to understand the hierarchy</li>
          <li><strong>Computed styles</strong> to understand current appearance</li>
          <li><strong>Your feedback</strong> with intent and priority</li>
        </ul>
        <p>
          Without Agentation, you'd have to describe the element ("the blue button in the sidebar")
          and hope the agent guesses right. With Agentation, you give it{" "}
          <code className="doc-code-inline">.sidebar &gt; button.primary</code> and it can grep for
          that directly.
        </p>
      </DocSection>

      <DocSection title="Demo">
        <p>The toolbar is active on this page. Try annotating these demo elements:</p>

        <div className="flex gap-3 mb-6 flex-wrap">
          <button className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium">
            Primary
          </button>
          <button className="px-4 py-2 rounded-lg border text-sm font-medium text-foreground">
            Secondary
          </button>
          <button className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground">
            Modal
          </button>
          <button className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground shadow-lg">
            Shadow Modal
          </button>
        </div>

        <div className="border rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-sm mb-2">Example Card</h3>
          <p className="text-sm text-muted-foreground">
            Click on this card or select this text to create an annotation. The output will
            include the element path and your feedback.
          </p>
        </div>
      </DocSection>

      <DocSection title="Agents talk back">
        <p>
          With MCP integration and the Annotation Format Schema, agents don't just read your
          annotations — they can respond to them:
        </p>
        <ul>
          <li><strong>"What annotations do I have?"</strong> — List all feedback across pages</li>
          <li><strong>"Should this be 24px or 16px?"</strong> — Agent asks for clarification</li>
          <li><strong>"Fixed the padding"</strong> — Agent resolves with a summary</li>
          <li><strong>"Clear all annotations"</strong> — Dismiss everything at once</li>
        </ul>
        <p>Your feedback becomes a conversation, not a one-way ticket into the void.</p>
      </DocSection>

      <DocSection title="Best practices">
        <ul>
          <li><strong>Be specific</strong> — "Button text unclear" is better than "fix this"</li>
          <li><strong>One issue per annotation</strong> — easier for the agent to address individually</li>
          <li><strong>Include context</strong> — mention what you expected vs. what you see</li>
          <li><strong>Use text selection</strong> — for typos or content issues, select the exact text</li>
          <li><strong>Pause animations</strong> — to annotate a specific animation frame</li>
        </ul>
      </DocSection>

      <div className="space-y-1 mt-10 border-t pt-6">
        <DocCalloutLink to="/getting-started">Get started with installation</DocCalloutLink>
        <DocCalloutLink to="/api">Build your own integration with the API</DocCalloutLink>
        <DocCalloutLink to="/examples">View example projects</DocCalloutLink>
      </div>
    </DocLayout>
  );
};

export default Index;
