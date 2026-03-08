import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, ThumbsUp, ThumbsDown, Search, Eye, FileText } from "lucide-react";

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

        const { data: fb } = await supabase.from("page_feedback" as any).select("*").in("page_id", pageIds).order("created_at", { ascending: false }).limit(50);
        setFeedback((fb || []) as unknown as FeedbackRow[]);

        const { data: an } = await supabase.from("page_analytics" as any).select("page_id, view_count, last_viewed_at").in("page_id", pageIds);
        setAnalytics((an || []) as unknown as AnalyticsRow[]);
      }

      const { data: sq } = await supabase.from("search_queries" as any).select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50);
      setSearches((sq || []) as unknown as SearchRow[]);

      setLoading(false);
    };
    load();
  }, [projectId, user]);

  const pageName = (id: string) => pages.find((p) => p.id === id)?.title || "Unknown";
  const totalViews = analytics.reduce((sum, a) => sum + a.view_count, 0);
  const helpfulCount = feedback.filter((f) => f.is_helpful).length;
  const unhelpfulCount = feedback.filter((f) => !f.is_helpful).length;
  const helpfulPct = feedback.length > 0 ? Math.round((helpfulCount / feedback.length) * 100) : 0;

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
              <span className="font-semibold text-sm">{project?.name} — Analytics</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Eye className="h-4 w-4" />} label="Total Views" value={totalViews.toString()} />
          <StatCard icon={<FileText className="h-4 w-4" />} label="Pages" value={pages.length.toString()} />
          <StatCard icon={<ThumbsUp className="h-4 w-4" />} label="Helpful %" value={`${helpfulPct}%`} />
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
          <div className="space-y-3">
            <h3 className="text-sm font-semibold mb-3">Page Views</h3>
            {pages.map((page) => {
              const a = analytics.find((an) => an.page_id === page.id);
              return (
                <div key={page.id} className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card">
                  <span className="text-sm">{page.title}</span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{a?.view_count || 0} views</span>
                    {a?.last_viewed_at && <span className="text-xs">Last: {new Date(a.last_viewed_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              );
            })}
            {pages.length === 0 && <p className="text-sm text-muted-foreground">No pages yet.</p>}
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1 text-sm"><ThumbsUp className="h-3.5 w-3.5 text-green-500" /> {helpfulCount} helpful</span>
              <span className="flex items-center gap-1 text-sm"><ThumbsDown className="h-3.5 w-3.5 text-red-500" /> {unhelpfulCount} not helpful</span>
            </div>
            {feedback.map((fb) => (
              <div key={fb.id} className="flex items-start gap-3 py-2 px-3 rounded-lg border bg-card">
                {fb.is_helpful
                  ? <ThumbsUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  : <ThumbsDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{pageName(fb.page_id)}</div>
                  {fb.comment && <p className="text-xs text-muted-foreground mt-0.5">{fb.comment}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(fb.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {feedback.length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
          </div>
        )}

        {activeTab === "searches" && (
          <div className="space-y-3">
            {searches.map((sq) => (
              <div key={sq.id} className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">"{sq.query}"</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{sq.results_count} results</span>
                  <span>{new Date(sq.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {searches.length === 0 && <p className="text-sm text-muted-foreground">No searches yet.</p>}
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-xs">{label}</span></div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default Analytics;
