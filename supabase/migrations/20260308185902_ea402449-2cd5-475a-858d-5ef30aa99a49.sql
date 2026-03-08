
-- Add meta_description to pages for SEO
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS meta_description text;

-- Doc versions table for versioning
CREATE TABLE public.doc_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  version_label text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, version_label)
);

ALTER TABLE public.doc_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can view versions (public docs need to show version selector)
CREATE POLICY "Anyone can view versions" ON public.doc_versions
  FOR SELECT USING (true);

-- Project owners can manage versions
CREATE POLICY "Owners can manage versions" ON public.doc_versions
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ) WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Add version_id to pages (nullable = current/default version)
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS version_id uuid REFERENCES public.doc_versions(id) ON DELETE SET NULL;
