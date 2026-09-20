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

  // Handle POST upload requests
  if (request.method === 'POST') {
    try {
      const contentType = request.headers.get('content-type') || '';
      let fileName = '';
      let fileBuffer = null;

      if (contentType.includes('application/json')) {
        const body = await request.json();
        fileName = body.fileName || `asset_${Date.now()}`;
        const base64Data = (body.fileData || '').replace(/^data:[^;]+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileBuffer = bytes;
      } else {
        const url = new URL(request.url);
        fileName = url.searchParams.get('fileName') || request.headers.get('x-file-name') || `asset_${Date.now()}`;
        fileBuffer = new Uint8Array(await request.arrayBuffer());
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return new Response(JSON.stringify({ error: 'Empty file payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const token = (env && env.HF_ACCESS_TOKEN) || (typeof process !== 'undefined' && process.env && process.env.HF_ACCESS_TOKEN) || '';
      const hfRepo = 'greyhugging/RawStorage';
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, '_');
      const remotePath = `showcase/${cleanFileName}`;

      if (token) {
        // Base64 encode file for HF Commit API
        let binary = '';
        for (let i = 0; i < fileBuffer.byteLength; i++) {
          binary += String.fromCharCode(fileBuffer[i]);
        }
        const b64 = btoa(binary);

        const hfCommitUrl = `https://huggingface.co/api/datasets/${hfRepo}/commit/main`;
        const commitRes = await fetch(hfCommitUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: `Upload ${cleanFileName} via Eko Design Mode`,
            operations: [
              {
                key: 'file',
                value: b64,
                encoding: 'base64',
                path: remotePath
              }
            ]
          })
        });

        if (!commitRes.ok) {
          const errText = await commitRes.text();
          console.warn('HF commit error:', commitRes.status, errText);
        }
      }

      const proxyUrl = `/api/media?file=${encodeURIComponent(cleanFileName)}`;
      return new Response(JSON.stringify({
        success: true,
        fileName: cleanFileName,
        url: proxyUrl,
        path: remotePath,
        hfConfigured: Boolean(token)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (postErr) {
      return new Response(JSON.stringify({ error: postErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  const url = new URL(request.url);

  // Read target file path from query parameter (?file=showcase/song.mp3) or subpath
  let rawFile = url.searchParams.get('file') || url.pathname.replace(/^\/api\/media\/?/, '');

  if (!rawFile) {
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

  // Normalize path: decode first to handle already encoded characters, then strip redundant prefixes
  let decodedPath = decodeURIComponent(rawFile).replace(/^\.?\/+/, '').replace(/^assets\//, '');
  const fileName = decodedPath.split('/').pop();

  // Candidate paths to check in the repository structure (prioritize showcase/ first)
  const candidatePaths = [
    `showcase/${fileName}`,
    decodedPath,
    `audio/${fileName}`,
    fileName,
  ];
  // Deduplicate candidate paths
  const uniqueCandidates = [...new Set(candidatePaths.filter(Boolean))];

  // Configurable asset storage: reads from env variable or defaults to Hugging Face dataset URL
  const baseUrl = (env && env.HF_DATASET_URL)
    ? env.HF_DATASET_URL.replace(/\/+$/, '')
    : 'https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main';

  // Secure server-side access token from environment (Cloudflare Pages Dashboard secret)
  const token = (env && env.HF_ACCESS_TOKEN) || (typeof process !== 'undefined' && process.env && process.env.HF_ACCESS_TOKEN) || '';

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
    let upstreamResponse = null;
    let successfulCandidate = null;

    for (const candidate of uniqueCandidates) {
      const encodedCandidatePath = candidate.split('/').map(encodeURIComponent).join('/');
      const targetUrl = `${baseUrl}/${encodedCandidatePath}`;

      const res = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        redirect: 'follow',
      });

      if (res.ok || res.status === 206 || res.status === 304) {
        upstreamResponse = res;
        successfulCandidate = candidate;
        break;
      } else if (res.status !== 404 && !upstreamResponse) {
        upstreamResponse = res;
      }
    }

    if (!upstreamResponse || (!upstreamResponse.ok && upstreamResponse.status !== 304 && upstreamResponse.status !== 206)) {
      const status = upstreamResponse ? upstreamResponse.status : 404;
      return new Response(
        JSON.stringify({
          error: `Upstream storage error: ${status}`,
          requested: decodedPath,
          candidatesTested: uniqueCandidates,
        }),
        {
          status,
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

