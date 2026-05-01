ALTER TABLE public.projects
  DROP COLUMN IF EXISTS github_repo,
  DROP COLUMN IF EXISTS github_branch,
  DROP COLUMN IF EXISTS github_token_encrypted;