// Cloudflare Pages Function: /api/admin/publish
// Handles schema publish operations on Cloudflare Pages (protected by session token)

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
    // Authenticate: Ensure valid admin session exists (cookie, header, or query)
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
      if (!body || !body.schema) {
        return new Response(JSON.stringify({ error: 'Missing schema payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const publishedSchema = {
        ...body.schema,
        lastPublished: new Date().toISOString()
      };

      let kvSaved = false;
      let hfSaved = false;

      const elementsCount = publishedSchema.elements ? Object.keys(publishedSchema.elements).length : 0;
      const checkpointId = `cp_${Date.now()}`;

      // Retrieve existing history from KV or fallback
      let history = [];
      if (env && env.EKO_KV) {
        try {
          const stored = await env.EKO_KV.get('designModePublishHistory', { type: 'json' });
          if (Array.isArray(stored)) {
            history = stored;
          }
        } catch (_) {}
      }

      const publishedCount = history.filter(c => c.id !== 'cp_v0' && !c.isV0).length;
      const newCheckpoint = {
        id: checkpointId,
        timestamp: publishedSchema.lastPublished,
        label: body.label || `Checkpoint #${publishedCount + 1}`,
        description: body.description || `${elementsCount} element${elementsCount === 1 ? '' : 's'} customized across canvas`,
        elementsCount,
        schema: publishedSchema
      };

      // Add to front of history list and ensure v0 is preserved at end
      history = [
        newCheckpoint,
        ...history.filter(c => c.id !== checkpointId && c.id !== 'cp_v0' && !c.isV0)
      ];
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

      // 1. Save to Cloudflare KV if bound
      if (env && env.EKO_KV) {
        try {
          await env.EKO_KV.put('designModeSchema', JSON.stringify(publishedSchema));
          await env.EKO_KV.put('designModePublishHistory', JSON.stringify(history));
          kvSaved = true;
        } catch (e) {
          console.warn('[Cloudflare Publish] KV save error:', e.message);
        }
      }

      // 2. Commit schema & history to Hugging Face RawStorage dataset if token available
      const hfToken = (env && env.HF_ACCESS_TOKEN) || '';
      if (hfToken) {
        try {
          const hfCommitUrl = 'https://huggingface.co/api/datasets/greyhugging/RawStorage/commit/main';
          const commitPayload = {
            summary: `Publish design schema checkpoint ${checkpointId} [${publishedSchema.lastPublished}]`,
            operations: [
              {
                key: 'file',
                value: btoa(unescape(encodeURIComponent(JSON.stringify(publishedSchema, null, 2)))),
                encoding: 'base64',
                path: 'schema.json'
              },
              {
                key: 'file',
                value: btoa(unescape(encodeURIComponent(JSON.stringify(history, null, 2)))),
                encoding: 'base64',
                path: 'publishHistory.json'
              }
            ]
          };

          const hfRes = await fetch(hfCommitUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(commitPayload)
          });

          if (hfRes.ok) {
            hfSaved = true;
          }
        } catch (e) {
          console.warn('[Cloudflare Publish] HF commit error:', e.message);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Visual schema published successfully',
        timestamp: publishedSchema.lastPublished,
        kvSaved,
        hfSaved,
        checkpoint: newCheckpoint,
        history,
        schema: publishedSchema
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Publish failed: ' + err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
