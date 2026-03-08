import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  FileText, Layers, ArrowRight, Palette, Sparkles,
  Search, MessageCircle, BarChart3, Globe, Code, Tag,
} from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="platform-header">
        <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">DocBuilder</span>
          </div>
          <div>
            {user ? (
              <Button asChild size="sm" className="h-8 text-xs">
                <Link to="/dashboard">Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="h-8 text-xs">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-24">
        {/* Hero */}
        <div className="text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-accent text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3" /> AI-powered documentation builder
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-5 tracking-tight leading-[1.15]">
            Build beautiful docs<br />without writing code
          </h1>
          <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            A visual documentation builder with AI-powered search, analytics, 
            API docs, versioning, and everything you need for production-ready documentation.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="h-11 px-6">
              <Link to={user ? "/dashboard" : "/auth"}>
                Get Started <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6">
              <Link to="/docs/agentation-docs-demo">
                View Demo
              </Link>
            </Button>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {[
            {
              icon: Layers,
              title: "19 Block Types",
              desc: "Headings, code blocks, tabs, accordions, API endpoints, tables, steps, cards, and more.",
            },
            {
              icon: Search,
              title: "Global Search",
              desc: "⌘K powered full-text search across all pages, sections, and content blocks.",
            },
            {
              icon: MessageCircle,
              title: "AI Assistant",
              desc: "Built-in Ask Docs chat widget powered by AI that answers questions from your documentation.",
            },
            {
              icon: Code,
              title: "API Documentation",
              desc: "Import OpenAPI specs to auto-generate API reference pages with endpoint details.",
            },
            {
              icon: BarChart3,
              title: "Analytics & Feedback",
              desc: "Track page views, search queries, and collect user feedback with thumbs up/down.",
            },
            {
              icon: Palette,
              title: "Full Customization",
              desc: "Design tokens for typography, colors, spacing — plus per-block styling overrides.",
            },
            {
              icon: Tag,
              title: "Versioning",
              desc: "Multiple documentation versions with a public version selector for readers.",
            },
            {
              icon: Globe,
              title: "SEO Optimized",
              desc: "Auto-generated meta tags, JSON-LD structured data, and canonical URLs.",
            },
            {
              icon: FileText,
              title: "Visual Builder",
              desc: "WYSIWYG editor — what you see is exactly what your readers get. No YAML or MDX.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="platform-card">
              <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center mb-3">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-20 animate-fade-in">
          <p className="text-sm text-muted-foreground mb-4">
            The visual documentation builder for teams who want beautiful docs without writing code.
          </p>
          <Button asChild size="sm">
            <Link to={user ? "/dashboard" : "/auth"}>
              Start Building <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;
