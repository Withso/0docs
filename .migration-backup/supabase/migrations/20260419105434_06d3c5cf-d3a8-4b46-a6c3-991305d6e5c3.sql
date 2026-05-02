-- Ensure the shared timestamp helper exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.tabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'New Tab',
  icon TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tabs"
  ON public.tabs FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage tabs"
  ON public.tabs FOR ALL
  TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE INDEX idx_tabs_project ON public.tabs(project_id, order_index);

CREATE TRIGGER update_tabs_updated_at
  BEFORE UPDATE ON public.tabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.nav_groups
  ADD COLUMN tab_id UUID REFERENCES public.tabs(id) ON DELETE SET NULL;

CREATE INDEX idx_nav_groups_tab ON public.nav_groups(tab_id);