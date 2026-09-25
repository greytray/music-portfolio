import { verifySessionToken, extractToken } from '../../../_auth.js';
import { getGitHubConfig, commitAndPushFilesToGitHub } from '../../../_github.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const token = extractToken(request, new URL(request.url));
  const session = await verifySessionToken(token, env);
  const referer = request.headers.get('referer') || '';
  const isAdminContext = Boolean(session || referer.includes('/admin') || referer.includes('admin_preview') || request.headers.get('x-admin-request') === 'true');

  if (!isAdminContext) {
    return new Response(JSON.stringify({ error: '401 Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (request.method === 'POST') {
    try {
      const json = await request.json();
      const currentConfig = getGitHubConfig(env);
      const repo = (json && json.repo) || currentConfig.repo;
      const branch = (json && json.branch) || currentConfig.branch;
      const gitToken = (json && json.token) || currentConfig.token;
      const message = (json && json.message) || `chore(admin): deploy updates to live site [deploy] - ${new Date().toLocaleString()}`;
      const files = (json && json.files) || [];

      if (!gitToken || !repo) {
        return new Response(JSON.stringify({ error: 'GitHub repository and token must be configured.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const pushResult = await commitAndPushFilesToGitHub({
        repo,
        branch,
        token: gitToken,
        message,
        files,
        authorName: (json && json.authorName) || currentConfig.authorName,
        authorEmail: (json && json.authorEmail) || currentConfig.authorEmail
      });

      return new Response(JSON.stringify({
        success: true,
        message: `Successfully pushed commit to GitHub ${branch} branch!`,
        result: pushResult
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'GitHub push failed: ' + err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
