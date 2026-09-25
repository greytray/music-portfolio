import { verifySessionToken, extractToken } from '../../../_auth.js';
import { getGitHubConfig, saveGitHubConfig } from '../../../_github.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  if (request.method === 'GET') {
    const config = getGitHubConfig(env);
    return new Response(JSON.stringify({
      success: true,
      config: {
        isConfigured: config.isConfigured,
        repo: config.repo,
        branch: config.branch,
        autoPush: config.autoPush,
        authorName: config.authorName,
        authorEmail: config.authorEmail,
        maskedToken: config.maskedToken
      }
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (request.method === 'POST') {
    try {
      const json = await request.json();
      const saved = saveGitHubConfig(json, env);
      return new Response(JSON.stringify({
        success: true,
        message: 'GitHub configuration saved successfully',
        config: {
          isConfigured: saved.isConfigured,
          repo: saved.repo,
          branch: saved.branch,
          autoPush: saved.autoPush,
          authorName: saved.authorName,
          authorEmail: saved.authorEmail,
          maskedToken: saved.maskedToken
        }
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
