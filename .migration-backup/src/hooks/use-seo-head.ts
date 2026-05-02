import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  projectName?: string;
  pageSlug?: string;
  projectSlug?: string;
  type?: string;
}

/**
 * Dynamically updates document <head> meta tags for SEO.
 * Also injects JSON-LD structured data for documentation pages.
 */
const useSEOHead = ({
  title,
  description,
  projectName,
  pageSlug,
  projectSlug,
  type = "article",
}: SEOHeadProps) => {
  useEffect(() => {
    // Document title
    const docTitle = title && projectName
      ? `${title} — ${projectName}`
      : title || projectName || "Documentation";
    document.title = docTitle;

    // Meta description
    const metaDesc = description || `${title || "Documentation"} — ${projectName || "DocBuilder"}`;
    setMeta("description", metaDesc);
    setMeta("og:title", docTitle, "property");
    setMeta("og:description", metaDesc, "property");
    setMeta("og:type", type, "property");
    setMeta("twitter:title", docTitle);
    setMeta("twitter:description", metaDesc);

    // Canonical URL
    const canonical = projectSlug && pageSlug
      ? `${window.location.origin}/docs/${projectSlug}/${pageSlug}`
      : projectSlug
        ? `${window.location.origin}/docs/${projectSlug}`
        : window.location.href;
    setLink("canonical", canonical);

    // JSON-LD structured data
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: title || "Documentation",
      description: metaDesc,
      author: {
        "@type": "Organization",
        name: projectName || "DocBuilder",
      },
      publisher: {
        "@type": "Organization",
        name: projectName || "DocBuilder",
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonical,
      },
    };

    let scriptEl = document.querySelector('script[data-seo-jsonld]') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.setAttribute("data-seo-jsonld", "true");
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    return () => {
      // Cleanup JSON-LD on unmount
      scriptEl?.remove();
    };
  }, [title, description, projectName, pageSlug, projectSlug, type]);
};

function setMeta(nameOrProp: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export default useSEOHead;
