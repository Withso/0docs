import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, ThumbsUp, ThumbsDown, Search, Eye, FileText, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface FeedbackRow { id: string; page_id: string; is_helpful: boolean; comment: string | null; created_at: string; }
interface SearchRow { id: string; query: string; results_count: number; created_at: string; }
interface AnalyticsRow { page_id: string; view_count: number; last_viewed_at: string; }
interface PageRow { id: string; title: string; slug: string; }

const Analytics = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [searches, setSearches] = useState<SearchRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "feedback" | "searches">("overview");

  useEffect(() => {
    if (!projectId || !user) return;
    const load = async () => {
      const { data: proj } = await supabase.from("projects").select("*").eq("id", projectId).eq("user_id", user.id).single();
      if (!proj) { navigate("/dashboard"); return; }
      setProject(proj);

      const { data: pagesData } = await supabase.from("pages").select("id, title, slug").eq("project_id", projectId).order("order_index");
      setPages(pagesData || []);

      if (pagesData && pagesData.length > 0) {
        const pageIds = pagesData.map((p) => p.id);

        const { data: fb } = await supabase.from("page_feedback").select("*").in("page_id", pageIds).order("created_at", { ascending: false }).limit(50);
        setFeedback((fb || []) as FeedbackRow[]);

        const { data: an } = await supabase.from("page_analytics").select("page_id, view_count, last_viewed_at").in("page_id", pageIds);
        setAnalytics((an || []) as AnalyticsRow[]);
      }

      const { data: sq } = await supabase.from("search_queries").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50);
      setSearches((sq || []) as SearchRow[]);

      setLoading(false);
    };
    load();
  }, [projectId, user]);

  const pageName = (id: string) => pages.find((p) => p.id === id)?.title || "Unknown";
  const totalViews = analytics.reduce((sum, a) => sum + a.view_count, 0);
  const helpfulCount = feedback.filter((f) => f.is_helpful).length;
  const unhelpfulCount = feedback.filter((f) => !f.is_helpful).length;
  const helpfulPct = feedback.length > 0 ? Math.round((helpfulCount / feedback.length) * 100) : 0;

  // Chart data
  const viewsChartData = pages
    .map((page) => ({
      name: page.title.length > 18 ? page.title.slice(0, 18) + "…" : page.title,
      views: analytics.find((a) => a.page_id === page.id)?.view_count || 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const feedbackPieData = feedback.length > 0
    ? [
        { name: "Helpful", value: helpfulCount, color: "hsl(var(--platform-success))" },
        { name: "Not Helpful", value: unhelpfulCount, color: "hsl(var(--destructive))" },
      ]
    : [];

  // Search frequency
  const searchFrequency = new Map<string, number>();
  searches.forEach((s) => {
    const q = s.query.toLowerCase();
    searchFrequency.set(q, (searchFrequency.get(q) || 0) + 1);
  });
  const topSearches = [...searchFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/builder/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">{project?.name}</span>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-sm text-muted-foreground">Analytics</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard icon={<Eye className="h-4 w-4" />} label="Total Views" value={totalViews.toString()} />
          <StatCard icon={<FileText className="h-4 w-4" />} label="Pages" value={pages.length.toString()} />
          <StatCard icon={<ThumbsUp className="h-4 w-4" />} label="Helpful" value={`${helpfulPct}%`} subtitle={`${feedback.length} total`} />
          <StatCard icon={<Search className="h-4 w-4" />} label="Searches" value={searches.length.toString()} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b mb-6">
          {(["overview", "feedback", "searches"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Views chart */}
            {viewsChartData.length > 0 && viewsChartData.some((d) => d.views > 0) ? (
              <div className="platform-card">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Page Views</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={viewsChartData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      cursor={{ fill: "hsl(var(--accent))" }}
                    />
                    <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="platform-card text-center py-12">
                <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No page views yet. Share your docs to start tracking.</p>
              </div>
            )}

            {/* Feedback pie + page list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedbackPieData.length > 0 && (
                <div className="platform-card">
                  <h3 className="text-sm font-semibold mb-4">Feedback Sentiment</h3>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={feedbackPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                          {feedbackPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--platform-success))" }} />
                      Helpful ({helpfulCount})
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--destructive))" }} />
                      Not helpful ({unhelpfulCount})
                    </span>
                  </div>
                </div>
              )}

              <div className="platform-card">
                <h3 className="text-sm font-semibold mb-3">Pages by Views</h3>
                <div className="space-y-2">
                  {pages.map((page) => {
                    const a = analytics.find((an) => an.page_id === page.id);
                    const views = a?.view_count || 0;
                    const maxViews = Math.max(...analytics.map((an) => an.view_count), 1);
                    return (
                      <div key={page.id} className="flex items-center gap-3">
                        <span className="text-sm text-foreground truncate flex-1 min-w-0">{page.title}</span>
                        <div className="w-24 h-1.5 rounded-full bg-accent overflow-hidden shrink-0">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(views / maxViews) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{views}</span>
                      </div>
                    );
                  })}
                  {pages.length === 0 && <p className="text-sm text-muted-foreground">No pages yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--platform-success))" }} />
                {helpfulCount} helpful
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--destructive))" }} />
                {unhelpfulCount} not helpful
              </span>
            </div>
            {feedback.length === 0 ? (
              <div className="platform-card text-center py-12">
                <ThumbsUp className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No feedback yet. The feedback widget appears at the bottom of each documentation page.</p>
              </div>
            ) : (
              feedback.map((fb) => (
                <div key={fb.id} className="flex items-start gap-3 py-3 px-4 rounded-xl border bg-card">
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: fb.is_helpful ? "hsl(var(--platform-success) / 0.1)" : "hsl(var(--destructive) / 0.1)" }}>
                    {fb.is_helpful
                      ? <ThumbsUp className="h-3.5 w-3.5" style={{ color: "hsl(var(--platform-success))" }} />
                      : <ThumbsDown className="h-3.5 w-3.5" style={{ color: "hsl(var(--destructive))" }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{pageName(fb.page_id)}</div>
                    {fb.comment && <p className="text-xs text-muted-foreground mt-0.5">{fb.comment}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(fb.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "searches" && (
          <div className="space-y-6">
            {topSearches.length > 0 && (
              <div className="platform-card">
                <h3 className="text-sm font-semibold mb-3">Top Search Terms</h3>
                <div className="space-y-2">
                  {topSearches.map(([query, count]) => {
                    const maxCount = topSearches[0][1];
                    return (
                      <div key={query} className="flex items-center gap-3">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate flex-1 min-w-0">"{query}"</span>
                        <div className="w-20 h-1.5 rounded-full bg-accent overflow-hidden shrink-0">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Recent Searches</h3>
              {searches.length === 0 ? (
                <div className="platform-card text-center py-12">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No searches yet. Users can search with ⌘K in the public docs.</p>
                </div>
              ) : (
                searches.map((sq) => (
                  <div key={sq.id} className="flex items-center justify-between py-2.5 px-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-2.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">"{sq.query}"</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className={`px-1.5 py-0.5 rounded-md ${sq.results_count === 0 ? "bg-destructive/10 text-destructive" : "bg-accent"}`}>
                        {sq.results_count} result{sq.results_count !== 1 ? "s" : ""}
                      </span>
                      <span>{new Date(sq.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = React.forwardRef<HTMLDivElement, { icon: React.ReactNode; label: string; value: string; subtitle?: string }>(
  ({ icon, label, value, subtitle }, ref) => (
    <div ref={ref} className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-xs">{label}</span></div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
    </div>
  )
);
StatCard.displayName = "StatCard";

export default Analytics;
