import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, Layers, Eye, ArrowRight, Palette, Sparkles } from "lucide-react";

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

      <main className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-accent text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3" /> Visual documentation builder
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-5 tracking-tight leading-[1.15]">
            Build beautiful<br />documentation
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            A visual, no-code documentation builder. Create clean, structured docs 
            with a WYSIWYG editor — what you see is what your readers get.
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

        <div className="grid sm:grid-cols-3 gap-4 animate-fade-in">
          {[
            {
              icon: FileText,
              title: "Pages & Sections",
              desc: "Organize content into pages with multiple sections, each with any type of block.",
            },
            {
              icon: Layers,
              title: "Rich Blocks",
              desc: "Headings, paragraphs, code blocks, images, videos, lists, notes, and callouts.",
            },
            {
              icon: Palette,
              title: "Design Tokens",
              desc: "Customize typography, colors, spacing, and per-block styles with a visual inspector.",
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
      </main>
    </div>
  );
};

export default Index;
