import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

function copyAssetsPlugin() {
  return {
    name: "copy-assets",
    closeBundle() {
      try {
        const srcDir = path.resolve(process.cwd(), "assets");
        const destDir = path.resolve(process.cwd(), "dist/assets");
        if (fs.existsSync(srcDir)) {
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          fs.cpSync(srcDir, destDir, { recursive: true, force: true });
        }
      } catch (err) {
        // Suppress any non-critical bundle copy error
      }
    },
  };
}

function audioStreamingPlugin() {
  const handler = (req, res, next) => {
    try {
      const rawUrl = req.url ? req.url.split('?')[0] : '';
      if (rawUrl.startsWith('/assets/audio/') && rawUrl.endsWith('.mp3')) {
        let decodedPath;
        try {
          decodedPath = decodeURIComponent(rawUrl);
        } catch {
          return next();
        }
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
          req.on('close', () => {
            stream.destroy();
          });
          stream.on('error', () => {
            if (!res.headersSent) res.statusCode = 500;
            res.end();
          });
          res.on('error', () => {
            stream.destroy();
          });
          stream.pipe(res);
        } else {
          res.statusCode = 200;
          res.setHeader('Content-Length', total);
          if (req.method === 'HEAD') {
            return res.end();
          }
          const stream = fs.createReadStream(filePath);
          req.on('close', () => {
            stream.destroy();
          });
          stream.on('error', () => {
            if (!res.headersSent) res.statusCode = 500;
            res.end();
          });
          res.on('error', () => {
            stream.destroy();
          });
          stream.pipe(res);
        }
        return;
      }
      next();
    } catch {
      next();
    }
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

function studioPreviewPlugin() {
  const handler = (req, res, next) => {
    try {
      const rawUrl = req.url ? req.url.split('?')[0] : '';
      const query = req.url && req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      
      // Ignore internal Vite requests, queries like ?html-proxy, ?import, node_modules, assets, src, and static files
      if (
        rawUrl.startsWith('/@') ||
        rawUrl.startsWith('/node_modules') ||
        rawUrl.startsWith('/assets') ||
        rawUrl.startsWith('/src') ||
        (req.url && (req.url.includes('html-proxy') || req.url.includes('?import'))) ||
        /\.(js|mjs|jsx|ts|tsx|css|json|woff2?|ttf|svg|png|jpe?g|gif|webp|ico|mp3|wav)$/i.test(rawUrl)
      ) {
        return next();
      }

      // Explicitly serve the frontend website when requested for the split-screen preview or /site
      if (
        rawUrl === '/preview-site' ||
        rawUrl === '/site' ||
        rawUrl === '/frontend' ||
        rawUrl.startsWith('/site/') ||
        (req.url && req.url.includes('preview=website'))
      ) {
        req.url = '/index.html' + query;
        return next();
      }

      // Direct requests for index.html should be served as index.html
      if (rawUrl === '/index.html') {
        return next();
      }

      // Default root / and studio paths to the Sanity Studio backend
      if (
        rawUrl === '/' ||
        rawUrl === '/studio' ||
        rawUrl === '/ekonova090' ||
        rawUrl.startsWith('/studio/') ||
        rawUrl.startsWith('/ekonova090/') ||
        rawUrl.startsWith('/structure') ||
        rawUrl.startsWith('/vision') ||
        rawUrl.startsWith('/desk') ||
        rawUrl.startsWith('/intent')
      ) {
        req.url = '/ekonova090.html' + query;
        return next();
      }

      next();
    } catch {
      next();
    }
  };

  return {
    name: 'studio-preview-rewrite',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [copyAssetsPlugin(), audioStreamingPlugin(), studioPreviewPlugin()],
  optimizeDeps: {
    include: [
      "sanity",
      "sanity/structure",
      "@sanity/vision",
      "sanity-plugin-media",
      "react",
      "react-dom",
      "styled-components",
      "lucide-react",
    ],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), "index.html"),
        ekonova090: path.resolve(process.cwd(), "ekonova090.html"),
        studio: path.resolve(process.cwd(), "studio.html"),
      },
      onwarn(warning, defaultHandler) {
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" ||
          (warning.message && warning.message.includes('"use client"'))
        ) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
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

