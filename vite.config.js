import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

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

      // Ensure dist/admin/index.html exists as an exact compiled copy matching Cloudflare clean routing
      const distAdminHtml = path.resolve(process.cwd(), "dist/admin.html");
      const distAdminDir = path.resolve(process.cwd(), "dist/admin");
      if (fs.existsSync(distAdminHtml)) {
        if (!fs.existsSync(distAdminDir)) {
          fs.mkdirSync(distAdminDir, { recursive: true });
        }
        fs.copyFileSync(distAdminHtml, path.join(distAdminDir, "index.html"));
      }
    },
  };
}

const mediaMemoryBuffers = new Map();
const resolvedPathCache = new Map();

// Helper to read request body as Buffer or JSON
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          const json = JSON.parse(buffer.toString('utf8'));
          resolve({ buffer, json });
        } catch (err) {
          resolve({ buffer, json: null, error: err });
        }
      } else {
        resolve({ buffer, json: null });
      }
    });
    req.on('error', reject);
  });
}

function adminDesignModePlugin() {
  const handler = async (req, res, next) => {
    const rawUrl = req.url || '';
    const parsedUrl = new URL(rawUrl, 'http://localhost:3000');

    // CORS & Options handling for API
    if (parsedUrl.pathname.startsWith('/api/')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
      }
    }

    // 1. GET /api/admin/schema - Retrieve current published visual schema
    if (parsedUrl.pathname === '/api/admin/schema' && req.method === 'GET') {
      try {
        const metaPath = path.resolve(process.cwd(), 'metadata.json');
        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            success: true,
            schema: meta.designModeSchema || null,
            metadata: {
              name: meta.name,
              description: meta.description
            }
          }));
        }
      } catch (err) {
        console.error('[Admin API] Failed to read schema:', err);
      }
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, schema: null }));
    }

    // 2. POST /api/admin/publish - Securely commit serialized schema to metadata.json & git
    if (parsedUrl.pathname === '/api/admin/publish' && req.method === 'POST') {
      try {
        const { json } = await readRequestBody(req);
        if (!json || !json.schema) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Missing schema payload' }));
        }

        const metaPath = path.resolve(process.cwd(), 'metadata.json');
        let currentMeta = {
          name: "Eko — Producer & Audio Engineer",
          description: "Eko — premium music production, custom beats, mixing, mastering, audio editing, and production lessons.",
          requestFramePermissions: [],
          majorCapabilities: ["MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"]
        };

        if (fs.existsSync(metaPath)) {
          try {
            currentMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          } catch (e) {
            console.warn('[Admin API] Error parsing existing metadata.json, resetting with defaults', e);
          }
        }

        // Attach serialized visual schema to metadata.json
        currentMeta.designModeSchema = {
          ...json.schema,
          lastPublished: new Date().toISOString(),
        };

        fs.writeFileSync(metaPath, JSON.stringify(currentMeta, null, 2), 'utf8');

        // Check if git repository is active, and attempt text commit if available
        let gitCommitted = false;
        let gitMessage = '';
        try {
          execSync('git add metadata.json', { stdio: 'pipe' });
          execSync('git commit -m "chore(design-mode): publish visual schema updates to metadata.json"', { stdio: 'pipe' });
          gitCommitted = true;
          gitMessage = 'Git commit created successfully';
        } catch (gitErr) {
          gitMessage = 'File written to metadata.json (git status: ' + (gitErr.message || 'not a git repo') + ')';
        }

        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          success: true,
          message: 'Visual design schema successfully published to metadata.json',
          gitCommitted,
          gitMessage,
          timestamp: currentMeta.designModeSchema.lastPublished,
          schema: currentMeta.designModeSchema
        }));
      } catch (err) {
        console.error('[Admin API] Publish failed:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Publish failed: ' + err.message }));
      }
    }

    // 3. POST /api/media/upload or POST /api/media - Direct upload to Hugging Face RawStorage pipe + local cache
    if ((parsedUrl.pathname === '/api/media/upload' || parsedUrl.pathname === '/api/media') && req.method === 'POST') {
      try {
        const { json, buffer } = await readRequestBody(req);
        let fileName = '';
        let fileBuffer = null;
        let mimeType = 'application/octet-stream';

        if (json && json.fileData) {
          fileName = json.fileName || `asset_${Date.now()}`;
          mimeType = json.mimeType || mimeType;
          // Decode Base64
          const base64Data = json.fileData.replace(/^data:[^;]+;base64,/, '');
          fileBuffer = Buffer.from(base64Data, 'base64');
        } else if (buffer && buffer.length > 0) {
          fileName = parsedUrl.searchParams.get('fileName') || req.headers['x-file-name'] || `asset_${Date.now()}`;
          fileBuffer = buffer;
          mimeType = req.headers['content-type'] || mimeType;
        }

        if (!fileBuffer || fileBuffer.length === 0) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Empty file payload' }));
        }

        // Clean & sanitize filename
        const cleanFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._\- ]/g, '_');
        const ext = path.extname(cleanFileName).toLowerCase();
        const isAudio = ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'].includes(ext);
        const subFolder = isAudio ? 'audio' : 'images';

        // 1. Write to local assets directory
        const destFolder = path.resolve(process.cwd(), 'assets', subFolder);
        if (!fs.existsSync(destFolder)) {
          fs.mkdirSync(destFolder, { recursive: true });
        }
        const localFilePath = path.join(destFolder, cleanFileName);
        fs.writeFileSync(localFilePath, fileBuffer);

        // 2. Put in RAM cache for instant 0ms streaming playback
        const cacheKey = cleanFileName.toLowerCase();
        const etag = `"${fileBuffer.length.toString(16)}-${Date.now().toString(16)}"`;
        mediaMemoryBuffers.set(cacheKey, { buffer: fileBuffer, etag });

        // 3. Upload upstream to Hugging Face RawStorage if token is configured
        const hfToken = process.env.HF_ACCESS_TOKEN;
        const hfRepo = 'greyhugging/RawStorage';
        const remoteRelPath = `showcase/${cleanFileName}`;
        let hfUploadSuccess = false;
        let hfError = null;

        if (hfToken) {
          try {
            // Commit to Hugging Face via Git LFS / Commit API
            const hfCommitUrl = `https://huggingface.co/api/datasets/${hfRepo}/commit/main`;
            const commitPayload = {
              summary: `Upload ${cleanFileName} via Eko Design Mode`,
              operations: [
                {
                  key: 'file',
                  value: fileBuffer.toString('base64'),
                  encoding: 'base64',
                  path: remoteRelPath
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
              hfUploadSuccess = true;
              resolvedPathCache.set(cacheKey, remoteRelPath);
            } else {
              const errTxt = await hfRes.text();
              console.warn('[Media Proxy] HF commit warning:', hfRes.status, errTxt);
              hfError = `HF status ${hfRes.status}`;
            }
          } catch (e) {
            console.warn('[Media Proxy] HF upload network error:', e.message);
            hfError = e.message;
          }
        }

        // Return clean media proxy URL
        const proxyUrl = `/api/media?file=${encodeURIComponent(cleanFileName)}`;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          success: true,
          fileName: cleanFileName,
          isAudio,
          url: proxyUrl,
          path: remoteRelPath,
          size: fileBuffer.length,
          hfUploadSuccess,
          hfConfigured: Boolean(hfToken),
          hfError
        }));

      } catch (uploadErr) {
        console.error('[Media Upload Error]:', uploadErr);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Media upload failed: ' + uploadErr.message }));
      }
    }

    // 4. Fallback for /admin route - serve admin.html directly
    if (parsedUrl.pathname === '/admin' || parsedUrl.pathname === '/admin/' || parsedUrl.pathname === '/admin.html') {
      const adminPath = path.resolve(process.cwd(), 'admin.html');
      const publicAdminPath = path.resolve(process.cwd(), 'public', 'admin.html');
      const targetPath = fs.existsSync(adminPath) ? adminPath : (fs.existsSync(publicAdminPath) ? publicAdminPath : path.resolve(process.cwd(), 'index.html'));
      if (fs.existsSync(targetPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(fs.readFileSync(targetPath, 'utf8'));
      }
    }

    next();
  };

  return {
    name: 'admin-design-mode-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
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
  base: "/",
  plugins: [copyAssetsPlugin(), adminDesignModePlugin(), mediaProxyPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), "index.html"),
        admin: path.resolve(process.cwd(), "admin.html"),
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

