import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

function copyAssetsPlugin() {
  return {
    name: "copy-assets",
    closeBundle() {
      const srcDir = path.resolve(process.cwd(), "assets");
      const destDir = path.resolve(process.cwd(), "dist/assets");
      if (fs.existsSync(srcDir)) {
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.cpSync(srcDir, destDir, { recursive: true, force: true });
      }
    },
  };
}

const mediaMemoryBuffers = new Map();
const resolvedPathCache = new Map();

function mediaProxyPlugin() {
  const handler = async (req, res, next) => {
    const rawUrl = req.url || '';
    const parsedUrl = new URL(rawUrl, 'http://localhost:3000');
    let filePath = '';

    if (parsedUrl.pathname === '/api/media') {
      filePath = parsedUrl.searchParams.get('file') || '';
    } else if (parsedUrl.pathname.startsWith('/assets/audio/') && parsedUrl.pathname.endsWith('.mp3')) {
      filePath = parsedUrl.pathname.replace(/^\/assets\//, '');
    }

    if (filePath) {
      const decodedRelPath = decodeURIComponent(filePath).replace(/^\.?\/+/, '').replace(/^assets\//, '');
      const fileName = decodedRelPath.split('/').pop();
      const ext = path.extname(fileName).toLowerCase();

      const mimeTypes = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // Helper to serve a Buffer with range support in 0ms
      const serveBuffer = (buf, etagValue) => {
        const total = buf.length;
        const range = req.headers.range;
        const etag = etagValue || `"${total.toString(16)}-${fileName}"`;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Authorization, Content-Type, If-None-Match');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('ETag', etag);

        if (req.headers['if-none-match'] === etag) {
          res.statusCode = 304;
          return res.end();
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const partialstart = parts[0];
          const partialend = parts[1];

          const start = parseInt(partialstart, 10);
          const end = partialend ? parseInt(partialend, 10) : total - 1;

          if (isNaN(start) || start >= total || (partialend && end >= total) || start > end) {
            res.statusCode = 416;
            res.setHeader('Content-Range', `bytes */${total}`);
            return res.end();
          }

          const chunk = buf.subarray(start, end + 1);
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
          res.setHeader('Content-Length', chunk.length);

          if (req.method === 'HEAD') {
            return res.end();
          }
          return res.end(chunk);
        } else {
          res.statusCode = 200;
          res.setHeader('Content-Length', total);
          if (req.method === 'HEAD') {
            return res.end();
          }
          return res.end(buf);
        }
      };

      // 1. Check in-memory RAM cache first (Instant 0ms response)
      const cacheKey = fileName.toLowerCase();
      if (mediaMemoryBuffers.has(cacheKey)) {
        const cached = mediaMemoryBuffers.get(cacheKey);
        return serveBuffer(cached.buffer, cached.etag);
      }

      // 2. Check local disk files next
      const localCandidate = path.resolve(process.cwd(), 'assets', decodedRelPath.startsWith('audio/') ? decodedRelPath : `audio/${fileName}`);
      if (fs.existsSync(localCandidate)) {
        try {
          const buf = fs.readFileSync(localCandidate);
          const stat = fs.statSync(localCandidate);
          const etag = `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;
          mediaMemoryBuffers.set(cacheKey, { buffer: buf, etag });
          return serveBuffer(buf, etag);
        } catch (err) {
          console.warn('[Media Proxy] Local read failed, falling back to upstream:', err.message);
        }
      }

      // 3. Query Hugging Face with prioritized showcase/ path
      const hfToken = process.env.HF_ACCESS_TOKEN;
      const hfBaseUrl = process.env.HF_DATASET_URL || 'https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main';

      if (hfToken) {
        try {
          const memorizedPath = resolvedPathCache.get(cacheKey);
          const candidatePaths = memorizedPath
            ? [memorizedPath]
            : [
                `showcase/${fileName}`,
                decodedRelPath,
                `audio/${fileName}`,
                fileName,
              ];
          const uniqueCandidates = [...new Set(candidatePaths.filter(Boolean))];

          let upstreamRes = null;
          let matchedPath = null;

          for (const candidate of uniqueCandidates) {
            const encodedCandidatePath = candidate.split('/').map(encodeURIComponent).join('/');
            const upstreamUrl = `${hfBaseUrl.replace(/\/+$/, '')}/${encodedCandidatePath}`;
            const forwardHeaders = {
              'Authorization': `Bearer ${hfToken}`,
            };

            const r = await fetch(upstreamUrl, {
              headers: forwardHeaders,
              redirect: 'follow',
            });

            if (r.ok || r.status === 206 || r.status === 304) {
              upstreamRes = r;
              matchedPath = candidate;
              resolvedPathCache.set(cacheKey, candidate);
              break;
            }
          }

          if (upstreamRes && (upstreamRes.ok || upstreamRes.status === 206 || upstreamRes.status === 304)) {
            const arrayBuf = await upstreamRes.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            const etag = upstreamRes.headers.get('etag') || `"${buf.length.toString(16)}-${fileName}"`;
            mediaMemoryBuffers.set(cacheKey, { buffer: buf, etag });
            return serveBuffer(buf, etag);
          }
        } catch (e) {
          console.warn('[Media Proxy] Upstream fetch error:', e.message);
        }
      }
    }
    next();
  };

  return {
    name: 'media-proxy-middleware',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [copyAssetsPlugin(), mediaProxyPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    open: false,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
    },
  },
});

