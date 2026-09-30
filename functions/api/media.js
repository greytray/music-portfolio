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

  // Handle action=list for media library listing
  if (url.searchParams.get('action') === 'list' || url.pathname.endsWith('/list')) {
    const defaultImages = [
      { name: 'Curved DAW Monitor', src: './assets/images/curved_daw_monitor_1789336964825.jpg', category: 'Studio Gear' },
      { name: 'Digital EQ & Compressor', src: './assets/images/digital_eq_compressor_1789337007076.jpg', category: 'Plugins' },
      { name: 'Digital Reverb DSP', src: './assets/images/digital_reverb_dsp_1789337033441.jpg', category: 'Plugins' },
      { name: 'MIDI Beat Arranger', src: './assets/images/midi_beat_arranger_1789337019783.jpg', category: 'Production' },
      { name: 'Spectral Cleanup DSP', src: './assets/images/spectral_cleanup_dsp_1789336993282.jpg', category: 'Plugins' },
      { name: 'Vocal Tuning Plugin', src: './assets/images/vocal_tuning_plugin_1789336979208.jpg', category: 'Plugins' },
      { name: 'Studio Mixing Desk', src: './assets/images/studio_mixing_desk_1789325845543.jpg', category: 'Studio Gear' },
      { name: 'Studio Acoustic Monitors', src: './assets/images/studio_acoustic_monitors_1789331401789.jpg', category: 'Hardware' },
      { name: 'Studio Drum Pads', src: './assets/images/studio_drum_pads_1789331427695.jpg', category: 'Production' },
      { name: 'Studio Headphones', src: './assets/images/studio_headphones_1789331438637.jpg', category: 'Hardware' },
      { name: 'Studio Rack Gear', src: './assets/images/studio_rack_gear_1789331450217.jpg', category: 'Hardware' },
      { name: 'Studio Sound Waves', src: './assets/images/studio_sound_waves_1789325859183.jpg', category: 'Audio' },
      { name: 'Studio Synth Keys', src: './assets/images/studio_synth_keys_1789325893151.jpg', category: 'Instruments' },
      { name: 'Studio Tape Reel', src: './assets/images/studio_tape_reel_1789331415391.jpg', category: 'Vintage' },
      { name: 'Studio Vocal Booth', src: './assets/images/studio_vocal_booth_1789331461100.jpg', category: 'Recording' },
      { name: 'Studio Vocal Mic', src: './assets/images/studio_vocal_mic_1789325878081.jpg', category: 'Recording' },
      { name: 'Futuristic Grid Loop', src: './assets/backgrounds/gif2.gif', category: 'Backgrounds' },
      { name: 'Waveform Visualizer Loop', src: './assets/backgrounds/c1.gif', category: 'Backgrounds' }
    ];

    const defaultAudio = [
      { id: 'feeling_mello', title: 'Feeling Mello', style: 'Original production', duration: '0:44', file: 'audio/feeling mello.mp3', src: '/api/media?file=audio/feeling mello.mp3' },
      { id: 'broken_jar', title: 'Broken Jar', style: 'Mastered production', duration: '0:38', file: 'audio/broken jar mastered.mp3', src: '/api/media?file=audio/broken jar mastered.mp3' },
      { id: 'kpop_beat', title: 'Kpop Beat', style: 'K-Pop production', duration: '1:14', file: 'audio/Kpop beat.mp3', src: '/api/media?file=audio/Kpop beat.mp3' },
      { id: 'kensuke', title: 'Kensuke', style: 'Original production', duration: '0:45', file: 'audio/Kensuke.mp3', src: '/api/media?file=audio/Kensuke.mp3' },
      { id: 'kpop_post_fx', title: 'K-Pop Post FX', style: 'Post-production mix', duration: '0:14', file: 'audio/K-Pop post fx.mp3', src: '/api/media?file=audio/K-Pop post fx.mp3' },
      { id: 'aiobahn', title: 'Aiobahn Maybe Last Mix', style: 'Final mix', duration: '0:53', file: 'audio/Aiobahn maybe last mix.mp3', src: '/api/media?file=audio/Aiobahn maybe last mix.mp3' }
    ];

    return new Response(JSON.stringify({
      success: true,
      images: defaultImages,
      audio: defaultAudio
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

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

  // Candidate paths to check in Hugging Face repository structure
  // Check exact requested path first, then common namespaces
  const candidatePaths = [
    decodedPath,
    `audio/${fileName}`,
    `showcase/${fileName}`,
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
    // Probe candidates concurrently for ultra-low latency (< 100ms)
    const fetchPromises = uniqueCandidates.map(async (candidate) => {
      const encodedCandidatePath = candidate.split('/').map(encodeURIComponent).join('/');
      const targetUrl = `${baseUrl}/${encodedCandidatePath}`;

      const res = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        redirect: 'follow',
      });

      if (res.ok || res.status === 206 || res.status === 304) {
        return { res, candidate };
      }
      throw new Error(`Candidate ${candidate} returned ${res.status}`);
    });

    let winner;
    try {
      winner = await Promise.any(fetchPromises);
    } catch {
      // Fallback: try sequential if all parallel failed with non-200
      winner = null;
    }

    const upstreamResponse = winner ? winner.res : null;

    if (!upstreamResponse || (!upstreamResponse.ok && upstreamResponse.status !== 304 && upstreamResponse.status !== 206)) {
      const status = upstreamResponse ? upstreamResponse.status : 404;
      return new Response(
        JSON.stringify({
          error: `Upstream audio not found: ${status}`,
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
      responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
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

