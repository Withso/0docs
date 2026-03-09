
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can upsert analytics" ON public.page_analytics;

-- Allow anyone to INSERT analytics (for tracking page views from public docs)
CREATE POLICY "Anon can insert analytics" ON public.page_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow project owners to read their own analytics
CREATE POLICY "Owners can view analytics" ON public.page_analytics
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Allow project owners to update their own analytics
CREATE POLICY "Owners can update analytics" ON public.page_analytics
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Allow project owners to delete their own analytics
CREATE POLICY "Owners can delete analytics" ON public.page_analytics
  FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
