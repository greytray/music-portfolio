// Cloudflare Pages Function: /api/admin/schema
// Serves current visual design schema on Cloudflare Pages

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
    try {
      // 1. Try reading from Cloudflare KV if configured
      if (env && env.EKO_KV) {
        const stored = await env.EKO_KV.get('designModeSchema', { type: 'json' });
        if (stored) {
          return new Response(JSON.stringify({ success: true, schema: stored }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      }

      // 2. Try fetching from Hugging Face if dataset repository has a saved schema
      const hfToken = (env && env.HF_ACCESS_TOKEN) || '';
      if (hfToken) {
        try {
          const hfRes = await fetch('https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main/schema.json', {
            headers: { 'Authorization': `Bearer ${hfToken}` }
          });
          if (hfRes.ok) {
            const hfSchema = await hfRes.json();
            return new Response(JSON.stringify({ success: true, schema: hfSchema }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }
        } catch (_) {}
      }

      // 3. Fallback default schema
      return new Response(JSON.stringify({
        success: true,
        schema: {
          version: '1.0.0',
          elements: {}
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
