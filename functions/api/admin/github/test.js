import { getGitHubConfig, testGitHubConnection } from '../../../_github.js';

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

  if (request.method === 'POST') {
    try {
      const json = await request.json();
      const currentConfig = getGitHubConfig(env);
      const testConfig = {
        repo: (json && json.repo) || currentConfig.repo,
        branch: (json && json.branch) || currentConfig.branch,
        token: (json && json.token && json.token.trim() !== '') ? json.token : currentConfig.token
      };

      const result = await testGitHubConnection(testConfig);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: err.message,
        status: err.status || 400
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
