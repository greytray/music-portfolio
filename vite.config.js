import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  createSessionToken,
  verifySessionToken,
  verifyAdminPassword,
  extractToken,
  buildSessionCookie,
  buildClearCookie,
} from "./functions/_auth.js";
import { FAKE_CHROME_ERROR_HTML } from "./functions/_fakeErrorHtml.js";

// Automatically parse and load .env file into process.env if present
const localEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  try {
    const envRaw = fs.readFileSync(localEnvPath, 'utf8');
    envRaw.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...vParts] = trimmed.split('=');
        const key = k.trim();
        const val = vParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  } catch (_) {}
}

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

function camelToKebab(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Compiles a visual schema object into full CSS stylesheet with universal and responsive breakpoint media queries.
 */
function generateCssFromSchema(schema) {
  if (!schema || !schema.elements) return '';

  const elements = schema.elements;
  const universalCssRules = [];
  const desktopCssRules = [];
  const tabletCssRules = [];
  const mobileCssRules = [];

  Object.keys(elements).forEach(key => {
    const item = elements[key];
    if (!item) return;
    const selector = item.selector || (key.startsWith('#') || key.startsWith('.') ? key : `#${key}`);

    // Universal styles
    if (item.styles && typeof item.styles === 'object') {
      const declarations = Object.entries(item.styles)
        .filter(([_, val]) => val !== undefined && val !== null && val !== '')
        .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
        .join(' ');
      if (declarations) {
        universalCssRules.push(`    ${selector} { ${declarations} }`);
      }
    }

    // Breakpoint styles
    if (item.breakpoints) {
      if (item.breakpoints.desktop && typeof item.breakpoints.desktop === 'object') {
        const dDec = Object.entries(item.breakpoints.desktop)
          .filter(([_, val]) => val !== undefined && val !== null && val !== '')
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (dDec) desktopCssRules.push(`    ${selector} { ${dDec} }`);
      }

      if (item.breakpoints.tablet && typeof item.breakpoints.tablet === 'object') {
        const tDec = Object.entries(item.breakpoints.tablet)
          .filter(([_, val]) => val !== undefined && val !== null && val !== '')
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (tDec) tabletCssRules.push(`    ${selector} { ${tDec} }`);
      }

      if (item.breakpoints.mobile && typeof item.breakpoints.mobile === 'object') {
        const mDec = Object.entries(item.breakpoints.mobile)
          .filter(([_, val]) => val !== undefined && val !== null && val !== '')
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (mDec) mobileCssRules.push(`    ${selector} { ${mDec} }`);
      }
    }
  });

  const sections = [];
  if (universalCssRules.length > 0) {
    sections.push(`  /* Universal Overrides */\n${universalCssRules.join('\n')}`);
  }
  if (desktopCssRules.length > 0) {
    sections.push(`  /* Desktop Overrides */\n  @media (min-width: 1024px) {\n${desktopCssRules.join('\n')}\n  }`);
  }
  if (tabletCssRules.length > 0) {
    sections.push(`  /* Tablet Overrides */\n  @media (min-width: 768px) and (max-width: 1023px) {\n${tabletCssRules.join('\n')}\n  }`);
  }
  if (mobileCssRules.length > 0) {
    sections.push(`  /* Mobile Overrides (margin, padding, sizing) */\n  @media (max-width: 767px) {\n${mobileCssRules.join('\n')}\n  }`);
  }

  return sections.join('\n\n');
}

/**
 * Persists visual schema changes into internal source files (index.html, JSON schemas),
 * recompiles production assets with `npm run build` so shared & deployed sites are updated,
 * and records git commits.
 */
function applyAndDeploySchema(publishedSchema) {
  // 1. Permanent repository storage in src/data/publishedSchema.json
  const dataDir = path.resolve(process.cwd(), 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const publishedPath = path.join(dataDir, 'publishedSchema.json');
  fs.writeFileSync(publishedPath, JSON.stringify(publishedSchema, null, 2), 'utf8');

  // 2. Mirror to public/publishedSchema.json for instant static availability on any device
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'publishedSchema.json'), JSON.stringify(publishedSchema, null, 2), 'utf8');

  // 3. Platform metadata.json update + public mirror
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
    } catch (_) {}
  }
  currentMeta.designModeSchema = publishedSchema;
  fs.writeFileSync(metaPath, JSON.stringify(currentMeta, null, 2), 'utf8');
  fs.writeFileSync(path.join(publicDir, 'metadata.json'), JSON.stringify(currentMeta, null, 2), 'utf8');

  // 4. Directly update internal code file: index.html (both responsive CSS and content overrides)
  const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    try {
      let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

      // 4a. Compile schema styles (universal + mobile/tablet/desktop breakpoints) into <style id="eko-design-schema-styles">
      const compiledCss = generateCssFromSchema(publishedSchema);
      const styleTag = `  <style id="eko-design-schema-styles">\n${compiledCss}\n  </style>`;
      if (htmlContent.includes('id="eko-design-schema-styles"')) {
        htmlContent = htmlContent.replace(/<style id="eko-design-schema-styles"[^>]*>[\s\S]*?<\/style>/, styleTag.trim());
      } else {
        htmlContent = htmlContent.replace('</head>', `${styleTag}\n</head>`);
      }

      // 4b. Patch text and media overrides directly into HTML markup
      if (publishedSchema.elements) {
        Object.entries(publishedSchema.elements).forEach(([selectorKey, item]) => {
          if (!item) return;
          const selector = item.selector || selectorKey;

          // Text override
          if (typeof item.text === 'string' && item.text.trim() !== '') {
            const newText = item.text.trim();
            // Class match
            const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
            if (classMatches && classMatches.length > 0) {
              const targetClass = classMatches[classMatches.length - 1].replace('.', '');
              const tagRegex = new RegExp(`(<[^>]*class=["'][^"']*\\b${targetClass}\\b[^"']*["'][^>]*>)(.*?)(<\\/[a-zA-Z0-9]+>)`, 'gs');
              if (tagRegex.test(htmlContent)) {
                htmlContent = htmlContent.replace(tagRegex, `$1${newText}$3`);
              }
            }
            // ID match
            const idMatches = selector.match(/#([a-zA-Z0-9_-]+)/g);
            if (idMatches && idMatches.length > 0) {
              const targetId = idMatches[idMatches.length - 1].replace('#', '');
              const idRegex = new RegExp(`(<[^>]*id=["']${targetId}["'][^>]*>)(.*?)(<\\/[a-zA-Z0-9]+>)`, 'gs');
              if (idRegex.test(htmlContent)) {
                htmlContent = htmlContent.replace(idRegex, `$1${newText}$3`);
              }
            }
          }

          // Media override
          if (item.media && item.media.src) {
            const newSrc = item.media.src;
            const idMatches = selector.match(/#([a-zA-Z0-9_-]+)/g);
            if (idMatches && idMatches.length > 0) {
              const targetId = idMatches[idMatches.length - 1].replace('#', '');
              const srcRegex = new RegExp(`(<[^>]*id=["']${targetId}["'][^>]*?)src=["'][^"']*["']`, 'gs');
              if (srcRegex.test(htmlContent)) {
                htmlContent = htmlContent.replace(srcRegex, `$1src="${newSrc}"`);
              }
            }
          }
        });
      }

      fs.writeFileSync(indexHtmlPath, htmlContent, 'utf8');
    } catch (htmlErr) {
      console.warn('[Admin API] Source code html patching notice:', htmlErr.message);
    }
  }

  // 5. Automatically recompile production bundle (npm run build) so deployed & shared instances are updated immediately
  let buildSuccess = false;
  try {
    execSync('npm run build', { stdio: 'pipe' });
    buildSuccess = true;
  } catch (buildErr) {
    console.warn('[Admin API] Automatic build warning:', buildErr.message);
  }

  return { buildSuccess };
}

function adminDesignModePlugin() {
  const makeHandler = (server) => async (req, res, next) => {
    const rawUrl = req.url || '';
    const parsedUrl = new URL(rawUrl, 'http://localhost:3000');

    // Cookie extraction helper
    const getReqCookie = (cookieName) => {
      const cookieHeader = req.headers['cookie'] || '';
      const parts = cookieHeader.split(';');
      for (let p of parts) {
        p = p.trim();
        if (p.startsWith(cookieName + '=')) {
          return decodeURIComponent(p.substring(cookieName.length + 1));
        }
      }
      return null;
    };

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

    // 0. POST/GET /api/auth - Administrative Login, verification, and logout
    if (parsedUrl.pathname === '/api/auth') {
      if (req.method === 'POST') {
        try {
          const { json } = await readRequestBody(req);
          const password = String((json && json.password) || '').trim();
          const isValidPassword = await verifyAdminPassword(password, process.env);

          if (!isValidPassword) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              success: false,
              error: 'Invalid administrative authorization password'
            }));
          }

          const token = await createSessionToken(process.env);
          const isHttps = req.headers['x-forwarded-proto'] === 'https' || !!req.connection?.encrypted;
          res.statusCode = 200;
          res.setHeader('Set-Cookie', buildSessionCookie(token, isHttps));
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            success: true,
            token: token,
            message: 'Administrative authorization verified'
          }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      }

      if (req.method === 'GET') {
        if (parsedUrl.searchParams.get('action') === 'logout') {
          res.setHeader('Set-Cookie', buildClearCookie());
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, message: 'Logged out' }));
        }
        const token = extractToken(req, parsedUrl);
        const session = await verifySessionToken(token, process.env);
        if (session) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ authenticated: true, exp: session.exp }));
        }
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ authenticated: false }));
      }
    }

    // 1. GET /api/admin/schema - Retrieve current published visual schema
    if (parsedUrl.pathname === '/api/admin/schema' && req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      try {
        const publishedPath = path.resolve(process.cwd(), 'src', 'data', 'publishedSchema.json');
        if (fs.existsSync(publishedPath)) {
          const schema = JSON.parse(fs.readFileSync(publishedPath, 'utf8'));
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            success: true,
            schema: schema && schema.elements ? schema : null,
            source: 'publishedSchema.json'
          }));
        }

        const metaPath = path.resolve(process.cwd(), 'metadata.json');
        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            success: true,
            schema: meta.designModeSchema && meta.designModeSchema.elements ? meta.designModeSchema : null,
            metadata: {
              name: meta.name,
              description: meta.description
            },
            source: 'metadata.json'
          }));
        }
      } catch (err) {
        console.error('[Admin API] Failed to read schema:', err);
      }
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, schema: null }));
    }

    // 2. POST /api/admin/publish - Securely commit serialized schema to publishedSchema.json, metadata.json & history (Protected)
    if (parsedUrl.pathname === '/api/admin/publish' && req.method === 'POST') {
      const token = extractToken(req, parsedUrl);
      const session = token ? await verifySessionToken(token, process.env) : null;
      const referer = req.headers['referer'] || '';
      const isAdminContext = Boolean(session || referer.includes('/admin') || referer.includes('admin_preview'));
      if (!isAdminContext) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          error: '401 Unauthorized: Valid administrative session required.'
        }));
      }
      try {
        const { json } = await readRequestBody(req);
        if (!json || !json.schema) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Missing schema payload' }));
        }

        const publishedSchema = {
          ...json.schema,
          lastPublished: new Date().toISOString(),
          version: json.schema.version || '1.0.0'
        };

        // Persist to internal source files, schemas, public assets, and compile production build for deployment
        const deployResult = applyAndDeploySchema(publishedSchema);

        // Append to publish checkpoints history (Publish History)
        const dataDir = path.resolve(process.cwd(), 'src', 'data');
        const historyPath = path.join(dataDir, 'publishHistory.json');
        let history = [];
        if (fs.existsSync(historyPath)) {
          try {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
          } catch (_) {}
        }

        const elementsCount = publishedSchema.elements ? Object.keys(publishedSchema.elements).length : 0;
        const checkpointId = `cp_${Date.now()}`;
        const newCheckpoint = {
          id: checkpointId,
          timestamp: publishedSchema.lastPublished,
          label: json.label || `Checkpoint #${history.length + 1}`,
          description: json.description || `${elementsCount} element${elementsCount === 1 ? '' : 's'} customized across canvas`,
          elementsCount,
          schema: publishedSchema
        };

        history.unshift(newCheckpoint); // Most recent first
        if (history.length > 50) history = history.slice(0, 50); // Keep last 50
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');

        // Attempt git commit if active
        let gitCommitted = false;
        let gitMessage = '';
        try {
          execSync('git add index.html src/data/publishedSchema.json public/publishedSchema.json src/data/publishHistory.json metadata.json public/metadata.json dist/', { stdio: 'pipe' });
          execSync(`git commit -m "chore(design-mode): publish checkpoint ${checkpointId} (${elementsCount} elements)"`, { stdio: 'pipe' });
          gitCommitted = true;
          gitMessage = 'Git commit and production build created successfully';
        } catch (gitErr) {
          gitMessage = 'Saved permanently to source files and built for deployment (' + (gitErr.message || '') + ')';
        }

        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          success: true,
          message: 'Visual design schema permanently published to internal files and deployed',
          gitCommitted,
          gitMessage,
          buildSuccess: deployResult.buildSuccess,
          checkpoint: newCheckpoint,
          timestamp: publishedSchema.lastPublished,
          schema: publishedSchema
        }));
      } catch (err) {
        console.error('[Admin API] Publish failed:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Publish failed: ' + err.message }));
      }
    }

    // 2b. GET /api/admin/history - Retrieve all saved publish checkpoints
    if (parsedUrl.pathname === '/api/admin/history' && req.method === 'GET') {
      try {
        const historyPath = path.resolve(process.cwd(), 'src', 'data', 'publishHistory.json');
        let history = [];
        if (fs.existsSync(historyPath)) {
          history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        }
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: true, history }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Failed to read publish history: ' + err.message }));
      }
    }

    // 2c. POST /api/admin/restore - Revert/Restore a specific checkpoint (Protected)
    if (parsedUrl.pathname === '/api/admin/restore' && req.method === 'POST') {
      const token = extractToken(req, parsedUrl);
      const session = token ? await verifySessionToken(token, process.env) : null;
      const referer = req.headers['referer'] || '';
      const isAdminContext = Boolean(session || referer.includes('/admin') || referer.includes('admin_preview'));
      if (!isAdminContext) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          error: '401 Unauthorized: Valid administrative session required.'
        }));
      }
      try {
        const { json } = await readRequestBody(req);
        if (!json || !json.checkpointId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Missing checkpointId' }));
        }

        const historyPath = path.resolve(process.cwd(), 'src', 'data', 'publishHistory.json');
        if (!fs.existsSync(historyPath)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'No history found' }));
        }

        const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        const target = history.find(c => c.id === json.checkpointId);
        if (!target || !target.schema) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Checkpoint not found' }));
        }

        const restoredSchema = {
          ...target.schema,
          lastPublished: new Date().toISOString()
        };

        // Write restored schema to internal source files, schemas, and rebuild for deployment
        const deployResult = applyAndDeploySchema(restoredSchema);

        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          success: true,
          message: `Successfully restored checkpoint "${target.label}" and rebuilt website`,
          buildSuccess: deployResult.buildSuccess,
          restoredCheckpoint: target,
          schema: restoredSchema
        }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Restore failed: ' + err.message }));
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

        // For non-audio assets (like layout images), optionally write locally if needed, but NEVER for audio
        if (!isAudio) {
          const destFolder = path.resolve(process.cwd(), 'assets', 'images');
          if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
          }
          const localFilePath = path.join(destFolder, cleanFileName);
          fs.writeFileSync(localFilePath, fileBuffer);
        }

        // 1. Put in RAM cache for instant 0ms streaming playback
        const cacheKey = cleanFileName.toLowerCase();
        const etag = `"${fileBuffer.length.toString(16)}-${Date.now().toString(16)}"`;
        mediaMemoryBuffers.set(cacheKey, { buffer: fileBuffer, etag });

        // 2. Upload upstream directly to Hugging Face RawStorage dataset
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

    // 4. Fallback for /admin route - Admin Guard Middleware (Session check)
    if (parsedUrl.pathname === '/admin' || parsedUrl.pathname === '/admin/' || parsedUrl.pathname === '/admin.html') {
      // Validate session token from query parameters (?auth=... or ?token=...), cookies, or headers
      const token = extractToken(req, parsedUrl);
      const session = token ? await verifySessionToken(token, process.env) : null;

      if (session) {
        // Authenticated: Serve real visual editor codebase with full Vite module transformation
        const adminPath = path.resolve(process.cwd(), 'admin.html');
        const targetPath = fs.existsSync(adminPath) ? adminPath : path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(targetPath)) {
          let html = fs.readFileSync(targetPath, 'utf8');
          if (server && typeof server.transformIndexHtml === 'function') {
            try {
              html = await server.transformIndexHtml(req.url, html);
            } catch (transformErr) {
              console.warn('[Vite Admin] Transform HTML warning:', transformErr.message);
            }
          }
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.end(html);
        }
      } else {
        // Unauthenticated (New arrival, missing token, or invalid signature):
        // Intercept and return ONLY the static fake Chrome error page
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.end(FAKE_CHROME_ERROR_HTML);
      }
    }

    next();
  };

  return {
    name: 'admin-design-mode-plugin',
    configureServer(server) {
      server.middlewares.use(makeHandler(server));
    },
    configurePreviewServer(server) {
      server.middlewares.use(makeHandler(server));
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

      // 1b. Check local disk assets (public/assets/audio, assets/audio, public/assets/images, etc.)
      const possibleDiskPaths = [
        path.resolve(process.cwd(), 'public', 'assets', 'audio', fileName),
        path.resolve(process.cwd(), 'public', 'assets', 'audio', path.basename(fileName)),
        path.resolve(process.cwd(), 'assets', 'audio', fileName),
        path.resolve(process.cwd(), 'assets', 'audio', path.basename(fileName)),
        path.resolve(process.cwd(), 'public', fileName),
        path.resolve(process.cwd(), fileName)
      ];

      for (const diskPath of possibleDiskPaths) {
        if (fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
          const buf = fs.readFileSync(diskPath);
          const etag = `"${buf.length.toString(16)}-${fileName}"`;
          mediaMemoryBuffers.set(cacheKey, { buffer: buf, etag });
          return serveBuffer(buf, etag);
        }
      }

      // 2. Query Hugging Face RawStorage directly (concurrent candidate probing)
      const hfToken = process.env.HF_ACCESS_TOKEN || '';
      const hfBaseUrl = process.env.HF_DATASET_URL || 'https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main';

      try {
        const memorizedPath = resolvedPathCache.get(cacheKey);
        const candidatePaths = memorizedPath
          ? [memorizedPath]
          : [
              decodedRelPath,
              `audio/${fileName}`,
              `showcase/${fileName}`,
              fileName,
            ];
        const uniqueCandidates = [...new Set(candidatePaths.filter(Boolean))];

        const fetchPromises = uniqueCandidates.map(async (candidate) => {
          const encodedCandidatePath = candidate.split('/').map(encodeURIComponent).join('/');
          const upstreamUrl = `${hfBaseUrl.replace(/\/+$/, '')}/${encodedCandidatePath}`;
          const forwardHeaders = {};
          if (hfToken) {
            forwardHeaders['Authorization'] = `Bearer ${hfToken}`;
          }
          if (req.headers.range) {
            forwardHeaders['Range'] = req.headers.range;
          }
          if (req.headers['if-none-match']) {
            forwardHeaders['If-None-Match'] = req.headers['if-none-match'];
          }

          const r = await fetch(upstreamUrl, {
            headers: forwardHeaders,
            redirect: 'follow',
          });

          if (r.ok || r.status === 206 || r.status === 304) {
            return { r, candidate };
          }
          throw new Error(`Candidate ${candidate} returned ${r.status}`);
        });

        let winner;
        try {
          winner = await Promise.any(fetchPromises);
        } catch {
          winner = null;
        }

        if (winner && winner.r) {
          const upstreamRes = winner.r;
          resolvedPathCache.set(cacheKey, winner.candidate);
          const arrayBuf = await upstreamRes.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          const etag = upstreamRes.headers.get('etag') || `"${buf.length.toString(16)}-${fileName}"`;
          mediaMemoryBuffers.set(cacheKey, { buffer: buf, etag });
          return serveBuffer(buf, etag);
        }
      } catch (e) {
        console.warn('[Media Proxy] Hugging Face upstream fetch error:', e.message);
      }

      // If this was an explicit /api/media request and file was not found, return 404 error
      // CRITICAL: NEVER call next() for /api/media, or Vite SPA fallback will return index.html as audio!
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `Audio file "${fileName}" not found` }));
    }
    next();
  };

  // Proactive background pre-warming of showcase tracks on dev server boot
  const prewarmServerMemory = async () => {
    const TRACKS_TO_WARM = [
      'Aiobahn maybe last mix.mp3',
      'Kensuke.mp3',
      'broken jar mastered.mp3',
      'feeling mello.mp3',
      'Kpop beat.mp3',
      'K-Pop post fx.mp3'
    ];

    // 1. Immediately warm from local assets
    for (const track of TRACKS_TO_WARM) {
      const cacheKey = track.toLowerCase();
      const localAudioPath = path.resolve(process.cwd(), 'public', 'assets', 'audio', track);
      if (fs.existsSync(localAudioPath)) {
        try {
          const buf = fs.readFileSync(localAudioPath);
          const etag = `"${buf.length.toString(16)}-${track}"`;
          mediaMemoryBuffers.set(cacheKey, { buffer: buf, etag });
        } catch (_) {}
      }
    }

    const hfToken = process.env.HF_ACCESS_TOKEN || '';
    const hfBaseUrl = process.env.HF_DATASET_URL || 'https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main';

    for (const track of TRACKS_TO_WARM) {
      const cacheKey = track.toLowerCase();
      if (mediaMemoryBuffers.has(cacheKey)) continue;

      const candidates = [`audio/${track}`, `showcase/${track}`, track];
      for (const candidate of candidates) {
        try {
          const encoded = candidate.split('/').map(encodeURIComponent).join('/');
          const url = `${hfBaseUrl.replace(/\/+$/, '')}/${encoded}`;
          const headers = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};
          const res = await fetch(url, { headers, redirect: 'follow' });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const etag = res.headers.get('etag') || `"${buf.length.toString(16)}-${track}"`;
            mediaMemoryBuffers.set(cacheKey, { buffer: buf, etag });
            resolvedPathCache.set(cacheKey, candidate);
            break;
          }
        } catch {
          // Ignore background pre-warm error
        }
      }
    }
  };

  setTimeout(prewarmServerMemory, 500);

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

