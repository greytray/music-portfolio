/**
 * Schema Applier Utility
 * Lightweight (<1KB runtime) engine that applies published Design Mode visual overrides
 * directly to storefront elements without requiring the heavy administrative editing suite.
 */

import bundledSchema from '../data/publishedSchema.json';

const STORAGE_KEY = 'eko_published_design_schema';
const BROADCAST_CHANNEL = 'eko_schema_updates';

function camelToKebab(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Filter helper to ensure only valid CSS style property pairs are included in CSS rules
 */
function isValidStyleEntry([key, val]) {
  if (key === 'text' || key === 'media' || key === 'html' || key === 'dataAttributes' || key === 'breakpoints' || key === 'selector') {
    return false;
  }
  return val !== undefined && val !== null && val !== '';
}

/**
 * Compiles a schema object into pure CSS stylesheet text with universal and responsive breakpoint media queries.
 * @param {Object} schema
 * @returns {string}
 */
export function generateCssFromSchema(schema) {
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

    // Breakpoint styles (strictly CSS properties)
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
    sections.push(`  /* Mobile Overrides (margin, padding, sizing) */\n${mobileCssRules.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Applies visual overrides from a schema object onto the current DOM.
 * Supports universal styles and device-specific breakpoints (desktop, tablet, mobile).
 * @param {Object} schema
 * @param {Document} [doc=document]
 */
export function applyDesignSchema(schema, doc = document) {
  if (!doc) return;

  const win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
  const width = win ? win.innerWidth : 1280;

  const explicitPreviewMode = doc.documentElement ? doc.documentElement.getAttribute('data-preview-mode') : null;
  let activeBreakpoint = (explicitPreviewMode && explicitPreviewMode !== 'universal') ? explicitPreviewMode : 'desktop';
  if (!explicitPreviewMode || explicitPreviewMode === 'universal') {
    if (width <= 767) {
      activeBreakpoint = 'mobile';
    } else if (width <= 1023) {
      activeBreakpoint = 'tablet';
    } else {
      activeBreakpoint = 'desktop';
    }
  }

  // Save active schema for responsive recalculation on resize
  doc.__ekoLastActiveSchema = schema;

  // Setup resize listener if not already attached
  if (win && !win.__ekoResizeListenerBound) {
    win.__ekoResizeListenerBound = true;
    let resizeTimer = null;
    win.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (doc && doc.__ekoLastActiveSchema) {
          applyDesignSchema(doc.__ekoLastActiveSchema, doc);
        }
      }, 50);
    });
  }

  // Inject or update stylesheet
  let styleTag = doc.getElementById('eko-design-schema-styles');
  if (!styleTag) {
    styleTag = doc.createElement('style');
    styleTag.id = 'eko-design-schema-styles';
    if (doc.head) {
      doc.head.appendChild(styleTag);
    } else if (doc.body) {
      doc.body.appendChild(styleTag);
    }
  }

  if (!schema || !schema.elements || Object.keys(schema.elements).length === 0) {
    if (styleTag) styleTag.textContent = '';
    // Restore elements that had text/media overrides if resetting/restoring to v0
    if (doc.__ekoOverriddenElements) {
      doc.__ekoOverriddenElements.forEach(el => {
        if (el.__ekoOriginalText !== undefined) {
          if (el.children.length === 0) {
            el.textContent = el.__ekoOriginalText;
          } else {
            el.innerHTML = el.__ekoOriginalHtml !== undefined ? el.__ekoOriginalHtml : el.__ekoOriginalText;
          }
        }
        if (el.__ekoOriginalSrc !== undefined) {
          el.src = el.__ekoOriginalSrc;
        }
        if (el.__ekoOriginalBg !== undefined) {
          el.style.backgroundImage = el.__ekoOriginalBg;
        }
      });
      doc.__ekoOverriddenElements.clear();
    }
    return;
  }

  if (!doc.__ekoOverriddenElements) {
    doc.__ekoOverriddenElements = new Set();
  }

  const elements = schema.elements;

  // 1. Compile CSS Media Queries (Universal, Desktop, Tablet, Mobile)
  const compiledCss = generateCssFromSchema(schema);
  if (styleTag) {
    styleTag.textContent = compiledCss;
  }

  // 2. Apply dynamic DOM properties, text, and media for current active device
  Object.keys(elements).forEach(key => {
    const item = elements[key];
    if (!item) return;
    const selector = item.selector || (key.startsWith('#') || key.startsWith('.') ? key : `#${key}`);
    const el = doc.querySelector(selector);

    if (el) {
      doc.__ekoOverriddenElements.add(el);
      if (el.__ekoOriginalText === undefined) {
        el.__ekoOriginalText = el.textContent || '';
        el.__ekoOriginalHtml = el.innerHTML || '';
      }
      if (el.__ekoOriginalSrc === undefined && (el.tagName === 'IMG' || el.tagName === 'AUDIO' || el.tagName === 'SOURCE')) {
        el.__ekoOriginalSrc = el.getAttribute('src') || '';
      }
      if (el.__ekoOriginalBg === undefined) {
        el.__ekoOriginalBg = el.style.backgroundImage || '';
      }

      // --- TEXT OVERRIDE ---
      // Determine device-specific text first, then universal text, or fallback to original
      let targetText = null;
      let targetHtml = null;

      if (item.breakpoints && item.breakpoints[activeBreakpoint] && item.breakpoints[activeBreakpoint].text !== undefined) {
        targetText = item.breakpoints[activeBreakpoint].text;
        targetHtml = item.breakpoints[activeBreakpoint].html;
      } else if (item.text !== undefined && typeof item.text === 'string') {
        targetText = item.text;
        targetHtml = item.html;
      }

      if (targetText !== null) {
        if (targetHtml) {
          el.innerHTML = targetHtml;
        } else {
          el.textContent = targetText;
        }
      } else if (el.__ekoOriginalText !== undefined) {
        if (el.__ekoOriginalHtml !== undefined && el.__ekoOriginalHtml.includes('<')) {
          el.innerHTML = el.__ekoOriginalHtml;
        } else {
          el.textContent = el.__ekoOriginalText;
        }
      }

      // --- DATA ATTRIBUTES ---
      if (item.dataAttributes && typeof item.dataAttributes === 'object') {
        Object.keys(item.dataAttributes).forEach(attr => {
          el.dataset[attr] = item.dataAttributes[attr];
        });
      }

      // --- MEDIA OVERRIDE (IMAGE / AUDIO) ---
      let targetMedia = null;
      if (item.breakpoints && item.breakpoints[activeBreakpoint] && item.breakpoints[activeBreakpoint].media) {
        targetMedia = item.breakpoints[activeBreakpoint].media;
      } else if (item.media && item.media.src) {
        targetMedia = item.media;
      }

      if (targetMedia && targetMedia.src) {
        if (el.tagName === 'IMG') {
          el.src = targetMedia.src;
        } else if (el.tagName === 'AUDIO' || el.tagName === 'SOURCE') {
          el.src = targetMedia.src;
          if (el.tagName === 'AUDIO') {
            el.load();
          }
        } else if (targetMedia.type === 'image') {
          el.style.backgroundImage = `url("${targetMedia.src}")`;
        } else if (targetMedia.type === 'audio') {
          const audioEl = el.querySelector('audio') || doc.querySelector('#audio');
          if (audioEl) {
            audioEl.src = targetMedia.src;
            audioEl.load();
          }
        }
      } else {
        if (el.__ekoOriginalSrc !== undefined && (el.tagName === 'IMG' || el.tagName === 'AUDIO' || el.tagName === 'SOURCE')) {
          el.src = el.__ekoOriginalSrc;
        }
        if (el.__ekoOriginalBg !== undefined) {
          el.style.backgroundImage = el.__ekoOriginalBg;
        }
      }
    }
  });
}

/**
 * Fetches and initializes the published visual schema on page load.
 * 1. Immediately applies compile-time bundled schema (0ms guarantee across all devices).
 * 2. Checks local cache if newer changes exist on this device.
 * 3. Checks /api/admin/schema, /publishedSchema.json, and /metadata.json for fresh updates.
 * 4. Listens for live updates via BroadcastChannel and Storage events.
 */
export async function initPublishedDesignSchema(doc = document) {
  const countElements = (s) => (s && s.elements ? Object.keys(s.elements).length : 0);

  // 1. Instant compile-time bundled schema application (0ms render on ANY device)
  if (bundledSchema) {
    applyDesignSchema(bundledSchema, doc);
  }

  // 2. Check local storage in case this browser has cached schema
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed) {
        const cachedTime = new Date(parsed.lastUpdated || parsed.lastPublished || 0).getTime();
        const bundledTime = new Date(bundledSchema?.lastUpdated || bundledSchema?.lastPublished || 0).getTime();
        if (cachedTime >= bundledTime) {
          applyDesignSchema(parsed, doc);
        }
      }
    }
  } catch (err) {
    // Ignore storage errors in restricted contexts
  }

  // 3. Setup multi-tab / cross-window live synchronizer
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL);
      bc.onmessage = (event) => {
        if (event.data && event.data.schema) {
          applyDesignSchema(event.data.schema, doc);
        }
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const schema = JSON.parse(e.newValue);
            applyDesignSchema(schema, doc);
          } catch (_) {}
        }
      });
    }
  } catch (_) {}

  // 4. Fetch authoritative schema from backend API with timestamp cache-busting
  try {
    const res = await fetch(`/api/admin/schema?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.schema) {
        applyDesignSchema(data.schema, doc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.schema));
        } catch {}
        return;
      }
    }
  } catch {
    // API unavailable (static host or offline)
  }

  // 5. Fallback: Check /publishedSchema.json static file
  try {
    const fileRes = await fetch(`/publishedSchema.json?t=${Date.now()}`, { cache: 'no-store' });
    if (fileRes.ok) {
      const fileSchema = await fileRes.json();
      if (fileSchema) {
        applyDesignSchema(fileSchema, doc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fileSchema));
        } catch {}
        return;
      }
    }
  } catch {}

  // 6. Fallback: Check /src/data/publishedSchema.json
  try {
    const fileRes = await fetch(`/src/data/publishedSchema.json?t=${Date.now()}`, { cache: 'no-store' });
    if (fileRes.ok) {
      const fileSchema = await fileRes.json();
      if (fileSchema) {
        applyDesignSchema(fileSchema, doc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fileSchema));
        } catch {}
        return;
      }
    }
  } catch {}

  // 7. Fallback: check /metadata.json
  try {
    const metaRes = await fetch(`/metadata.json?t=${Date.now()}`, { cache: 'no-store' });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta && meta.designModeSchema) {
        applyDesignSchema(meta.designModeSchema, doc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(meta.designModeSchema));
        } catch {}
      }
    }
  } catch {}
}

export function broadcastSchemaPublished(schema) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL);
      bc.postMessage({ type: 'SCHEMA_UPDATED', schema });
    }
  } catch (_) {}
}
