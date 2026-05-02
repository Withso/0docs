
-- Block type enum
CREATE TYPE public.block_type AS ENUM (
  'heading', 'paragraph', 'code_block', 'image', 'video', 'youtube',
  'ordered_list', 'unordered_list', 'note', 'callout'
);

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, slug)
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects" ON public.projects
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view projects" ON public.projects
  FOR SELECT TO anon USING (true);

-- Pages
CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, slug)
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own pages" ON public.pages
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view pages" ON public.pages
  FOR SELECT TO anon USING (true);

-- Sections
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Section',
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own sections" ON public.sections
  FOR ALL TO authenticated
  USING (page_id IN (
    SELECT p.id FROM public.pages p
    JOIN public.projects pr ON p.project_id = pr.id
    WHERE pr.user_id = auth.uid()
  ))
  WITH CHECK (page_id IN (
    SELECT p.id FROM public.pages p
    JOIN public.projects pr ON p.project_id = pr.id
    WHERE pr.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view sections" ON public.sections
  FOR SELECT TO anon USING (true);

-- Blocks
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  type block_type NOT NULL DEFAULT 'paragraph',
  content jsonb NOT NULL DEFAULT '{}',
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own blocks" ON public.blocks
  FOR ALL TO authenticated
  USING (section_id IN (
    SELECT s.id FROM public.sections s
    JOIN public.pages p ON s.page_id = p.id
    JOIN public.projects pr ON p.project_id = pr.id
    WHERE pr.user_id = auth.uid()
  ))
  WITH CHECK (section_id IN (
    SELECT s.id FROM public.sections s
    JOIN public.pages p ON s.page_id = p.id
    JOIN public.projects pr ON p.project_id = pr.id
    WHERE pr.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view blocks" ON public.blocks
  FOR SELECT TO anon USING (true);
