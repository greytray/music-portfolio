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

function audioStreamingPlugin() {
  const handler = (req, res, next) => {
    const rawUrl = req.url ? req.url.split('?')[0] : '';
    if (rawUrl.startsWith('/assets/audio/') && rawUrl.endsWith('.mp3')) {
      const decodedPath = decodeURIComponent(rawUrl);
      const filePath = path.resolve(process.cwd(), '.' + decodedPath);
      if (!fs.existsSync(filePath)) {
        return next();
      }

      const stat = fs.statSync(filePath);
      const total = stat.size;
      const range = req.headers.range;
      const etag = `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'audio/mpeg');
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

        const stream = fs.createReadStream(filePath, { start, end });
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
        const stream = fs.createReadStream(filePath);
        stream.on('error', () => {
          if (!res.headersSent) res.statusCode = 500;
          res.end();
        });
        stream.pipe(res);
      }
      return;
    }
    next();
  };

  return {
    name: 'audio-streaming-middleware',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [copyAssetsPlugin(), audioStreamingPlugin()],
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

