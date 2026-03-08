
-- Page feedback table
CREATE TABLE public.page_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  is_helpful boolean NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (public docs visitors)
CREATE POLICY "Anyone can insert feedback" ON public.page_feedback
  FOR INSERT WITH CHECK (true);

-- Project owners can view feedback for their pages
CREATE POLICY "Project owners can view feedback" ON public.page_feedback
  FOR SELECT USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN projects pr ON p.project_id = pr.id
      WHERE pr.user_id = auth.uid()
    )
  );

-- Page analytics table
CREATE TABLE public.page_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  avg_time_seconds integer,
  last_viewed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id)
);

ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can upsert analytics (page views from public docs)
CREATE POLICY "Anyone can upsert analytics" ON public.page_analytics
  FOR ALL USING (true) WITH CHECK (true);

-- Search queries table
CREATE TABLE public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  results_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

-- Anyone can insert search queries
CREATE POLICY "Anyone can insert search queries" ON public.search_queries
  FOR INSERT WITH CHECK (true);

-- Project owners can view search queries
CREATE POLICY "Project owners can view search queries" ON public.search_queries
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
