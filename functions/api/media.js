// Cloudflare Pages Function: /api/media
// Secure server-side media proxy for private Hugging Face Dataset storage

export async function onRequest(context) {
  const { request, env } = context;

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type, If-None-Match',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(request.url);

  // Read target file path from query parameter (?file=audio/song.mp3) or subpath
  let filePath = url.searchParams.get('file') || url.pathname.replace(/^\/api\/media\/?/, '');

  if (!filePath) {
    return new Response(
      JSON.stringify({ error: 'Missing file parameter (?file=path/to/asset.mp3)' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // Normalize path: remove leading slashes and redundant 'assets/' prefixes
  filePath = filePath.replace(/^\.?\/+/, '').replace(/^assets\//, '');

  // Configurable asset storage: reads from env variable or defaults to Hugging Face dataset URL
  const baseUrl = (env && env.HF_DATASET_URL)
    ? env.HF_DATASET_URL.replace(/\/+$/, '')
    : 'https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main';

  // Secure server-side access token from environment (Cloudflare Pages Dashboard secret)
  const token = (env && env.HF_ACCESS_TOKEN) || (typeof process !== 'undefined' && process.env && process.env.HF_ACCESS_TOKEN) || '';

  const targetUrl = `${baseUrl}/${filePath}`;

  // Forward Range, If-None-Match, and Authorization headers upstream
  const forwardHeaders = new Headers();
  if (token) {
    forwardHeaders.set('Authorization', `Bearer ${token}`);
  }

  const rangeHeader = request.headers.get('Range');
  if (rangeHeader) {
    forwardHeaders.set('Range', rangeHeader);
  }

  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch) {
    forwardHeaders.set('If-None-Match', ifNoneMatch);
  }

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      redirect: 'follow',
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 304 && upstreamResponse.status !== 206) {
      return new Response(
        JSON.stringify({
          error: `Upstream storage error: ${upstreamResponse.status} ${upstreamResponse.statusText}`,
          target: filePath,
        }),
        {
          status: upstreamResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Preserve critical media streaming and caching headers
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type, If-None-Match');
    responseHeaders.set('Accept-Ranges', 'bytes');

    if (!responseHeaders.has('Cache-Control')) {
      responseHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Media proxy network error: ${err.message}` }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
