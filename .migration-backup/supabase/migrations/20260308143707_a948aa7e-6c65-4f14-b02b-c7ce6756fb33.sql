
-- Fix RLS: Change all "Anyone can view" policies from RESTRICTIVE to PERMISSIVE
-- Drop and recreate them as PERMISSIVE

DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
CREATE POLICY "Anyone can view projects" ON public.projects
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view pages" ON public.pages;
CREATE POLICY "Anyone can view pages" ON public.pages
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view sections" ON public.sections;
CREATE POLICY "Anyone can view sections" ON public.sections
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view blocks" ON public.blocks;
CREATE POLICY "Anyone can view blocks" ON public.blocks
  FOR SELECT TO anon, authenticated
  USING (true);
