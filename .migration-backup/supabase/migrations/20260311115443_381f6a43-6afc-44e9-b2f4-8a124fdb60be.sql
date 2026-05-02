
-- Table to store published versions with full content snapshots
CREATE TABLE public.published_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  published_by uuid NOT NULL,
  -- Full snapshot of content at publish time
  pages_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocks_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  design_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  nav_groups_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Change summary
  editor_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  design_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add custom_domain to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_domain text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS published_version_id uuid REFERENCES public.published_versions(id);

-- RLS
ALTER TABLE public.published_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published versions"
  ON public.published_versions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Owners can manage published versions"
  ON public.published_versions FOR ALL
  TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
