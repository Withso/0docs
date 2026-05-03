import { Link } from "react-router-dom";
import { BarChart3, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsContentProps {
  projectName?: string;
  projectSlug?: string;
}

const AnalyticsContent = ({ projectName, projectSlug }: AnalyticsContentProps) => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-9 w-9 rounded-xl bg-platform-accent-soft flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight">Analytics</h1>
      </div>
      <p className="text-[13px] text-muted-foreground mb-8">
        Page views, search queries, and feedback for {projectName || "your project"}.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {[
          { label: "Total views", value: "—" },
          { label: "Avg. time on page", value: "—" },
          { label: "Helpful votes", value: "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              {s.label}
            </div>
            <div className="text-[22px] font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="zdocs-editor-dashed rounded-xl p-10 text-center">
        <p className="text-[13px] text-muted-foreground mb-4">
          Detailed analytics dashboards arrive in Phase 2. For now, raw data is captured in the
          backend.
        </p>
        {projectSlug && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/docs/${projectSlug}`} target="_blank">
              View live docs <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default AnalyticsContent;
