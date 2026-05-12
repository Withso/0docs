import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/lib/api-client";
import ShaderBackground from "@/components/ShaderBackground";

interface LandingProject {
  id: string;
  isHomepage?: boolean;
}

const LogoIcon = () => (
  <svg viewBox="0 0 64 64" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="14" fill="#111111" />
    <path
      d="M32 12c-9.94 0-18 8.95-18 20s8.06 20 18 20 18-8.95 18-20S41.94 12 32 12zm0 8c5.52 0 10 5.37 10 12s-4.48 12-10 12-10-5.37-10-12 4.48-12 10-12z"
      fill="url(#ring)"
    />
    <defs>
      <linearGradient id="ring" x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#B5B5B5" />
      </linearGradient>
    </defs>
  </svg>
);

const DocsMockup = () => (
  <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d1117]">
    <div className="flex-shrink-0 h-9 bg-[#0d1117] border-b border-white/[0.07] flex items-center px-3 gap-2">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      <div className="flex-1 mx-3">
        <div className="mx-auto h-5 rounded-md bg-white/5 flex items-center justify-center max-w-[260px]">
          <span className="text-[10px] text-white/25 font-mono">docs.0docs.dev</span>
        </div>
      </div>
    </div>
    <div className="relative flex-1 w-full overflow-hidden">
      <iframe
        src="/preview-demo"
        className="absolute inset-0 w-full h-full border-0"
        title="0docs live preview"
        tabIndex={-1}
        style={{ pointerEvents: "none" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,13,18,0) 0%, rgba(10,13,18,0.55) 45%, rgba(10,13,18,0.92) 80%, rgba(10,13,18,1) 100%)",
        }}
      />
    </div>
  </div>
);

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const api = useApi();
  const [checkingProjects, setCheckingProjects] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    setCheckingProjects(true);
    (async () => {
      try {
        const projects = await api.get<LandingProject[]>("/projects");
        if (cancelled) return;
        const hasWorkspace = (projects || []).some((p) => !p.isHomepage);
        if (hasWorkspace) {
          setShouldRedirect(true);
          navigate("/builder", { replace: true });
        }
      } catch {
        /* fall through to render Landing as the terminal page */
      } finally {
        if (!cancelled) setCheckingProjects(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  if (loading || (user && (checkingProjects || shouldRedirect))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-background relative flex flex-col">
      <ShaderBackground />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      <header className="relative z-10 flex-shrink-0 h-14 flex items-center justify-between px-6 lg:px-10 border-b border-border/60 backdrop-blur-sm bg-background/70">
        <div className="flex items-center gap-2.5">
          <LogoIcon />
          <span className="font-semibold tracking-tight text-[15px]">0docs</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Withso/0docs"
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3.5 text-[13px] rounded-md inline-flex items-center gap-1.5 font-medium border border-border hover:bg-accent transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            View on GitHub
          </a>
          <button
            onClick={() => navigate("/docs")}
            className="h-8 px-3.5 text-[13px] rounded-md inline-flex items-center font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Learn more
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col overflow-hidden px-6 lg:px-10 pt-8 lg:pt-10 pb-4">
        <div className="flex flex-col items-center text-center flex-shrink-0">
          <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-border/80 bg-background/60 backdrop-blur text-[12px] text-muted-foreground mb-5">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Open source · MIT License
          </div>

          <h1 className="text-[38px] sm:text-[48px] lg:text-[52px] leading-[1.06] font-semibold tracking-[-0.03em] text-foreground mb-4 max-w-[680px]">
            Docs that are open,
            <br />
            <span className="text-muted-foreground">powerful, and yours.</span>
          </h1>

          <p className="text-[15px] lg:text-[16px] text-muted-foreground max-w-[500px] mb-6 leading-relaxed">
            A Mintlify-grade documentation platform you can self-host for free.
            Beautiful reader, visual editor, versioning — all open source.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <a
              href="https://github.com/Withso/0docs"
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-5 rounded-lg inline-flex items-center gap-2 font-medium text-[14px] bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              View on GitHub
            </a>
            <button
              onClick={() => navigate("/docs")}
              className="h-10 px-5 rounded-lg inline-flex items-center gap-2 font-medium text-[14px] border border-border hover:bg-accent transition-colors"
            >
              Learn more
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 mt-6 lg:mt-8 w-full max-w-5xl mx-auto">
          <DocsMockup />
        </div>
      </main>

      <footer className="relative z-10 flex-shrink-0 border-t border-border/60 py-3 px-6 lg:px-10 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>© {new Date().getFullYear()} 0docs</span>
        <span className="hidden sm:inline">Free &amp; open source forever</span>
      </footer>
    </div>
  );
};

export default Landing;
