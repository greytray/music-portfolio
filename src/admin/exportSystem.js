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
   * Records or updates a visual change on an element
   */
  recordChange(selector, changeData) {
    if (!selector) return;

    const existing = this.changesMap.get(selector) || {
      selector,
      styles: {},
      dataAttributes: {}
    };

    if (changeData.text !== undefined) {
      existing.text = changeData.text;
    }

    if (changeData.styleKey && changeData.val !== undefined) {
      existing.styles[changeData.styleKey] = changeData.val;
    }

    if (changeData.styles) {
      existing.styles = { ...existing.styles, ...changeData.styles };
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

  getChangesCount() {
    return this.changesMap.size;
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
    const token = sessionStorage.getItem('eko_admin_token');
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
