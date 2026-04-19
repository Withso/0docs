// List or create branches on the GitHub repo connected to a 0docs project.
// GET  ?projectId=...           -> { branches: string[], default: string }
// POST { projectId, name, from } -> creates a new branch from `from` (default branch)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_API = "https://api.github.com";

async function gh(url: string, token: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const isPost = req.method === "POST";
    const body = isPost ? await req.json().catch(() => ({})) : {};
    const projectId = body.projectId || url.searchParams.get("projectId");

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, user_id, github_repo, github_token_encrypted")
      .eq("id", projectId)
      .single();

    if (!project || project.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!project.github_repo || !project.github_token_encrypted) {
      return new Response(JSON.stringify({ error: "GitHub not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [owner, repo] = project.github_repo.split("/");
    const token = project.github_token_encrypted;

    if (isPost && body.name) {
      const repoInfo = await gh(`${GITHUB_API}/repos/${owner}/${repo}`, token);
      const fromBranch = body.from || repoInfo.default_branch;
      const fromRef = await gh(
        `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${fromBranch}`,
        token,
      );
      try {
        await gh(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, token, {
          method: "POST",
          body: JSON.stringify({
            ref: `refs/heads/${body.name}`,
            sha: fromRef.object.sha,
          }),
        });
      } catch (e: any) {
        if (!e.message.includes("422")) throw e;
      }
      return new Response(
        JSON.stringify({ success: true, branch: body.name, from: fromBranch }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // GET: list branches
    const repoInfo = await gh(`${GITHUB_API}/repos/${owner}/${repo}`, token);
    const branches = await gh(
      `${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=100`,
      token,
    );
    return new Response(
      JSON.stringify({
        branches: branches.map((b: any) => b.name),
        default: repoInfo.default_branch,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("github-branches error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
