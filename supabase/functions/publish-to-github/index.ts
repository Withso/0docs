const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface FileEntry {
  path: string;
  content: string;
}

interface RequestBody {
  projectId: string;
  files: FileEntry[];
  commitMessage: string;
  branch?: string;
  createBranch?: boolean;
  baseBranch?: string;
}

const GITHUB_API = "https://api.github.com";

async function ghFetch(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { projectId, files, commitMessage, branch, createBranch, baseBranch } = body;

    if (!projectId || !files || files.length === 0 || !commitMessage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: projectId, files, commitMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch project and verify ownership
    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("id, user_id, github_repo, github_branch, github_token_encrypted")
      .eq("id", projectId)
      .single();

    if (projError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (project.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const githubRepo = project.github_repo;
    const githubToken = project.github_token_encrypted;

    if (!githubRepo || !githubToken) {
      return new Response(
        JSON.stringify({ error: "GitHub not configured. Add repo and token in project settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [owner, repo] = githubRepo.split("/");
    if (!owner || !repo) {
      return new Response(
        JSON.stringify({ error: "Invalid github_repo format. Expected owner/repo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetBranch = branch || project.github_branch || "main";

    // If creating a new branch, get the base branch SHA first
    if (createBranch) {
      const base = baseBranch || project.github_branch || "main";
      const baseRef = await ghFetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${base}`,
        githubToken
      );
      const baseSha = baseRef.object.sha;

      // Create the new branch ref
      try {
        await ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, githubToken, {
          method: "POST",
          body: JSON.stringify({
            ref: `refs/heads/${targetBranch}`,
            sha: baseSha,
          }),
        });
      } catch (e: any) {
        // Branch may already exist — that's OK
        if (!e.message.includes("422")) throw e;
      }
    }

    // 1. Get current commit SHA of target branch
    const refData = await ghFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`,
      githubToken
    );
    const latestCommitSha = refData.object.sha;

    // 2. Get the tree SHA of that commit
    const commitData = await ghFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      githubToken
    );
    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for each file
    const treeEntries = [];
    for (const file of files) {
      const blobData = await ghFetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/blobs`,
        githubToken,
        {
          method: "POST",
          body: JSON.stringify({
            content: file.content,
            encoding: "utf-8",
          }),
        }
      );
      treeEntries.push({
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobData.sha,
      });
    }

    // 4. Create a new tree
    const newTree = await ghFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees`,
      githubToken,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries,
        }),
      }
    );

    // 5. Create a commit
    const newCommit = await ghFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/commits`,
      githubToken,
      {
        method: "POST",
        body: JSON.stringify({
          message: commitMessage,
          tree: newTree.sha,
          parents: [latestCommitSha],
        }),
      }
    );

    // 6. Update the branch ref
    await ghFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      githubToken,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha }),
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        commitSha: newCommit.sha,
        commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
        branch: targetBranch,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("publish-to-github error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
