// Cloudflare Pages Function: /api/admin/publish
// Handles schema publish operations on Cloudflare Pages

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

      // 1. Save to Cloudflare KV if bound
      if (env && env.EKO_KV) {
        try {
          await env.EKO_KV.put('designModeSchema', JSON.stringify(publishedSchema));
          kvSaved = true;
        } catch (e) {
          console.warn('[Cloudflare Publish] KV save error:', e.message);
        }
      }

      // 2. Commit schema to Hugging Face RawStorage dataset if token available
      const hfToken = (env && env.HF_ACCESS_TOKEN) || '';
      if (hfToken) {
        try {
          const hfCommitUrl = 'https://huggingface.co/api/datasets/greyhugging/RawStorage/commit/main';
          const commitPayload = {
            summary: `Publish design schema updates [${new Date().toISOString()}]`,
            operations: [
              {
                key: 'file',
                value: btoa(unescape(encodeURIComponent(JSON.stringify(publishedSchema, null, 2)))),
                encoding: 'base64',
                path: 'schema.json'
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
