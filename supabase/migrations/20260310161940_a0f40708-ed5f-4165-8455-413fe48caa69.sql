
-- Create nav_groups table for sidebar section grouping
CREATE TABLE public.nav_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Section',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add nav_group_id to pages (nullable for backward compat)
ALTER TABLE public.pages ADD COLUMN nav_group_id UUID REFERENCES public.nav_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.nav_groups ENABLE ROW LEVEL SECURITY;

-- Anyone can view nav_groups (for public docs)
CREATE POLICY "Anyone can view nav_groups"
ON public.nav_groups
FOR SELECT
TO anon, authenticated
USING (true);

-- Users can CRUD own nav_groups
CREATE POLICY "Users can CRUD own nav_groups"
ON public.nav_groups
FOR ALL
TO authenticated
USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
