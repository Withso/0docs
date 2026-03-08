import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, Layers, Eye, ArrowRight } from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground">DocBuilder</span>
          <div>
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
            Build beautiful documentation
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A visual, no-code documentation builder. Create clean, structured docs with a WYSIWYG editor — what you see is what your readers get.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to={user ? "/dashboard" : "/auth"}>
                Get Started <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
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
              icon: Eye,
              title: "WYSIWYG Editing",
              desc: "Edit inline — the builder looks exactly like the published documentation.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border rounded-lg p-5">
              <Icon className="h-5 w-5 text-foreground mb-3" />
              <h3 className="font-medium text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
