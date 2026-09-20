/**
 * Schema Applier Utility
 * Lightweight (<1KB runtime) engine that applies published Design Mode visual overrides
 * directly to storefront elements without requiring the heavy administrative editing suite.
 */

const STORAGE_KEY = 'eko_published_design_schema';

/**
 * Applies visual overrides from a schema object onto the current DOM.
 * @param {Object} schema
 * @param {Document} [doc=document]
 */
export function applyDesignSchema(schema, doc = document) {
  if (!schema || !schema.elements) return;

  const elements = schema.elements;
  Object.keys(elements).forEach(key => {
    const item = elements[key];
    const selector = item.selector || (key.startsWith('#') || key.startsWith('.') ? key : `#${key}`);
    const el = doc.querySelector(selector);
    if (!el) return;

    // 1. Text override
    if (typeof item.text === 'string' && item.text.trim() !== '') {
      // If it contains child elements, update first text node or textContent
      if (el.children.length === 0) {
        el.textContent = item.text;
      } else {
        // Find main text or update innerHTML safely if provided
        el.innerHTML = item.html || item.text;
      }
    }

    // 2. Style overrides
    if (item.styles && typeof item.styles === 'object') {
      Object.keys(item.styles).forEach(prop => {
        const val = item.styles[prop];
        if (val !== undefined && val !== null && val !== '') {
          el.style[prop] = val;
        }
      });
    }

    // 3. Data attributes
    if (item.dataAttributes && typeof item.dataAttributes === 'object') {
      Object.keys(item.dataAttributes).forEach(attr => {
        el.dataset[attr] = item.dataAttributes[attr];
      });
    }

    // 4. Media overrides (Audio / Image)
    if (item.media && item.media.src) {
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
        // Find child audio or player
        const audioEl = el.querySelector('audio') || doc.querySelector('#audio');
        if (audioEl) {
          audioEl.src = item.media.src;
          audioEl.load();
        }
      }
    }
  });
}

/**
 * Fetches and initializes the published visual schema on page load.
 * Checks local cache first for instant 0ms render, then verifies with /metadata.json.
 */
export async function initPublishedDesignSchema(doc = document) {
  // 1. Immediate local cache application (prevents FOUC)
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      applyDesignSchema(parsed, doc);
    }
  } catch (err) {
    // Ignore storage errors in restricted contexts
  }

  // 2. Fetch official schema from metadata.json or /api/admin/schema
  try {
    const res = await fetch('/api/admin/schema', { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.schema) {
        applyDesignSchema(data.schema, doc);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.schema));
        } catch {}
      }
    }
  } catch {
    // Fallback: try reading metadata.json directly
    try {
      const metaRes = await fetch('/metadata.json', { cache: 'no-cache' });
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
}
