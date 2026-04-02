
-- Add GitHub integration columns to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS github_repo text,
  ADD COLUMN IF NOT EXISTS github_branch text NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS github_token_encrypted text;
