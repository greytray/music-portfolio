import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve(process.cwd(), ".github-config.json");

/**
 * Loads current GitHub configuration from environment variables or .github-config.json
 */
export function getGitHubConfig(env = process.env) {
  let fileConfig = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } catch (_) {}
  }

  const token = env.GITHUB_TOKEN || env.VITE_GITHUB_TOKEN || fileConfig.token || "";
  const repo = env.GITHUB_REPO || env.VITE_GITHUB_REPO || fileConfig.repo || "";
  const branch = env.GITHUB_BRANCH || env.VITE_GITHUB_BRANCH || fileConfig.branch || "main";
  const autoPush = env.GITHUB_AUTO_PUSH !== undefined
    ? env.GITHUB_AUTO_PUSH === "true" || env.GITHUB_AUTO_PUSH === true
    : (fileConfig.autoPush !== undefined ? fileConfig.autoPush : true);
  const authorName = fileConfig.authorName || env.GITHUB_AUTHOR_NAME || "Eko Admin";
  const authorEmail = fileConfig.authorEmail || env.GITHUB_AUTHOR_EMAIL || "admin@eko-studio.internal";

  return {
    token,
    repo,
    branch,
    autoPush,
    authorName,
    authorEmail,
    isConfigured: Boolean(token && repo),
    maskedToken: token ? `${token.slice(0, 4)}...${token.slice(-4)}` : ""
  };
}

/**
 * Securely writes GitHub configuration to .github-config.json
 */
export function saveGitHubConfig(newConfig, env = process.env) {
  const current = getGitHubConfig(env);
  const updated = {
    repo: (newConfig.repo !== undefined ? newConfig.repo : current.repo).trim(),
    branch: (newConfig.branch !== undefined ? newConfig.branch : current.branch).trim() || "main",
    token: newConfig.token !== undefined && newConfig.token.trim() !== ""
      ? newConfig.token.trim()
      : current.token,
    autoPush: newConfig.autoPush !== undefined ? Boolean(newConfig.autoPush) : current.autoPush,
    authorName: newConfig.authorName !== undefined ? newConfig.authorName.trim() : current.authorName,
    authorEmail: newConfig.authorEmail !== undefined ? newConfig.authorEmail.trim() : current.authorEmail,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf8");
  return getGitHubConfig(env);
}

/**
 * Helper to make authenticated GitHub API calls
 */
async function callGitHubApi(endpoint, token, options = {}) {
  const url = endpoint.startsWith("https://") ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Eko-Admin-Deployer/1.0",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.message) || response.statusText || `HTTP ${response.status}`;
    const error = new Error(`GitHub API Error (${response.status}): ${errorMsg}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Tests connection to repository and branch using provided or stored credentials
 */
export async function testGitHubConnection(config) {
  const token = config.token;
  const repo = config.repo;
  const branch = config.branch || "main";

  if (!token) {
    throw new Error("Missing GitHub Personal Access Token.");
  }
  if (!repo || !repo.includes("/")) {
    throw new Error("Repository must be in 'owner/repo' format (e.g. 'octocat/hello-world').");
  }

  const [owner, repoName] = repo.split("/");

  // 1. Verify user / token
  let user = null;
  try {
    user = await callGitHubApi("/user", token);
  } catch (_) {
    // Fine-grained PATs might not have /user access, continue to repo check
  }

  // 2. Verify repo exists and check user permissions
  const repoData = await callGitHubApi(`/repos/${owner}/${repoName}`, token);

  // 3. Verify branch exists
  let branchData = null;
  let targetBranch = branch;
  try {
    branchData = await callGitHubApi(`/repos/${owner}/${repoName}/branches/${branch}`, token);
  } catch (err) {
    if (err.status === 404 && repoData.default_branch && repoData.default_branch !== branch) {
      // Try default branch if specified branch not found
      branchData = await callGitHubApi(`/repos/${owner}/${repoName}/branches/${repoData.default_branch}`, token);
      targetBranch = repoData.default_branch;
    } else {
      throw err;
    }
  }

  return {
    ok: true,
    user: user ? user.login : null,
    repo: repoData.full_name,
    isPrivate: repoData.private,
    defaultBranch: repoData.default_branch,
    branch: targetBranch,
    hasPushAccess: Boolean(repoData.permissions && (repoData.permissions.push || repoData.permissions.admin)),
    latestCommit: branchData && branchData.commit ? {
      sha: branchData.commit.sha,
      message: branchData.commit.commit ? branchData.commit.commit.message : "",
      author: branchData.commit.commit && branchData.commit.commit.author ? branchData.commit.commit.author.name : ""
    } : null
  };
}

/**
 * Creates an atomic commit across multiple files using GitHub Git Database API
 * and advances the remote branch ref to trigger production deployment.
 */
export async function commitAndPushFilesToGitHub({
  repo,
  branch,
  token,
  message,
  files,
  authorName,
  authorEmail
}) {
  if (!token || !repo) {
    throw new Error("GitHub repository and token must be configured.");
  }

  const [owner, repoName] = repo.split("/");
  const targetBranch = branch || "main";
  const commitMessage = message || `chore(admin): publish website updates [deploy] - ${new Date().toLocaleString()}`;

  // Step 1: Get latest commit SHA on the target branch
  let parentCommitSha = "";
  try {
    const refData = await callGitHubApi(`/repos/${owner}/${repoName}/git/ref/heads/${targetBranch}`, token);
    parentCommitSha = refData.object.sha;
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`Branch '${targetBranch}' was not found in ${repo}. Please create the branch or check spelling.`);
    }
    throw err;
  }

  // Step 2: Get base tree SHA from the parent commit
  const parentCommit = await callGitHubApi(`/repos/${owner}/${repoName}/git/commits/${parentCommitSha}`, token);
  const baseTreeSha = parentCommit.tree.sha;

  // Step 3: Create a new tree with the updated files
  // Files array format: [ { path: "index.html", content: "..." }, { path: "src/styles/custom-design.css", content: "..." } ]
  const treeNodes = files.map(file => ({
    path: file.path,
    mode: "100644", // standard file mode
    type: "blob",
    content: file.content
  }));

  const newTree = await callGitHubApi(`/repos/${owner}/${repoName}/git/trees`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeNodes
    })
  });

  // Step 4: Create new commit pointing to the new tree
  const newCommit = await callGitHubApi(`/repos/${owner}/${repoName}/git/commits`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: commitMessage,
      tree: newTree.sha,
      parents: [parentCommitSha],
      author: {
        name: authorName || "Eko Admin",
        email: authorEmail || "admin@eko-studio.internal",
        date: new Date().toISOString()
      }
    })
  });

  // Step 5: Fast-forward / update the branch ref to point to the new commit
  await callGitHubApi(`/repos/${owner}/${repoName}/git/refs/heads/${targetBranch}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sha: newCommit.sha,
      force: false
    })
  });

  return {
    success: true,
    commitSha: newCommit.sha,
    commitUrl: `https://github.com/${owner}/${repoName}/commit/${newCommit.sha}`,
    branch: targetBranch,
    repo: `${owner}/${repoName}`,
    message: commitMessage,
    filesCommitted: files.map(f => f.path),
    timestamp: new Date().toISOString()
  };
}

/**
 * Fetches recent GitHub Actions workflow runs or deployments for real-time status display
 */
export async function getGitHubDeploymentStatus(repo, token) {
  if (!token || !repo) return { runs: [] };
  const [owner, repoName] = repo.split("/");

  try {
    const data = await callGitHubApi(`/repos/${owner}/${repoName}/actions/runs?per_page=3`, token);
    const runs = (data.workflow_runs || []).map(run => ({
      id: run.id,
      name: run.name,
      status: run.status, // queued, in_progress, completed
      conclusion: run.conclusion, // success, failure, neutral, cancelled
      html_url: run.html_url,
      branch: run.head_branch,
      updated_at: run.updated_at,
      display_title: run.display_title
    }));
    return { runs };
  } catch (_) {
    return { runs: [] };
  }
}
