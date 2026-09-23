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
  if (!doc) return;

  const win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
  const width = win ? win.innerWidth : 1280;
  let activeBreakpoint = 'desktop';
  if (width <= 767) {
    activeBreakpoint = 'mobile';
  } else if (width <= 1023) {
    activeBreakpoint = 'tablet';
  }

  // Save active schema for responsive recalculation on resize
  if (doc) {
    doc.__ekoLastActiveSchema = schema;
  }

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
      }, 80);
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
  const universalCssRules = [];
  const desktopCssRules = [];
  const tabletCssRules = [];
  const mobileCssRules = [];

  Object.keys(elements).forEach(key => {
    const item = elements[key];
    const selector = item.selector || (key.startsWith('#') || key.startsWith('.') ? key : `#${key}`);
    const el = doc.querySelector(selector);

    if (el) {
      doc.__ekoOverriddenElements.add(el);
      if (el.__ekoOriginalText === undefined) {
        el.__ekoOriginalText = el.textContent || '';
        el.__ekoOriginalHtml = el.innerHTML || '';
      }
      if (el.__ekoOriginalSrc === undefined && (el.tagName === 'IMG' || el.tagName === 'AUDIO')) {
        el.__ekoOriginalSrc = el.getAttribute('src') || '';
      }
      if (el.__ekoOriginalBg === undefined) {
        el.__ekoOriginalBg = el.style.backgroundImage || '';
      }
    }

    // 1. Text override: Check device breakpoint first, then universal
    let targetText = null;
    let targetHtml = null;
    if (item.breakpoints && item.breakpoints[activeBreakpoint] && item.breakpoints[activeBreakpoint].text !== undefined) {
      targetText = item.breakpoints[activeBreakpoint].text;
      targetHtml = item.breakpoints[activeBreakpoint].html;
    } else if (item.text !== undefined && typeof item.text === 'string' && item.text.trim() !== '') {
      targetText = item.text;
      targetHtml = item.html;
    }

    if (el && targetText !== null) {
      if (targetHtml) {
        el.innerHTML = targetHtml;
      } else if (el.children.length === 0) {
        el.textContent = targetText;
      } else {
        const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        if (textNodes.length > 0) {
          textNodes[0].textContent = targetText;
          for (let i = 1; i < textNodes.length; i++) {
            textNodes[i].textContent = '';
          }
        } else {
          const newTextNode = el.ownerDocument ? el.ownerDocument.createTextNode(targetText) : doc.createTextNode(targetText);
          el.insertBefore(newTextNode, el.firstChild);
        }
      }
    } else if (el && targetText === null && el.__ekoOriginalText !== undefined && !item.text && !(item.breakpoints && Object.values(item.breakpoints).some(bp => bp && bp.text !== undefined))) {
      // Revert to original if no text override
      if (el.children.length === 0) {
        el.textContent = el.__ekoOriginalText;
      } else if (el.__ekoOriginalHtml !== undefined) {
        el.innerHTML = el.__ekoOriginalHtml;
      }
    }

    // 2. Data attributes
    if (el && item.dataAttributes && typeof item.dataAttributes === 'object') {
      Object.keys(item.dataAttributes).forEach(attr => {
        el.dataset[attr] = item.dataAttributes[attr];
      });
    }

    // 3. Media overrides (Audio / Image): Check device breakpoint first, then universal
    let targetMedia = null;
    if (item.breakpoints && item.breakpoints[activeBreakpoint] && item.breakpoints[activeBreakpoint].media) {
      targetMedia = item.breakpoints[activeBreakpoint].media;
    } else if (item.media && item.media.src) {
      targetMedia = item.media;
    }

    if (el && targetMedia && targetMedia.src) {
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
    }

    // 4. Universal styles (Applies to all devices)
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
          .filter(([key, val]) => key !== 'text' && key !== 'media' && val !== undefined && val !== null && val !== '')
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (dDec) desktopCssRules.push(`${selector} { ${dDec} }`);
      }

      if (item.breakpoints.tablet && typeof item.breakpoints.tablet === 'object') {
        const tDec = Object.entries(item.breakpoints.tablet)
          .filter(([key, val]) => key !== 'text' && key !== 'media' && val !== undefined && val !== null && val !== '')
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (tDec) tabletCssRules.push(`${selector} { ${tDec} }`);
      }

      if (item.breakpoints.mobile && typeof item.breakpoints.mobile === 'object') {
        const mDec = Object.entries(item.breakpoints.mobile)
          .filter(([key, val]) => key !== 'text' && key !== 'media' && val !== undefined && val !== null && val !== '')
          .map(([prop, val]) => `${camelToKebab(prop)}: ${val} !important;`)
          .join(' ');
        if (mDec) mobileCssRules.push(`${selector} { ${mDec} }`);
      }
    }
  });

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
