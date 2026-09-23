// Cloudflare Pages Function: /api/admin/history
// Retrieves design mode publish history / checkpoints

import defaultHistory from '../../src/data/publishHistory.json';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method === 'GET') {
    let history = [];

    if (env && env.EKO_KV) {
      try {
        const stored = await env.EKO_KV.get('designModePublishHistory', { type: 'json' });
        if (Array.isArray(stored)) {
          history = stored;
        }
      } catch (err) {
        console.warn('[Cloudflare History] KV read error:', err.message);
      }
    }

    if (!history || history.length === 0) {
      history = Array.isArray(defaultHistory) ? defaultHistory : [];
    }

    // Always guarantee v0 checkpoint is present
    const hasV0 = history.some(cp => cp.id === 'cp_v0' || cp.isV0);
    if (!hasV0) {
      history.push({
        id: 'cp_v0',
        timestamp: '2026-09-23T00:00:00.000Z',
        label: 'Checkpoint v0 (Default Baseline)',
        description: 'Default pristine project baseline. Reverting here resets all visual modifications across all devices.',
        elementsCount: 0,
        schema: {
          version: '1.0.0',
          lastUpdated: '2026-09-23T00:00:00.000Z',
          elementsCount: 0,
          elements: {}
        },
        isV0: true
      });
    }

    return new Response(JSON.stringify({ success: true, history }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
