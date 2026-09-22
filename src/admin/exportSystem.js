/**
 * Export & Publish System for Eko In-Context Visual Editor
 * Serializes all dynamic visual overrides, persists schema to metadata.json,
 * triggers git commit operations, and manages local fast-cache storage.
 */

const STORAGE_KEY = 'eko_published_design_schema';

export class ExportSystem {
  constructor() {
    this.changesMap = new Map(); // selector -> override object
    this.initialSchema = null;
    this.hasUnpublishedChanges = false;
    this.loadInitialSchema();
  }

  async loadInitialSchema() {
    try {
      const res = await fetch('/api/admin/schema', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.schema) {
          this.initialSchema = data.schema;
          if (data.schema.elements) {
            Object.entries(data.schema.elements).forEach(([selector, val]) => {
              this.changesMap.set(selector, val);
            });
          }
        }
      }
    } catch {
      // Try local storage fallback
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.initialSchema = parsed;
          if (parsed.elements) {
            Object.entries(parsed.elements).forEach(([selector, val]) => {
              this.changesMap.set(selector, val);
            });
          }
        }
      } catch {}
    }
  }

  /**
   * Records or updates a visual change on an element.
   * If breakpoint is 'universal', saves to universal styles (applies to all devices).
   * If breakpoint is 'desktop', 'tablet', or 'mobile', saves strictly to that device mode.
   */
  recordChange(selector, changeData, breakpoint = 'universal') {
    if (!selector || !changeData) return;
    if (changeData.reset || changeData.resetProperty) return;

    const existing = this.changesMap.get(selector) || {
      selector,
      styles: {},
      breakpoints: {
        desktop: {},
        tablet: {},
        mobile: {}
      },
      dataAttributes: {}
    };

    if (!existing.breakpoints) {
      existing.breakpoints = {
        desktop: {},
        tablet: {},
        mobile: {}
      };
    }

    if (changeData.text !== undefined) {
      existing.text = changeData.text;
    }

    if (changeData.styleKey && changeData.val !== undefined) {
      if (breakpoint === 'universal') {
        existing.styles[changeData.styleKey] = changeData.val;
      } else {
        if (!existing.breakpoints[breakpoint]) existing.breakpoints[breakpoint] = {};
        existing.breakpoints[breakpoint][changeData.styleKey] = changeData.val;
      }
    }

    if (changeData.styles) {
      if (breakpoint === 'universal') {
        existing.styles = { ...existing.styles, ...changeData.styles };
      } else {
        if (!existing.breakpoints[breakpoint]) existing.breakpoints[breakpoint] = {};
        existing.breakpoints[breakpoint] = { ...existing.breakpoints[breakpoint], ...changeData.styles };
      }
    }

    if (changeData.dataAttr) {
      existing.dataAttributes = { ...existing.dataAttributes, ...changeData.dataAttr };
    }

    if (changeData.removeDataAttr) {
      delete existing.dataAttributes[changeData.removeDataAttr];
    }

    if (changeData.media) {
      existing.media = changeData.media;
    }

    this.changesMap.set(selector, existing);
    this.hasUnpublishedChanges = true;
  }

  /**
   * Remove a specific style or attribute override from an element
   */
  removeChange(selector, type, key, breakpoint = 'universal') {
    if (!selector) return;
    const existing = this.changesMap.get(selector);
    if (!existing) return;

    if (type === 'text') {
      delete existing.text;
    } else if (type === 'style') {
      if (breakpoint === 'all' || !breakpoint) {
        if (existing.styles) delete existing.styles[key];
        if (existing.breakpoints) {
          Object.keys(existing.breakpoints).forEach(bp => {
            if (existing.breakpoints[bp]) delete existing.breakpoints[bp][key];
          });
        }
      } else if (breakpoint === 'universal') {
        if (existing.styles) delete existing.styles[key];
      } else if (existing.breakpoints && existing.breakpoints[breakpoint]) {
        delete existing.breakpoints[breakpoint][key];
      }
    } else if (type === 'dataAttr' && existing.dataAttributes) {
      delete existing.dataAttributes[key];
    } else if (type === 'media') {
      delete existing.media;
    }

    // Clean up empty objects
    const hasStyles = existing.styles && Object.keys(existing.styles).length > 0;
    const hasBp = existing.breakpoints && Object.values(existing.breakpoints).some(bp => Object.keys(bp || {}).length > 0);
    const hasAttrs = existing.dataAttributes && Object.keys(existing.dataAttributes).length > 0;
    const hasText = existing.text !== undefined;
    const hasMedia = existing.media !== undefined;

    if (!hasStyles && !hasBp && !hasAttrs && !hasText && !hasMedia) {
      this.changesMap.delete(selector);
    } else {
      this.changesMap.set(selector, existing);
    }
    this.hasUnpublishedChanges = this.changesMap.size > 0;
  }

  /**
   * Reset all changes on a single element
   */
  resetElement(selector) {
    if (!selector) return;
    this.changesMap.delete(selector);
    this.hasUnpublishedChanges = this.changesMap.size > 0;
  }

  /**
   * Reset all changes in a specific category (text, spacing, media, props)
   */
  resetSection(sectionName, selector = null) {
    const textStyleList = [
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'textAlign', 'fontStyle', 'textTransform', 'fontVariant', 'textShadow',
      'boxShadow', 'color', 'backgroundColor', 'borderColor', 'borderWidth',
      'borderRadius', 'opacity'
    ];
    const spacingStyleList = [
      'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
      'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap'
    ];

    const targets = selector ? [selector] : Array.from(this.changesMap.keys());

    targets.forEach(sel => {
      const elData = this.changesMap.get(sel);
      if (!elData) return;

      if (sectionName === 'text') {
        delete elData.text;
        textStyleList.forEach(k => {
          if (elData.styles) delete elData.styles[k];
          if (elData.breakpoints) {
            if (elData.breakpoints.desktop) delete elData.breakpoints.desktop[k];
            if (elData.breakpoints.tablet) delete elData.breakpoints.tablet[k];
            if (elData.breakpoints.mobile) delete elData.breakpoints.mobile[k];
          }
        });
      } else if (sectionName === 'spacing') {
        spacingStyleList.forEach(k => {
          if (elData.styles) delete elData.styles[k];
          if (elData.breakpoints) {
            if (elData.breakpoints.desktop) delete elData.breakpoints.desktop[k];
            if (elData.breakpoints.tablet) delete elData.breakpoints.tablet[k];
            if (elData.breakpoints.mobile) delete elData.breakpoints.mobile[k];
          }
        });
      } else if (sectionName === 'media') {
        delete elData.media;
        if (elData.styles) delete elData.styles.backgroundImage;
      } else if (sectionName === 'props') {
        delete elData.dataAttributes;
      }

      // Cleanup empty data objects
      const hasStyles = elData.styles && Object.keys(elData.styles).length > 0;
      const hasBp = elData.breakpoints && (
        (elData.breakpoints.desktop && Object.keys(elData.breakpoints.desktop).length > 0) ||
        (elData.breakpoints.tablet && Object.keys(elData.breakpoints.tablet).length > 0) ||
        (elData.breakpoints.mobile && Object.keys(elData.breakpoints.mobile).length > 0)
      );
      const hasAttrs = elData.dataAttributes && Object.keys(elData.dataAttributes).length > 0;
      const hasText = elData.text !== undefined;
      const hasMedia = elData.media !== undefined;

      if (!hasStyles && !hasBp && !hasAttrs && !hasText && !hasMedia) {
        this.changesMap.delete(sel);
      }
    });

    this.hasUnpublishedChanges = this.changesMap.size > 0;
  }

  getElementData(selector) {
    if (!selector) return null;
    return this.changesMap.get(selector) || null;
  }

  getChangesCount() {
    return this.changesMap.size;
  }

  getSectionCounts() {
    let textCount = 0;
    let spacingCount = 0;
    let mediaCount = 0;
    let propsCount = 0;

    const textStyleList = [
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'textAlign', 'fontStyle', 'textTransform', 'fontVariant', 'textShadow',
      'boxShadow', 'color', 'backgroundColor', 'borderColor', 'borderWidth',
      'borderRadius', 'opacity'
    ];
    const spacingStyleList = [
      'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
      'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap'
    ];

    this.changesMap.forEach((elData) => {
      if (elData.text !== undefined) {
        textCount++;
      }
      const allStyleKeys = new Set([
        ...Object.keys(elData.styles || {}),
        ...Object.keys((elData.breakpoints && elData.breakpoints.desktop) || {}),
        ...Object.keys((elData.breakpoints && elData.breakpoints.tablet) || {}),
        ...Object.keys((elData.breakpoints && elData.breakpoints.mobile) || {})
      ]);

      allStyleKeys.forEach(k => {
        if (textStyleList.includes(k)) {
          textCount++;
        } else if (spacingStyleList.includes(k)) {
          spacingCount++;
        } else if (k === 'backgroundImage') {
          mediaCount++;
        }
      });

      if (elData.media !== undefined) {
        mediaCount++;
      }

      if (elData.dataAttributes) {
        propsCount += Object.keys(elData.dataAttributes).length;
      }
    });

    const totalCount = textCount + spacingCount + mediaCount + propsCount;

    return {
      text: textCount,
      spacing: spacingCount,
      media: mediaCount,
      props: propsCount,
      total: totalCount
    };
  }

  serializeSchema() {
    const elements = {};
    for (const [selector, data] of this.changesMap.entries()) {
      elements[selector] = data;
    }

    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      elementsCount: this.changesMap.size,
      elements
    };
  }

  /**
   * Publishes the current serialized schema to /api/admin/publish and metadata.json
   */
  async publish() {
    const schema = this.serializeSchema();

    // 1. Instant local storage cache
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }

    // 2. Server API publish with multi-vector session authentication
    const token = sessionStorage.getItem('eko_admin_token') ||
      localStorage.getItem('eko_admin_token') ||
      new URLSearchParams(window.location.search).get('auth');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers,
      body: JSON.stringify({ schema })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    this.hasUnpublishedChanges = false;
    return {
      success: true,
      schema,
      message: data.message || 'Published successfully',
      gitStatus: data.gitStatus,
      publishedAt: data.publishedAt
    };
  }

  /**
   * Retrieves all saved publish checkpoints
   */
  async getHistory() {
    try {
      const res = await fetch(`/api/admin/history?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return data.history || [];
      }
    } catch (err) {
      console.warn('Failed to fetch history:', err);
    }
    return [];
  }

  /**
   * Restores a past publish checkpoint back onto the canvas and backend
   */
  async restoreCheckpoint(checkpointId) {
    if (!checkpointId) throw new Error('Missing checkpoint ID');

    const token = sessionStorage.getItem('eko_admin_token') ||
      localStorage.getItem('eko_admin_token') ||
      new URLSearchParams(window.location.search).get('auth');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/admin/restore', {
      method: 'POST',
      headers,
      body: JSON.stringify({ checkpointId })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Restore failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    const restoredSchema = data.schema;

    // Repopulate local state
    this.changesMap.clear();
    if (restoredSchema && restoredSchema.elements) {
      Object.entries(restoredSchema.elements).forEach(([selector, val]) => {
        this.changesMap.set(selector, JSON.parse(JSON.stringify(val)));
      });
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredSchema));
    } catch {}

    this.hasUnpublishedChanges = false;
    return {
      success: true,
      checkpoint: data.checkpoint,
      schema: restoredSchema
    };
  }

  /**
   * Revert all local pending modifications
   */
  revertAll() {
    this.changesMap.clear();
    this.hasUnpublishedChanges = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
