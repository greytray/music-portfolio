// Cloudflare Pages Function: /api/admin/restore
// Handles restoring a specific checkpoint onto Cloudflare Pages / KV

import { verifySessionToken, extractToken } from '../../_auth.js';

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
    const token = extractToken(request, new URL(request.url));
    const session = await verifySessionToken(token, env);

    if (!session) {
      return new Response(JSON.stringify({
        error: '401 Unauthorized: Valid administrative session required.'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    try {
      const body = await request.json();
      if (!body || !body.checkpointId) {
        return new Response(JSON.stringify({ error: 'Missing checkpointId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      let restoredSchema = null;
      let targetCheckpoint = null;

      if (body.checkpointId === 'cp_v0') {
        restoredSchema = {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          elementsCount: 0,
          elements: {}
        };
        targetCheckpoint = {
          id: 'cp_v0',
          timestamp: '2026-09-23T00:00:00.000Z',
          label: 'Checkpoint v0 (Default Baseline)',
          description: 'Default pristine project baseline. Reverting here resets all visual modifications across all devices.',
          elementsCount: 0,
          schema: restoredSchema,
          isV0: true
        };
      } else {
        let history = [];
        if (env && env.EKO_KV) {
          try {
            const stored = await env.EKO_KV.get('designModePublishHistory', { type: 'json' });
            if (Array.isArray(stored)) {
              history = stored;
            }
          } catch (_) {}
        }

        targetCheckpoint = history.find(c => c.id === body.checkpointId);
        if (targetCheckpoint && targetCheckpoint.schema) {
          restoredSchema = {
            ...targetCheckpoint.schema,
            lastPublished: new Date().toISOString()
          };
        }
      }

      if (!restoredSchema) {
        return new Response(JSON.stringify({ error: 'Checkpoint not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      if (env && env.EKO_KV) {
        try {
          await env.EKO_KV.put('designModeSchema', JSON.stringify(restoredSchema));
        } catch (err) {
          console.warn('[Cloudflare Restore] KV save error:', err.message);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Restored checkpoint "${targetCheckpoint.label}"`,
        checkpoint: targetCheckpoint,
        schema: restoredSchema
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Restore failed: ' + err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
