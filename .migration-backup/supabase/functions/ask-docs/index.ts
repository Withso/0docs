import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 4000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, projectId } = await req.json();
    if (!projectId || typeof projectId !== "string") throw new Error("projectId is required");

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: `Too many messages (max ${MAX_MESSAGES})` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize messages: only allow user/assistant roles, truncate content
    const sanitizedMessages = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => ({
        role: m.role,
        content: String(m.content || "").slice(0, MAX_CONTENT_LENGTH),
      }));

    if (sanitizedMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch doc content for RAG context using anon key (no need for service role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Get all pages, sections, blocks for this project
    const { data: pages } = await sb
      .from("pages")
      .select("id, title, slug")
      .eq("project_id", projectId)
      .order("order_index");

    let docContext = "";
    if (pages && pages.length > 0) {
      const pageIds = pages.map((p: any) => p.id);
      const { data: sections } = await sb
        .from("sections")
        .select("id, page_id, title")
        .in("page_id", pageIds)
        .order("order_index");

      if (sections && sections.length > 0) {
        const sectionIds = sections.map((s: any) => s.id);
        const { data: blocks } = await sb
          .from("blocks")
          .select("section_id, type, content")
          .in("section_id", sectionIds)
          .order("order_index");

        // Build context string
        for (const page of pages) {
          docContext += `\n\n## Page: ${page.title}\n`;
          const pageSections = (sections || []).filter((s: any) => s.page_id === page.id);
          for (const section of pageSections) {
            docContext += `\n### ${section.title}\n`;
            const sectionBlocks = (blocks || []).filter((b: any) => b.section_id === section.id);
            for (const block of sectionBlocks) {
              const c = block.content as any;
              switch (block.type) {
                case "heading":
                case "paragraph":
                case "note":
                case "callout":
                case "quote":
                  if (c?.text) docContext += `${c.text}\n`;
                  break;
                case "code_block":
                  if (c?.code) docContext += `\n\`\`\`${c.language || ""}\n${c.code}\n\`\`\`\n`;
                  break;
                case "ordered_list":
                case "unordered_list":
                  if (c?.items) c.items.forEach((item: string, i: number) => {
                    docContext += `${block.type === "ordered_list" ? `${i + 1}.` : "-"} ${item}\n`;
                  });
                  break;
                case "api_endpoint":
                  docContext += `${c?.method || "GET"} ${c?.path || ""}\n${c?.description || ""}\n`;
                  break;
                case "steps":
                  if (c?.items) c.items.forEach((s: any, i: number) => {
                    docContext += `Step ${i + 1}: ${s.title} - ${s.description}\n`;
                  });
                  break;
                case "card":
                  docContext += `${c?.title || ""}: ${c?.description || ""}\n`;
                  break;
                case "table":
                  if (c?.headers) docContext += `| ${c.headers.join(" | ")} |\n`;
                  if (c?.rows) c.rows.forEach((r: string[]) => { docContext += `| ${r.join(" | ")} |\n`; });
                  break;
                case "code_tabs":
                  if (c?.tabs) c.tabs.forEach((t: any) => {
                    docContext += `\`\`\`${t.language || t.label}\n${t.code}\n\`\`\`\n`;
                  });
                  break;
              }
            }
          }
        }
      }
    }

    // Truncate context if too long (keep under ~30k chars)
    if (docContext.length > 30000) {
      docContext = docContext.slice(0, 30000) + "\n\n[Documentation truncated...]";
    }

    const systemPrompt = `You are an AI assistant for a documentation site. Answer questions based ONLY on the documentation content provided below. If the answer isn't in the documentation, say so clearly.

Be concise, helpful, and reference specific sections when relevant. Use markdown formatting.

--- DOCUMENTATION CONTENT ---\n${docContext}\n--- END DOCUMENTATION ---`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...sanitizedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-docs error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
