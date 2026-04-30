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

async function ghFetchOptional(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 404 || res.status === 409) {
    await res.text();
    return null;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }

  return res.json();
}

function toBase64Utf8(value: string) {
  return btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(""));
}

function toGitHubContentPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [owner, repo] = githubRepo.split("/");
    if (!owner || !repo) {
      return new Response(
        JSON.stringify({ error: "Invalid github_repo format. Expected owner/repo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const repoInfo = await ghFetch(`${GITHUB_API}/repos/${owner}/${repo}`, githubToken);
    const defaultBranch = repoInfo.default_branch || project.github_branch || "main";
    const targetBranch = branch || project.github_branch || defaultBranch;

    let targetRef = await ghFetchOptional(
      `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`,
      githubToken,
    );
    const defaultRef = targetBranch === defaultBranch
      ? targetRef
      : await ghFetchOptional(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, githubToken);

    const isEmptyRepo = !defaultRef;

    if (isEmptyRepo) {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        await ghFetch(
          `${GITHUB_API}/repos/${owner}/${repo}/contents/${toGitHubContentPath(file.path)}`,
          githubToken,
          {
            method: "PUT",
            body: JSON.stringify({
              message: index === 0 ? `${commitMessage} (initialize repository)` : commitMessage,
              content: toBase64Utf8(file.content),
              branch: targetBranch,
            }),
          },
        );
      }

      const initializedRef = await ghFetchOptional(
        `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`,
        githubToken,
      );

      if (!initializedRef) {
        throw new Error("GitHub repository initialization failed.");
      }

      return new Response(
        JSON.stringify({
          success: true,
          commitSha: initializedRef.object.sha,
          commitUrl: `https://github.com/${owner}/${repo}/commit/${initializedRef.object.sha}`,
          branch: targetBranch,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!targetRef) {
      const base = baseBranch || defaultBranch;
      const baseRef = base === defaultBranch
        ? defaultRef
        : await ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${base}`, githubToken);

      if (!baseRef) {
        throw new Error(`Base branch "${base}" was not found.`);
      }

      if (createBranch || targetBranch !== defaultBranch) {
        try {
          await ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, githubToken, {
            method: "POST",
            body: JSON.stringify({
              ref: `refs/heads/${targetBranch}`,
              sha: baseRef.object.sha,
            }),
          });
        } catch (error: any) {
          if (!error.message.includes("422")) throw error;
        }
      }

      targetRef = await ghFetchOptional(
        `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`,
        githubToken,
      );
    }

    if (!targetRef) {
      throw new Error(`Could not resolve target branch "${targetBranch}".`);
    }

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
        },
      );

      treeEntries.push({
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobData.sha,
      });
    }

    const latestCommitSha = targetRef.object.sha;
    const commitData = await ghFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      githubToken,
    );

    const newTree = await ghFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees`,
      githubToken,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: commitData.tree.sha,
          tree: treeEntries,
        }),
      },
    );

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
      },
    );

    await ghFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      githubToken,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha }),
      },
    );

    return new Response(
      JSON.stringify({
        success: true,
        commitSha: newCommit.sha,
        commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
        branch: targetBranch,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("publish-to-github error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});