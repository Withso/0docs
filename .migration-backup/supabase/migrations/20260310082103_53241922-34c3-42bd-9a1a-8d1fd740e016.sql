
-- Add is_homepage flag to projects table
ALTER TABLE public.projects ADD COLUMN is_homepage boolean NOT NULL DEFAULT false;

-- Ensure only one project can be the homepage
CREATE UNIQUE INDEX idx_projects_single_homepage ON public.projects (is_homepage) WHERE is_homepage = true;
