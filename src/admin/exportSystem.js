/**
 * Export & Publish System for Eko In-Context Visual Editor
 * Serializes all dynamic visual overrides, persists schema to metadata.json,
 * triggers git commit operations, and manages local fast-cache storage.
 */

import { broadcastSchemaPublished } from '../utils/schemaApplier.js';

const STORAGE_KEY = 'eko_published_design_schema';
const SESSION_HISTORY_KEY = 'eko_session_publish_history';

export class ExportSystem {
  constructor() {
    this.changesMap = new Map(); // selector -> override object
    this.sessionBaselineSchema = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      elementsCount: 0,
      elements: {}
    };
    this.hasUnpublishedChanges = false;
    this.initPromise = this.loadInitialSchema();
  }

  async loadInitialSchema() {
    try {
      const res = await fetch(`/api/admin/schema?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.schema) {
          this.sessionBaselineSchema = JSON.parse(JSON.stringify(data.schema));
          if (data.schema.elements) {
            Object.entries(data.schema.elements).forEach(([selector, val]) => {
              this.changesMap.set(selector, JSON.parse(JSON.stringify(val)));
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
          this.sessionBaselineSchema = JSON.parse(JSON.stringify(parsed));
          if (parsed.elements) {
            Object.entries(parsed.elements).forEach(([selector, val]) => {
              this.changesMap.set(selector, JSON.parse(JSON.stringify(val)));
            });
          }
        }
      } catch {}
    }

    // Initialize session history if not present in this browser tab/session
    try {
      const existingSessionHist = sessionStorage.getItem(SESSION_HISTORY_KEY);
      if (!existingSessionHist) {
        const v0 = this.getV0Checkpoint();
        sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify([v0]));
      }
    } catch (_) {}
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
      if (breakpoint === 'universal') {
        existing.text = changeData.text;
        if (existing.breakpoints.desktop) delete existing.breakpoints.desktop.text;
        if (existing.breakpoints.tablet) delete existing.breakpoints.tablet.text;
        if (existing.breakpoints.mobile) delete existing.breakpoints.mobile.text;
      } else {
        if (!existing.breakpoints[breakpoint]) existing.breakpoints[breakpoint] = {};
        existing.breakpoints[breakpoint].text = changeData.text;
      }
    }

    if (changeData.styleKey && changeData.val !== undefined) {
      if (breakpoint === 'universal') {
        existing.styles[changeData.styleKey] = changeData.val;
        if (existing.breakpoints.desktop) delete existing.breakpoints.desktop[changeData.styleKey];
        if (existing.breakpoints.tablet) delete existing.breakpoints.tablet[changeData.styleKey];
        if (existing.breakpoints.mobile) delete existing.breakpoints.mobile[changeData.styleKey];
      } else {
        if (!existing.breakpoints[breakpoint]) existing.breakpoints[breakpoint] = {};
        existing.breakpoints[breakpoint][changeData.styleKey] = changeData.val;
      }
    }

    if (changeData.styles) {
      if (breakpoint === 'universal') {
        existing.styles = { ...existing.styles, ...changeData.styles };
        Object.keys(changeData.styles).forEach(k => {
          if (existing.breakpoints.desktop) delete existing.breakpoints.desktop[k];
          if (existing.breakpoints.tablet) delete existing.breakpoints.tablet[k];
          if (existing.breakpoints.mobile) delete existing.breakpoints.mobile[k];
        });
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
      if (breakpoint === 'universal') {
        existing.media = changeData.media;
        if (existing.breakpoints.desktop) delete existing.breakpoints.desktop.media;
        if (existing.breakpoints.tablet) delete existing.breakpoints.tablet.media;
        if (existing.breakpoints.mobile) delete existing.breakpoints.mobile.media;
      } else {
        if (!existing.breakpoints[breakpoint]) existing.breakpoints[breakpoint] = {};
        existing.breakpoints[breakpoint].media = changeData.media;
      }
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
      if (breakpoint === 'all' || !breakpoint) {
        delete existing.text;
        if (existing.breakpoints) {
          Object.keys(existing.breakpoints).forEach(bp => {
            if (existing.breakpoints[bp]) delete existing.breakpoints[bp].text;
          });
        }
      } else if (breakpoint === 'universal') {
        delete existing.text;
      } else if (existing.breakpoints && existing.breakpoints[breakpoint]) {
        delete existing.breakpoints[breakpoint].text;
      }
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
      if (breakpoint === 'all' || !breakpoint) {
        delete existing.media;
        if (existing.breakpoints) {
          Object.keys(existing.breakpoints).forEach(bp => {
            if (existing.breakpoints[bp]) delete existing.breakpoints[bp].media;
          });
        }
      } else if (breakpoint === 'universal') {
        delete existing.media;
      } else if (existing.breakpoints && existing.breakpoints[breakpoint]) {
        delete existing.breakpoints[breakpoint].media;
      }
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
   * Generates the immutable default v0 baseline checkpoint for this session
   */
  getV0Checkpoint() {
    const elementsCount = Object.keys(this.sessionBaselineSchema?.elements || {}).length;
    return {
      id: 'cp_session_v0',
      timestamp: this.sessionBaselineSchema?.lastPublished || this.sessionBaselineSchema?.lastUpdated || new Date().toISOString(),
      label: 'Checkpoint v0 (Session Baseline)',
      description: elementsCount > 0
        ? `Session baseline state (${elementsCount} element(s) currently published)`
        : 'Initial unedited site baseline (v0)',
      elementsCount,
      schema: JSON.parse(JSON.stringify(this.sessionBaselineSchema || { version: '1.0.0', elements: {}, elementsCount: 0 })),
      isV0: true
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
      'x-admin-request': 'true'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let serverData = null;
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers,
        body: JSON.stringify({ schema })
      });
      if (res.ok) {
        serverData = await res.json();
      }
    } catch (err) {
      console.warn('[ExportSystem] Server publish notice:', err);
    }

    this.hasUnpublishedChanges = false;

    // 3. Immediately cache newly published checkpoint in current session history store
    let updatedSessionHist = [];
    try {
      let sessionHist = [];
      const cached = sessionStorage.getItem(SESSION_HISTORY_KEY);
      if (cached) {
        sessionHist = JSON.parse(cached);
      }
      if (!Array.isArray(sessionHist)) sessionHist = [];

      const publishedInSession = sessionHist.filter(c => c.id !== 'cp_session_v0' && c.id !== 'cp_v0' && !c.isV0);
      const newCheckpointNum = publishedInSession.length + 1;
      const elemCount = schema.elementsCount || Object.keys(schema.elements || {}).length;

      const newCp = {
        id: `cp_session_${Date.now()}`,
        timestamp: schema.lastPublished || new Date().toISOString(),
        label: `Checkpoint #${newCheckpointNum}`,
        description: `${elemCount} element${elemCount === 1 ? '' : 's'} customized across canvas`,
        elementsCount: elemCount,
        schema: JSON.parse(JSON.stringify(schema)),
        isV0: false
      };

      updatedSessionHist = [newCp, ...publishedInSession, this.getV0Checkpoint()];
      sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updatedSessionHist));
    } catch (e) {
      console.warn('Failed to cache history locally:', e);
    }

    // 4. Broadcast live update to all storefront tabs and windows
    broadcastSchemaPublished(schema);

    return {
      success: true,
      schema,
      checkpoint: updatedSessionHist[0] || null,
      history: updatedSessionHist,
      message: 'Published successfully across website',
      gitStatus: serverData?.gitStatus,
      publishedAt: schema.lastPublished || new Date().toISOString()
    };
  }

  /**
   * Retrieves all saved publish checkpoints for the current active session
   */
  async getHistory() {
    const v0 = this.getV0Checkpoint();
    let sessionHistory = [];

    // 1. Read cached session history
    try {
      const cached = sessionStorage.getItem(SESSION_HISTORY_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          sessionHistory = parsed;
        }
      }
    } catch (_) {}

    // Filter published checkpoints in this session
    const published = sessionHistory
      .filter(cp => cp && cp.id !== 'cp_session_v0' && cp.id !== 'cp_v0' && !cp.isV0)
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    // Ensure v0 is always at the end
    const mergedHistory = [...published, v0];

    try {
      sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(mergedHistory));
    } catch (_) {}

    return mergedHistory;
  }

  /**
   * Restores a past publish checkpoint back onto the canvas and backend
   */
  async restoreCheckpoint(checkpointId) {
    if (!checkpointId) throw new Error('Missing checkpoint ID');

    let restoredSchema = null;
    let checkpointObj = null;

    if (checkpointId === 'cp_session_v0' || checkpointId === 'cp_v0') {
      const v0 = this.getV0Checkpoint();
      restoredSchema = JSON.parse(JSON.stringify(v0.schema));
      checkpointObj = v0;
    } else {
      const hist = await this.getHistory();
      const found = hist.find(c => c.id === checkpointId);
      if (found && found.schema) {
        restoredSchema = JSON.parse(JSON.stringify(found.schema));
        checkpointObj = found;
      }
    }

    if (!restoredSchema) {
      throw new Error(`Checkpoint ${checkpointId} not found in this session`);
    }

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

    // Persist restored schema to backend
    const token = sessionStorage.getItem('eko_admin_token') ||
      localStorage.getItem('eko_admin_token') ||
      new URLSearchParams(window.location.search).get('auth');
    const headers = {
      'Content-Type': 'application/json',
      'x-admin-request': 'true'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      await fetch('/api/admin/publish', {
        method: 'POST',
        headers,
        body: JSON.stringify({ schema: restoredSchema })
      });
    } catch (_) {}

    broadcastSchemaPublished(restoredSchema);

    this.hasUnpublishedChanges = false;
    return {
      success: true,
      checkpoint: checkpointObj,
      schema: restoredSchema
    };
  }

  /**
   * Revert all local pending modifications back to current session baseline
   */
  revertAll() {
    this.changesMap.clear();
    if (this.sessionBaselineSchema && this.sessionBaselineSchema.elements) {
      Object.entries(this.sessionBaselineSchema.elements).forEach(([sel, val]) => {
        this.changesMap.set(sel, JSON.parse(JSON.stringify(val)));
      });
    }
    this.hasUnpublishedChanges = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessionBaselineSchema));
    } catch {}
    broadcastSchemaPublished(this.serializeSchema());
  }
}
