// Cloudflare Pages Function: /api/admin/publish
// Handles schema publish operations on Cloudflare Pages (protected by session token)

import { verifySessionToken, extractToken } from '../../_auth.js';
import { getGitHubConfig, commitAndPushFilesToGitHub } from '../../_github.js';

function camelToKebab(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

function isValidStyleEntry([key, val]) {
  if (key === 'text' || key === 'media' || key === 'html' || key === 'dataAttributes' || key === 'breakpoints' || key === 'selector') {
    return false;
  }
  return val !== undefined && val !== null && val !== '';
}

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
    const rawSelector = item.selector || (key.startsWith('#') || key.startsWith('.') ? key : `#${key}`);
    const selector = `html body ${rawSelector}`;

    // Universal styles
    if (item.styles && typeof item.styles === 'object') {
      const declarations = Object.entries(item.styles)
        .filter(isValidStyleEntry)
        .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
        .join(' ');
      if (declarations) {
        universalCssRules.push(`  ${selector} { ${declarations} }`);
      }
    }

    // Breakpoint styles
    if (item.breakpoints && typeof item.breakpoints === 'object') {
      if (item.breakpoints.desktop && typeof item.breakpoints.desktop === 'object') {
        const dDec = Object.entries(item.breakpoints.desktop)
          .filter(isValidStyleEntry)
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (dDec) {
          desktopCssRules.push(`  @media (min-width: 1024px) {\n    ${selector} { ${dDec} }\n  }\n  html[data-preview-mode="desktop"] body ${rawSelector} { ${dDec} }`);
        }
      }

      if (item.breakpoints.tablet && typeof item.breakpoints.tablet === 'object') {
        const tDec = Object.entries(item.breakpoints.tablet)
          .filter(isValidStyleEntry)
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (tDec) {
          tabletCssRules.push(`  @media (min-width: 768px) and (max-width: 1023px) {\n    ${selector} { ${tDec} }\n  }\n  html[data-preview-mode="tablet"] body ${rawSelector} { ${tDec} }`);
        }
      }

      if (item.breakpoints.mobile && typeof item.breakpoints.mobile === 'object') {
        const mDec = Object.entries(item.breakpoints.mobile)
          .filter(isValidStyleEntry)
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (mDec) {
          mobileCssRules.push(`  @media (max-width: 767px) {\n    ${selector} { ${mDec} }\n  }\n  html[data-preview-mode="mobile"] body ${rawSelector} { ${mDec} }`);
        }
      }
    }
  });

  const sections = [];
  if (universalCssRules.length > 0) {
    sections.push(`  /* Universal Overrides */\n${universalCssRules.join('\n')}`);
  }
  if (desktopCssRules.length > 0) {
    sections.push(`  /* Desktop Overrides */\n${desktopCssRules.join('\n')}`);
  }
  if (tabletCssRules.length > 0) {
    sections.push(`  /* Tablet Overrides */\n${tabletCssRules.join('\n')}`);
  }
  if (mobileCssRules.length > 0) {
    sections.push(`  /* Mobile Overrides */\n${mobileCssRules.join('\n')}`);
  }

  return sections.join('\n\n');
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-request',
      },
    });
  }

  if (request.method === 'POST') {
    // Authenticate: Ensure valid admin session exists (cookie, header, or query)
    const token = extractToken(request, new URL(request.url));
    const session = await verifySessionToken(token, env);

    if (!session) {
      return new Response(JSON.stringify({
        success: false,
        error: '401 Unauthorized: Valid administrative session required.'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    try {
      const body = await request.json();
      if (!body || !body.schema) {
        return new Response(JSON.stringify({ success: false, error: 'Missing schema payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const publishedSchema = {
        ...body.schema,
        lastPublished: new Date().toISOString()
      };

      let kvSaved = false;
      let hfSaved = false;

      const elementsCount = publishedSchema.elements ? Object.keys(publishedSchema.elements).length : 0;
      const checkpointId = `cp_${Date.now()}`;

      // Retrieve existing history from KV or fallback
      let history = [];
      if (env && env.EKO_KV) {
        try {
          const stored = await env.EKO_KV.get('designModePublishHistory', { type: 'json' });
          if (Array.isArray(stored)) {
            history = stored;
          }
        } catch (_) {}
      }

      const publishedCount = history.filter(c => c.id !== 'cp_v0' && !c.isV0).length;
      const newCheckpoint = {
        id: checkpointId,
        timestamp: publishedSchema.lastPublished,
        label: body.label || `Checkpoint #${publishedCount + 1}`,
        description: body.description || `${elementsCount} element${elementsCount === 1 ? '' : 's'} customized across canvas`,
        elementsCount,
        schema: publishedSchema
      };

      // Add to front of history list and ensure v0 is preserved at end
      history = [
        newCheckpoint,
        ...history.filter(c => c.id !== checkpointId && c.id !== 'cp_v0' && !c.isV0)
      ];
      history.push({
        id: 'cp_v0',
        timestamp: '2026-09-23T00:00:00.000Z',
        label: 'Checkpoint v0 (Default Baseline)',
        description: 'Default pristine project baseline. Reverting here resets all visual modifications across all devices.',
        elementsCount: 0,
        schema: {
          version: '1.0.0',
          lastUpdated: '2026-09-23T00:00:00.000Z',
          elementsCount: 0,
          elements: {}
        },
        isV0: true
      });

      // 1. Save to Cloudflare KV if bound
      if (env && env.EKO_KV) {
        try {
          await env.EKO_KV.put('designModeSchema', JSON.stringify(publishedSchema));
          await env.EKO_KV.put('designModePublishHistory', JSON.stringify(history));
          kvSaved = true;
        } catch (e) {
          console.warn('[Cloudflare Publish] KV save error:', e.message);
        }
      }

      // 2. Commit schema & history to Hugging Face RawStorage dataset if token available
      const hfToken = (env && env.HF_ACCESS_TOKEN) || '';
      if (hfToken) {
        try {
          const hfCommitUrl = 'https://huggingface.co/api/datasets/greyhugging/RawStorage/commit/main';
          const commitPayload = {
            summary: `Publish design schema checkpoint ${checkpointId} [${publishedSchema.lastPublished}]`,
            operations: [
              {
                key: 'file',
                value: btoa(unescape(encodeURIComponent(JSON.stringify(publishedSchema, null, 2)))),
                encoding: 'base64',
                path: 'schema.json'
              },
              {
                key: 'file',
                value: btoa(unescape(encodeURIComponent(JSON.stringify(history, null, 2)))),
                encoding: 'base64',
                path: 'publishHistory.json'
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
            hfSaved = true;
          }
        } catch (e) {
          console.warn('[Cloudflare Publish] HF commit error:', e.message);
        }
      }

      // 3. Automated Git commit directly to GitHub repository (triggers live deployment)
      let githubPush = null;
      try {
        const ghConfig = getGitHubConfig(env);
        if (ghConfig.isConfigured && ghConfig.autoPush) {
          const compiledCss = generateCssFromSchema(publishedSchema);
          const files = [
            {
              path: 'src/data/publishedSchema.json',
              content: JSON.stringify(publishedSchema, null, 2)
            },
            {
              path: 'public/publishedSchema.json',
              content: JSON.stringify(publishedSchema, null, 2)
            },
            {
              path: 'src/data/publishHistory.json',
              content: JSON.stringify(history, null, 2)
            },
            {
              path: 'public/publishHistory.json',
              content: JSON.stringify(history, null, 2)
            },
            {
              path: 'src/styles/custom-design.css',
              content: compiledCss
            }
          ];

          githubPush = await commitAndPushFilesToGitHub({
            repo: ghConfig.repo,
            branch: ghConfig.branch,
            token: ghConfig.token,
            message: `chore(admin): publish checkpoint ${checkpointId} (${elementsCount} elements) [deploy]`,
            files,
            authorName: ghConfig.authorName,
            authorEmail: ghConfig.authorEmail
          });
        } else {
          console.warn('[Cloudflare Publish] GitHub not configured or autoPush is false');
        }
      } catch (ghErr) {
        console.error('[Cloudflare Publish] GitHub push error:', ghErr.message);
        githubPush = { success: false, error: ghErr.message };
      }

      // If GitHub push failed, fail the request so the admin UI alerts the user
      if (githubPush && !githubPush.success) {
        return new Response(JSON.stringify({
          success: false,
          error: `GitHub deployment push failed: ${githubPush.error}`,
          githubPush
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Visual schema published successfully and pushed to GitHub',
        timestamp: publishedSchema.lastPublished,
        kvSaved,
        hfSaved,
        githubPush,
        checkpoint: newCheckpoint,
        history,
        schema: publishedSchema
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: 'Publish failed: ' + err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
