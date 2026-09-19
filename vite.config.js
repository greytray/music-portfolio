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
      const localFilePath = path.resolve(process.cwd(), 'assets', decodedRelPath);

      // Check if Hugging Face upstream should be queried
      const hfToken = process.env.HF_ACCESS_TOKEN;
      const hfBaseUrl = process.env.HF_DATASET_URL || 'https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main';

      if (hfToken) {
        try {
          const upstreamUrl = `${hfBaseUrl.replace(/\/+$/, '')}/${decodedRelPath}`;
          const forwardHeaders = {};
          forwardHeaders['Authorization'] = `Bearer ${hfToken}`;
          if (req.headers.range) forwardHeaders['Range'] = req.headers.range;
          if (req.headers['if-none-match']) forwardHeaders['If-None-Match'] = req.headers['if-none-match'];

          const upstreamRes = await fetch(upstreamUrl, {
            headers: forwardHeaders,
            redirect: 'follow',
          });

          res.statusCode = upstreamRes.status;
          upstreamRes.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Accept-Ranges', 'bytes');

          if (upstreamRes.body) {
            const reader = upstreamRes.body.getReader();
            const pump = async () => {
              const { done, value } = await reader.read();
              if (done) {
                res.end();
                return;
              }
              res.write(Buffer.from(value));
              await pump();
            };
            await pump();
            return;
          }
        } catch (e) {
          console.warn('[Media Proxy] Upstream fetch error, falling back to local if available:', e.message);
        }
      }

      // Local file fallback
      if (fs.existsSync(localFilePath)) {
        const stat = fs.statSync(localFilePath);
        const total = stat.size;
        const range = req.headers.range;
        const etag = `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;
        const ext = path.extname(localFilePath).toLowerCase();
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

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('ETag', etag);

        if (req.headers['if-none-match'] === etag) {
          res.statusCode = 304;
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

          const chunkSize = end - start + 1;
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
          res.setHeader('Content-Length', chunkSize);

          if (req.method === 'HEAD') {
            return res.end();
          }

          const stream = fs.createReadStream(localFilePath, { start, end });
          stream.on('error', () => {
            if (!res.headersSent) res.statusCode = 500;
            res.end();
          });
          stream.pipe(res);
        } else {
          res.statusCode = 200;
          res.setHeader('Content-Length', total);
          if (req.method === 'HEAD') {
            return res.end();
          }
          const stream = fs.createReadStream(localFilePath);
          stream.on('error', () => {
            if (!res.headersSent) res.statusCode = 500;
            res.end();
          });
          stream.pipe(res);
        }
        return;
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

