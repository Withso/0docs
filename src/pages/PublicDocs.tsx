import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Page {
  id: string;
  title: string;
  slug: string;
  order_index: number;
}

interface Section {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
}

interface Block {
  id: string;
  section_id: string;
  type: string;
  content: any;
  order_index: number;
}

const PublicDocs = () => {
  const { slug, pageSlug } = useParams<{ slug: string; pageSlug?: string }>();
  const [project, setProject] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Find project by slug (need to search across all users)
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug!)
        .limit(1);

      if (!projects || projects.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const proj = projects[0];
      setProject(proj);

      const { data: pagesData } = await supabase
        .from("pages")
        .select("*")
        .eq("project_id", proj.id)
        .order("order_index");

      if (pagesData) {
        setPages(pagesData);
        const target = pageSlug
          ? pagesData.find((p) => p.slug === pageSlug)
          : pagesData[0];
        setActivePage(target || pagesData[0] || null);
      }
      setLoading(false);
    };

    load();
  }, [slug, pageSlug]);

  // Load content for active page
  useEffect(() => {
    if (!activePage) return;

    const loadContent = async () => {
      const { data: sectionsData } = await supabase
        .from("sections")
        .select("*")
        .eq("page_id", activePage.id)
        .order("order_index");

      if (sectionsData) {
        setSections(sectionsData);

        if (sectionsData.length > 0) {
          const ids = sectionsData.map((s) => s.id);
          const { data: blocksData } = await supabase
            .from("blocks")
            .select("*")
            .in("section_id", ids)
            .order("order_index");

          if (blocksData) setBlocks(blocksData);
          else setBlocks([]);
        } else {
          setBlocks([]);
        }
      }
    };

    loadContent();
  }, [activePage]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Documentation not found</h1>
          <p className="text-muted-foreground">This documentation doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[980px] mx-auto flex px-6">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 sticky top-0 h-screen overflow-y-auto py-10 pr-8 hidden lg:block">
          <span className="text-foreground font-semibold text-sm mb-8 block">
            /{project?.name?.toLowerCase().replace(/\s+/g, "-")}
          </span>

          <div className="doc-sidebar-group-label">Pages</div>
          <nav className="space-y-0.5">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActivePage(page)}
                className={`doc-sidebar-link w-full text-left ${
                  activePage?.id === page.id ? "active" : ""
                }`}
              >
                {page.title}
              </button>
            ))}
          </nav>

          {activePage && sections.length > 0 && (
            <>
              <div className="doc-sidebar-group-label mt-6">On this page</div>
              <nav className="space-y-0.5">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#section-${section.id}`}
                    className="doc-sidebar-sub-link"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 py-10 lg:pl-4">
          {activePage && (
            <article className="max-w-[680px]">
              <h1 className="text-2xl font-bold text-foreground mb-6">{activePage.title}</h1>

              {sections.map((section) => {
                const sectionBlocks = blocks
                  .filter((b) => b.section_id === section.id)
                  .sort((a, b) => a.order_index - b.order_index);

                return (
                  <section key={section.id} className="mb-10" id={`section-${section.id}`}>
                    <h2 className="doc-heading text-lg mb-4">{section.title}</h2>
                    <div className="doc-prose">
                      {sectionBlocks.map((block) => (
                        <BlockRenderer key={block.id} block={block} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </article>
          )}
        </main>
      </div>
    </div>
  );
};

// Read-only block renderer
const BlockRenderer = ({ block }: { block: Block }) => {
  const { content, type } = block;

  switch (type) {
    case "heading":
      return <h3 className="text-lg font-semibold text-foreground mb-3">{content.text}</h3>;

    case "paragraph":
      return <p className="mb-4">{content.text}</p>;

    case "code_block":
      return (
        <div className="doc-code-block mb-4">
          {content.language && (
            <div className="text-xs text-muted-foreground mb-2">{content.language}</div>
          )}
          <pre className="text-sm"><code>{content.code}</code></pre>
        </div>
      );

    case "image":
      return content.url ? (
        <div className="mb-4">
          <div className="rounded-lg overflow-hidden border">
            <img src={content.url} alt={content.alt || ""} className="w-full h-auto" loading="lazy" />
          </div>
          {content.alt && <p className="text-sm text-muted-foreground mt-1">{content.alt}</p>}
        </div>
      ) : null;

    case "youtube":
      return content.videoId ? (
        <div className="rounded-lg overflow-hidden border aspect-video mb-4">
          <iframe
            src={`https://www.youtube.com/embed/${content.videoId}`}
            className="w-full h-full"
            allowFullScreen
            title={content.title || "Video"}
          />
        </div>
      ) : null;

    case "video":
      return content.url ? (
        <video controls className="w-full rounded-lg border mb-4">
          <source src={content.url} />
        </video>
      ) : null;

    case "ordered_list":
      return (
        <ol className="mb-4">
          {(content.items || []).map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );

    case "unordered_list":
      return (
        <ul className="mb-4">
          {(content.items || []).map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case "note":
      return <div className="doc-note">{content.text}</div>;

    case "callout":
      return (
        <div className="border rounded-lg p-4 bg-secondary/50 mb-4">{content.text}</div>
      );

    default:
      return null;
  }
};

export default PublicDocs;
