
CREATE TABLE public.project_design_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_design_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view design settings"
  ON public.project_design_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Users can CRUD own design settings"
  ON public.project_design_settings
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
