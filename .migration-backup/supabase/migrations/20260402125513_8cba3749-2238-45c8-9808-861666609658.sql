
-- 1. Fix projects: replace overly broad anon SELECT with scoped policies
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;

-- Owners see all their own projects (authenticated)
CREATE POLICY "Owners can view own projects"
  ON public.projects FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Anon can only see projects that are published or homepage (for public docs)
CREATE POLICY "Anon can view published projects"
  ON public.projects FOR SELECT TO anon
  USING (published_version_id IS NOT NULL OR is_homepage = true);

-- Authenticated users can also see published/homepage projects (for public docs when logged in)
CREATE POLICY "Authenticated can view published projects"
  ON public.projects FOR SELECT TO authenticated
  USING (published_version_id IS NOT NULL OR is_homepage = true);

-- 2. Fix published_versions: restrict anon to active versions only
DROP POLICY IF EXISTS "Anyone can view published versions" ON public.published_versions;

CREATE POLICY "Anon can view active published versions"
  ON public.published_versions FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can view active published versions"
  ON public.published_versions FOR SELECT TO authenticated
  USING (is_active = true);

-- Owners can still see all their own versions (already covered by "Owners can manage published versions")

-- 3. Fix page_analytics: validate project exists on INSERT
DROP POLICY IF EXISTS "Anon can insert analytics" ON public.page_analytics;

CREATE POLICY "Anyone can insert analytics for existing projects"
  ON public.page_analytics FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id)
    AND EXISTS (SELECT 1 FROM public.pages WHERE id = page_id)
  );

-- 4. Fix page_feedback: validate page exists on INSERT
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.page_feedback;

CREATE POLICY "Anyone can insert feedback for existing pages"
  ON public.page_feedback FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_id)
  );
