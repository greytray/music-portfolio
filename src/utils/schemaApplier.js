/**
 * Schema Applier Utility
 * Lightweight (<1KB runtime) engine that applies published Design Mode visual overrides
 * directly to storefront elements without requiring the heavy administrative editing suite.
 */

import bundledSchema from '../data/publishedSchema.json';

const STORAGE_KEY = 'eko_published_design_schema';

function camelToKebab(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
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
    const selector = item.selector || (key.startsWith('#') || key.startsWith('.') ? key : `#${key}`);

    // Universal styles
    if (item.styles && typeof item.styles === 'object') {
      const declarations = Object.entries(item.styles)
        .filter(([_, val]) => val !== undefined && val !== null && val !== '')
        .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
        .join(' ');
      if (declarations) {
        universalCssRules.push(`  ${selector} { ${declarations} }`);
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
 * Applies visual overrides from a schema object onto the current DOM.
 * Supports universal styles and device-specific breakpoints (desktop, tablet, mobile).
 * @param {Object} schema
 * @param {Document} [doc=document]
 */
export function applyDesignSchema(schema, doc = document) {
  if (!schema || !schema.elements) return;

  const elements = schema.elements;
  const universalCssRules = [];
  const desktopCssRules = [];
  const tabletCssRules = [];
  const mobileCssRules = [];

  Object.keys(elements).forEach(key => {
    const item = elements[key];
    const selector = item.selector || (key.startsWith('#') || key.startsWith('.') ? key : `#${key}`);
    const el = doc.querySelector(selector);

    // 1. Text override
    if (el && typeof item.text === 'string' && item.text.trim() !== '') {
      if (item.html) {
        el.innerHTML = item.html;
      } else if (el.children.length === 0) {
        el.textContent = item.text;
      } else {
        // Element contains child elements (e.g. <small>, <span>, <strong>).
        // Update direct text node to preserve child elements like "Original production", "process", etc.
        const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        if (textNodes.length > 0) {
          textNodes[0].textContent = item.text;
          for (let i = 1; i < textNodes.length; i++) {
            textNodes[i].textContent = '';
          }
        } else {
          const newTextNode = el.ownerDocument ? el.ownerDocument.createTextNode(item.text) : doc.createTextNode(item.text);
          el.insertBefore(newTextNode, el.firstChild);
        }
      }
    }

    // 2. Data attributes
    if (el && item.dataAttributes && typeof item.dataAttributes === 'object') {
      Object.keys(item.dataAttributes).forEach(attr => {
        el.dataset[attr] = item.dataAttributes[attr];
      });
    }

    // 3. Media overrides (Audio / Image)
    if (el && item.media && item.media.src) {
      if (el.tagName === 'IMG') {
        el.src = item.media.src;
      } else if (el.tagName === 'AUDIO' || el.tagName === 'SOURCE') {
        el.src = item.media.src;
        if (el.tagName === 'AUDIO') {
          el.load();
        }
      } else if (item.media.type === 'image') {
        el.style.backgroundImage = `url("${item.media.src}")`;
      } else if (item.media.type === 'audio') {
        const audioEl = el.querySelector('audio') || doc.querySelector('#audio');
        if (audioEl) {
          audioEl.src = item.media.src;
          audioEl.load();
        }
      }
    }

    // 4. Universal styles
    if (item.styles && typeof item.styles === 'object') {
      const declarations = Object.entries(item.styles)
        .filter(([_, val]) => val !== undefined && val !== null && val !== '')
        .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
        .join(' ');
      if (declarations) {
        universalCssRules.push(`${selector} { ${declarations} }`);
      }
    }

    // 5. Device breakpoint overrides
    if (item.breakpoints) {
      if (item.breakpoints.desktop && typeof item.breakpoints.desktop === 'object') {
        const dDec = Object.entries(item.breakpoints.desktop)
          .filter(([_, val]) => val !== undefined && val !== null && val !== '')
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (dDec) desktopCssRules.push(`${selector} { ${dDec} }`);
      }

      if (item.breakpoints.tablet && typeof item.breakpoints.tablet === 'object') {
        const tDec = Object.entries(item.breakpoints.tablet)
          .filter(([_, val]) => val !== undefined && val !== null && val !== '')
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (tDec) tabletCssRules.push(`${selector} { ${tDec} }`);
      }

      if (item.breakpoints.mobile && typeof item.breakpoints.mobile === 'object') {
        const mDec = Object.entries(item.breakpoints.mobile)
          .filter(([_, val]) => val !== undefined && val !== null && val !== '')
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (mDec) mobileCssRules.push(`${selector} { ${mDec} }`);
      }
    }
  });

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

  let finalCss = universalCssRules.join('\n');
  if (desktopCssRules.length > 0) {
    finalCss += `\n@media (min-width: 1024px) {\n  ${desktopCssRules.join('\n  ')}\n}`;
  }
  if (tabletCssRules.length > 0) {
    finalCss += `\n@media (min-width: 768px) and (max-width: 1023px) {\n  ${tabletCssRules.join('\n  ')}\n}`;
  }
  if (mobileCssRules.length > 0) {
    finalCss += `\n@media (max-width: 767px) {\n  ${mobileCssRules.join('\n  ')}\n}`;
  }

  if (styleTag) {
    styleTag.textContent = finalCss;
  }
}

/**
 * Fetches and initializes the published visual schema on page load.
 * 1. Immediately applies compile-time bundled schema (0ms guarantee across all devices).
 * 2. Checks local cache if newer changes exist on this device.
 * 3. Checks /api/admin/schema, /publishedSchema.json, and /metadata.json for fresh updates.
 */
export async function initPublishedDesignSchema(doc = document) {
  const countElements = (s) => (s && s.elements ? Object.keys(s.elements).length : 0);

  // 1. Instant compile-time bundled schema application (0ms render on ANY device)
  if (bundledSchema && countElements(bundledSchema) > 0) {
    applyDesignSchema(bundledSchema, doc);
  }

  // 2. Check local storage in case device has unsynced local changes
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && countElements(parsed) > 0) {
        const cachedTime = new Date(parsed.lastUpdated || 0).getTime();
        const bundledTime = new Date(bundledSchema.lastUpdated || 0).getTime();
        if (cachedTime > bundledTime) {
          applyDesignSchema(parsed, doc);
        }
      }
    }
  } catch (err) {
    // Ignore storage errors in restricted contexts
  }

  // 3. Fetch authoritative schema from backend API with timestamp cache-busting
  try {
    const res = await fetch(`/api/admin/schema?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.schema) {
        const count = countElements(data.schema);
        if (count > 0) {
          applyDesignSchema(data.schema, doc);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.schema));
          } catch {}
          return;
        }
      }
    }
  } catch {
    // API unavailable (static host or offline)
  }

  // 4. Fallback: Check /publishedSchema.json static file
  try {
    const fileRes = await fetch(`/publishedSchema.json?t=${Date.now()}`, { cache: 'no-store' });
    if (fileRes.ok) {
      const fileSchema = await fileRes.json();
      if (fileSchema && countElements(fileSchema) > 0) {
        applyDesignSchema(fileSchema, doc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fileSchema));
        } catch {}
        return;
      }
    }
  } catch {}

  // 5. Fallback: Check /src/data/publishedSchema.json
  try {
    const fileRes = await fetch(`/src/data/publishedSchema.json?t=${Date.now()}`, { cache: 'no-store' });
    if (fileRes.ok) {
      const fileSchema = await fileRes.json();
      if (fileSchema && countElements(fileSchema) > 0) {
        applyDesignSchema(fileSchema, doc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fileSchema));
        } catch {}
        return;
      }
    }
  } catch {}

  // 6. Fallback: check /metadata.json
  try {
    const metaRes = await fetch(`/metadata.json?t=${Date.now()}`, { cache: 'no-store' });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta && meta.designModeSchema && countElements(meta.designModeSchema) > 0) {
        applyDesignSchema(meta.designModeSchema, doc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(meta.designModeSchema));
        } catch {}
      }
    }
  } catch {}
}
