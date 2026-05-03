import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3, ArrowUpRight, Calendar, ArrowUp, ArrowDown, Minus, Globe, Bot, User as UserIcon,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AnalyticsContentProps {
  projectId?: string;
  projectName?: string;
  projectSlug?: string;
}

interface AnalyticsResponse {
  audience: "humans" | "agents";
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  project: {
    id: string;
    slug: string;
    customDomain: string | null;
    customDomainStatus: string | null;
    customDomainBasePath: string | null;
  };
  totals: {
    visitors: number; views: number; searches: number; assistant: number;
    feedback: number; helpfulYes: number; helpfulNo: number;
  };
  previousTotals: AnalyticsResponse["totals"];
  daily: Array<{ day: string; visitors: number; views: number }>;
  topPages: Array<{ path: string; views: number }>;
  topReferrers: Array<{ referrer: string; views: number }>;
  hosts: string[];
}

type Audience = "humans" | "agents";
type Preset = { label: string; days: number };

const PRESETS: Preset[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function pctDelta(current: number, previous: number): number | null {
  if (!previous && !current) return null;
  if (!previous) return null; // avoid divide-by-zero / "infinity" deltas
  return ((current - previous) / previous) * 100;
}

function DeltaPill({ delta }: { delta: number | null }) {
  if (delta == null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const positive = delta >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-medium",
      positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
    )}>
      <Icon className="h-3 w-3" />
      {Math.abs(delta).toFixed(1)}% vs previous
    </span>
  );
}

function StatCard({
  label, value, delta, hint,
}: { label: string; value: number; delta: number | null; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-4 bg-card/30">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-[26px] font-semibold leading-tight tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="mt-2"><DeltaPill delta={delta} /></div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function HostBanner({ project, hosts }: {
  project: AnalyticsResponse["project"];
  hosts: string[];
}) {
  const customConnected = !!project.customDomain && project.customDomainStatus === "verified";
  const fallbackUrl = `${typeof window !== "undefined" ? window.location.host : "your-site"}/p/${project.slug}`;
  const trackedHost = customConnected ? project.customDomain : fallbackUrl;
  const seen = hosts.filter(Boolean);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 flex flex-wrap items-center gap-2 text-[12px]">
      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">Tracking traffic on</span>
      <code className="px-1.5 py-0.5 rounded bg-background border border-border/60 text-[11.5px]">
        {trackedHost}
      </code>
      {customConnected ? (
        <span className="text-muted-foreground">— your connected custom domain.</span>
      ) : (
        <span className="text-muted-foreground">
          — no custom domain connected, so we fall back to your default URL.
        </span>
      )}
      {seen.length > 1 && (
        <span className="text-muted-foreground ml-auto">
          Recent hosts: {seen.slice(0, 3).map((h) => (
            <code key={h} className="ml-1 px-1 py-0.5 rounded bg-background border border-border/60 text-[11px]">{h}</code>
          ))}
        </span>
      )}
    </div>
  );
}

const AnalyticsContent = ({ projectId, projectName, projectSlug }: AnalyticsContentProps) => {
  const [audience, setAudience] = useState<Audience>("humans");
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const to = new Date();
    const from = subDays(to, preset.days);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [preset.days]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true); setError(null);
    const params = new URLSearchParams({
      from: range.from, to: range.to, audience,
    });
    fetch(`/api/projects/${projectId}/analytics?${params.toString()}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return (await r.json()) as AnalyticsResponse;
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, range.from, range.to, audience]);

  // Dense the daily series so the chart renders an even bar per day
  // even when some days had zero visitors. Rechart's BarChart otherwise
  // skips missing days and produces a misleading sparse axis.
  const chartData = useMemo(() => {
    const map = new Map<string, { visitors: number; views: number }>();
    (data?.daily || []).forEach((d) => map.set(d.day, { visitors: d.visitors, views: d.views }));
    const out: Array<{ day: string; visitors: number; views: number; isToday: boolean }> = [];
    const today = new Date();
    for (let i = preset.days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, "yyyy-MM-dd");
      const v = map.get(key) || { visitors: 0, views: 0 };
      out.push({ day: key, ...v, isToday: i === 0 });
    }
    return out;
  }, [data?.daily, preset.days]);

  const t = data?.totals;
  const p = data?.previousTotals;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-9 w-9 rounded-xl bg-platform-accent-soft flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight">Analytics</h1>
      </div>
      <p className="text-[13px] text-muted-foreground mb-5">
        Visitors, views, search queries, assistant chats, and feedback for {projectName || "your project"}.
      </p>

      {/* Host banner */}
      {data && (
        <div className="mb-5">
          <HostBanner project={data.project} hosts={data.hosts} />
        </div>
      )}

      {/* Tabs + range picker */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex rounded-lg border border-border/60 p-0.5 bg-card/30">
          <button
            onClick={() => setAudience("humans")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] rounded-md transition-colors",
              audience === "humans" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserIcon className="h-3.5 w-3.5" /> Humans
          </button>
          <button
            onClick={() => setAudience("agents")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 h-8 text-[12.5px] rounded-md transition-colors",
              audience === "agents" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Bot className="h-3.5 w-3.5" /> Agents
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-8">
              <Calendar className="h-3.5 w-3.5" />
              {preset.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PRESETS.map((p) => (
              <DropdownMenuItem key={p.days} onClick={() => setPreset(p)}>
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 text-rose-600 dark:text-rose-400 px-3 py-2 text-[12.5px] mb-4">
          {error}
        </div>
      )}

      {/* Stat cards */}
      {audience === "humans" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatCard label="Visitors" value={t?.visitors ?? 0} delta={pctDelta(t?.visitors ?? 0, p?.visitors ?? 0)} />
          <StatCard label="Views" value={t?.views ?? 0} delta={pctDelta(t?.views ?? 0, p?.views ?? 0)} />
          <StatCard label="Assistant" value={t?.assistant ?? 0} delta={pctDelta(t?.assistant ?? 0, p?.assistant ?? 0)} />
          <StatCard label="Searches" value={t?.searches ?? 0} delta={pctDelta(t?.searches ?? 0, p?.searches ?? 0)} />
          <StatCard
            label="Feedback"
            value={t?.feedback ?? 0}
            delta={pctDelta(t?.feedback ?? 0, p?.feedback ?? 0)}
            hint={t && t.feedback > 0 ? `${t.helpfulYes} helpful · ${t.helpfulNo} not` : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <StatCard label="Agent visitors" value={t?.visitors ?? 0} delta={pctDelta(t?.visitors ?? 0, p?.visitors ?? 0)} />
          <StatCard label="Agent fetches" value={t?.views ?? 0} delta={pctDelta(t?.views ?? 0, p?.views ?? 0)} />
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-border/60 p-4 mb-6 bg-card/30">
        <div className="mb-1 text-[13px] font-medium">
          {audience === "humans" ? "Visitors Over Time" : "Agent Fetches Over Time"}
        </div>
        <div className="text-[11.5px] text-muted-foreground mb-3">
          Daily {audience === "humans" ? "visitors" : "agent fetches"} for the selected date range
        </div>
        <div className="h-[220px]">
          {chartData.length === 0 || (t?.views ?? 0) === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-[13px] text-muted-foreground">No visitor activity</div>
              <div className="text-[11.5px] text-muted-foreground/70">When users visit your docs, results will show up here</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => format(parseISO(d), "MMM d")}
                  tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.6 }}
                  axisLine={false} tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.6 }}
                  axisLine={false} tickLine={false} width={28}
                />
                <Tooltip
                  cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
                  contentStyle={{
                    fontSize: 12, borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--background))",
                  }}
                  labelFormatter={(d) => format(parseISO(d as string), "EEE, MMM d")}
                  formatter={(v: number) => [v, audience === "humans" ? "Visitors" : "Fetches"]}
                />
                <Bar dataKey={audience === "humans" ? "visitors" : "views"} radius={[4, 4, 0, 0]}>
                  {chartData.map((c, i) => (
                    <Cell
                      key={i}
                      fill={c.isToday ? "hsl(var(--primary) / 0.45)" : "hsl(var(--primary))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-border/60 bg-card/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
            <div className="text-[13px] font-medium">Top pages</div>
            <div className="text-[11px] text-muted-foreground">Views</div>
          </div>
          {data && data.topPages.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {data.topPages.map((p) => (
                <li key={p.path} className="flex items-center justify-between px-4 py-2 text-[12.5px]">
                  <span className="truncate font-mono text-[12px]">{p.path}</span>
                  <span className="tabular-nums text-muted-foreground">{p.views.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-[12.5px] text-muted-foreground text-center">No page views yet</div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
            <div className="text-[13px] font-medium">Referrers</div>
            <div className="text-[11px] text-muted-foreground">Views</div>
          </div>
          {data && data.topReferrers.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {data.topReferrers.map((r) => {
                let label = r.referrer;
                try {
                  if (r.referrer && r.referrer.startsWith("http")) {
                    label = new URL(r.referrer).host;
                  }
                } catch { /* keep raw */ }
                return (
                  <li key={r.referrer} className="flex items-center justify-between px-4 py-2 text-[12.5px]">
                    <span className="truncate">{label || "(direct)"}</span>
                    <span className="tabular-nums text-muted-foreground">{r.views.toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-6 text-[12.5px] text-muted-foreground text-center">No referrers yet</div>
          )}
        </div>
      </div>

      {/* Footer link to live docs */}
      {projectSlug && (
        <div className="flex justify-end">
          <Button asChild size="sm" variant="outline">
            <Link to={`/p/${projectSlug}`} target="_blank">
              View live docs <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {loading && !data && (
        <div className="text-center text-[12px] text-muted-foreground mt-4">Loading…</div>
      )}
    </div>
  );
};

export default AnalyticsContent;
