import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient gradient mesh */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.35]"
        style={{
          background:
            "radial-gradient(800px 500px at 12% 0%, hsl(220 90% 60% / 0.08), transparent 60%), radial-gradient(700px 500px at 88% 100%, hsl(152 70% 45% / 0.06), transparent 60%)",
        }}
      />
      {/* Subtle dotted grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      <header className="relative z-10 h-14 flex items-center justify-between px-6 lg:px-8 border-b border-border/60 backdrop-blur-sm bg-background/70">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-foreground text-background grid place-items-center text-[12px] font-bold tracking-tight">
            0
          </div>
          <span className="font-semibold tracking-tight text-[15px]">0docs</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/docs")}
            className="hidden sm:inline-flex h-8 px-3 text-[13px] rounded-md items-center font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Documentation
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="h-8 px-3.5 text-[13px] rounded-md inline-flex items-center gap-1.5 font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <LogIn className="h-3.5 w-3.5" /> Sign In
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-[920px] mx-auto px-6 lg:px-8 pt-20 pb-20 lg:pt-32">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-border/80 bg-background/60 backdrop-blur text-[12px] text-muted-foreground mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Documentation, beautifully built
          </div>
          <h1 className="text-[44px] sm:text-[56px] leading-[1.05] font-semibold tracking-[-0.03em] text-foreground mb-5 max-w-[720px]">
            Beautiful documentation,
            <br />
            <span className="text-muted-foreground">crafted with care.</span>
          </h1>
          <p className="text-[17px] text-muted-foreground max-w-[540px] mb-10 leading-relaxed">
            0docs gives your team a Mintlify-grade documentation builder —
            powerful editor, themable design system, and a reading experience
            your users will love.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => navigate("/auth")}
              className="h-11 px-5 rounded-lg inline-flex items-center gap-2 font-medium text-[14px] bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-4 w-4" /> Get started
            </button>
            <button
              onClick={() => navigate("/docs")}
              className="h-11 px-5 rounded-lg inline-flex items-center gap-2 font-medium text-[14px] border border-border hover:bg-accent transition-colors"
            >
              Learn more
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-24">
          {[
            {
              title: "Visual editor",
              desc: "Write content in a polished WYSIWYG editor with code, tabs, callouts, and components.",
            },
            {
              title: "Themable design",
              desc: "Pick from curated themes or fully customize colors, type, and spacing.",
            },
            {
              title: "Publish & version",
              desc: "Snapshot versions, revert anytime, and ship updates with one click.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border/80 bg-card/40 backdrop-blur p-5 hover:border-border transition-colors"
            >
              <div className="text-[14px] font-semibold tracking-tight mb-1.5">
                {f.title}
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-5 px-6 lg:px-8 flex items-center justify-between text-[12px] text-muted-foreground">
        <span>© {new Date().getFullYear()} 0docs</span>
        <span className="hidden sm:inline">Built for teams that ship</span>
      </footer>
    </div>
  );
};

export default Landing;
