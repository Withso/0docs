import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  FileText, Layers, ArrowRight, Palette, Sparkles,
  Search, MessageCircle, BarChart3, Globe, Code, Tag, Zap, Shield,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "19 Block Types",
    desc: "Headings, code tabs, accordions, API endpoints, tables, steps, cards & more.",
    color: "bg-platform-accent-soft text-primary",
  },
  {
    icon: Search,
    title: "Global Search",
    desc: "⌘K powered full-text search across all pages, sections, and content.",
    color: "bg-platform-success-soft text-platform-success",
  },
  {
    icon: MessageCircle,
    title: "AI Assistant",
    desc: "Built-in chat widget that answers questions directly from your docs.",
    color: "bg-platform-warning-soft text-platform-warning",
  },
  {
    icon: Code,
    title: "API Documentation",
    desc: "Import OpenAPI specs to auto-generate API reference with endpoint details.",
    color: "bg-platform-accent-soft text-primary",
  },
  {
    icon: BarChart3,
    title: "Analytics & Feedback",
    desc: "Track page views, popular searches, and collect thumbs up/down feedback.",
    color: "bg-platform-success-soft text-platform-success",
  },
  {
    icon: Palette,
    title: "Full Customization",
    desc: "Design tokens for typography, colors, spacing — live preview as you edit.",
    color: "bg-platform-warning-soft text-platform-warning",
  },
  {
    icon: Tag,
    title: "Versioning",
    desc: "Multiple doc versions with a public selector for your readers.",
    color: "bg-platform-accent-soft text-primary",
  },
  {
    icon: Globe,
    title: "SEO Optimized",
    desc: "Auto-generated meta tags, JSON-LD structured data, and canonical URLs.",
    color: "bg-platform-success-soft text-platform-success",
  },
  {
    icon: Zap,
    title: "Visual Builder",
    desc: "WYSIWYG editor — what you see is what your readers get. No YAML or MDX.",
    color: "bg-platform-warning-soft text-platform-warning",
  },
];

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="platform-header">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-platform-sm">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-foreground">DocBuilder</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild size="sm" className="h-9 px-4 text-[13px] rounded-lg">
                <Link to="/dashboard">Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="h-9 px-4 text-[13px] rounded-lg">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="h-9 px-4 text-[13px] rounded-lg">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-24">
          <div className="text-center max-w-2xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-card text-[13px] text-muted-foreground mb-8 shadow-platform-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-powered documentation builder
            </div>
            <h1 className="text-[2.75rem] md:text-[3.5rem] font-bold text-foreground mb-6 tracking-tight leading-[1.1]">
              Build beautiful docs,{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                visually
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              A visual documentation builder with AI search, analytics, API docs, and everything for production-ready documentation.
            </p>
            <div className="mt-10 flex items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 text-[15px] rounded-xl shadow-platform-md">
                <Link to={user ? "/dashboard" : "/auth"}>
                  Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-7 text-[15px] rounded-xl">
                <Link to="/docs/agentation-docs-demo">
                  Live Demo
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={title}
                className="group platform-card p-6 cursor-default animate-fade-in"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-4 ${color} transition-transform duration-200 group-hover:scale-110`}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <h3 className="font-semibold text-foreground text-[15px] mb-1.5">{title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Social proof / CTA */}
        <section className="border-t bg-card">
          <div className="max-w-6xl mx-auto px-6 py-20 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-platform-success" />
              <span className="text-[13px] text-muted-foreground">Trusted by teams building developer tools</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 tracking-tight">
              Ready to build your docs?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              The visual documentation builder for teams who want beautiful docs without writing code.
            </p>
            <Button asChild size="lg" className="h-11 px-6 rounded-xl">
              <Link to={user ? "/dashboard" : "/auth"}>
                Start Building <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
