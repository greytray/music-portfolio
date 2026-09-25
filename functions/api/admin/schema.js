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
        if (stored && stored.elements && Object.keys(stored.elements).length > 0) {
          return new Response(JSON.stringify({ success: true, schema: stored }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      }

      // 2. Try fetching from GitHub raw content (instant real-time authoritative source)
      try {
        const ghRes = await fetch(`https://raw.githubusercontent.com/greytray/music-portfolio/main/public/publishedSchema.json?t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (ghRes.ok) {
          const ghSchema = await ghRes.json();
          if (ghSchema && ghSchema.elements && Object.keys(ghSchema.elements).length > 0) {
            return new Response(JSON.stringify({ success: true, schema: ghSchema }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store, no-cache, must-revalidate'
              }
            });
          }
        }
      } catch (_) {}

      // 3. Try fetching from Hugging Face if dataset repository has a saved schema
      const hfToken = (env && env.HF_ACCESS_TOKEN) || '';
      if (hfToken) {
        try {
          const hfRes = await fetch('https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main/schema.json', {
            headers: { 'Authorization': `Bearer ${hfToken}` }
          });
          if (hfRes.ok) {
            const hfSchema = await hfRes.json();
            if (hfSchema && hfSchema.elements && Object.keys(hfSchema.elements).length > 0) {
              return new Response(JSON.stringify({ success: true, schema: hfSchema }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
              });
            }
          }
        } catch (_) {}
      }

      // 3. Try fetching static publishedSchema.json from origin asset
      try {
        const pubUrl = new URL('/publishedSchema.json', request.url);
        const pubRes = await fetch(pubUrl.toString());
        if (pubRes.ok) {
          const pubSchema = await pubRes.json();
          if (pubSchema && pubSchema.elements && Object.keys(pubSchema.elements).length > 0) {
            return new Response(JSON.stringify({ success: true, schema: pubSchema }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }
        }
      } catch (_) {}

      // 4. Try fetching /src/data/publishedSchema.json from origin asset
      try {
        const originUrl = new URL('/src/data/publishedSchema.json', request.url);
        const staticRes = await fetch(originUrl.toString());
        if (staticRes.ok) {
          const staticSchema = await staticRes.json();
          if (staticSchema && staticSchema.elements && Object.keys(staticSchema.elements).length > 0) {
            return new Response(JSON.stringify({ success: true, schema: staticSchema }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }
        }
      } catch (_) {}

      // 4. Try fetching static metadata.json from origin asset
      try {
        const metaUrl = new URL('/metadata.json', request.url);
        const metaRes = await fetch(metaUrl.toString());
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          if (metaData && metaData.designModeSchema && metaData.designModeSchema.elements) {
            return new Response(JSON.stringify({ success: true, schema: metaData.designModeSchema }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }
        }
      } catch (_) {}

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
