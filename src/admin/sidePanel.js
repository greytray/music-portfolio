/**
 * Side Panel Inspector for Eko In-Context Visual Editor
 * Provides rich visual controls: Typography (Font, Size, Weight, Line Spacing, Letter Spacing, Appearance/Case),
 * Non-code Visual Shadow & Glow Studio (Text Shadow vs Box Shadow),
 * Margin & Padding Sliders (0-120px), Modern Sleek Stepper Arrows,
 * Accurate Per-Element Change Tracking & Reset System,
 * Media Drop Zones (audio & images routed through media proxy),
 * and dynamic data attributes.
 */

import { getFriendlyName } from './selectionEngine.js';

export class SidePanel {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {Object} options.exportSystem - Reference to ExportSystem for change tracking
   * @param {Function} options.onElementChange - Called when any style/text/prop changes
   * @param {Function} options.onDeselect - Called when user deselects
   * @param {Function} options.onToggleCollapse - Called when toggling sidebar collapse
   */
  constructor(container, { exportSystem, onElementChange, onDeselect, onToggleCollapse } = {}) {
    this.container = container;
    this.exportSystem = exportSystem;
    this.onElementChange = onElementChange;
    this.onDeselect = onDeselect;
    this.onToggleCollapse = onToggleCollapse;

    this.activeElement = null;
    this.activeMeta = null;
    this.activeTab = 'text'; // 'text' | 'spacing' | 'media' | 'props'
    this.currentBreakpoint = 'universal'; // 'universal' | 'desktop' | 'tablet' | 'mobile'
    this.linkMargins = false;
    this.linkPaddings = false;
    this.previewAudio = null;

    // Element baselines: stores snapshot BEFORE any sidebar edits (selector -> { style, text, isTextOnly, dataset })
    this.elementBaselines = new Map();

    // Shadow Studio state
    this.shadowState = {
      x: 0,
      y: 4,
      blur: 16,
      spread: 0,
      color: '#00e5ff',
      opacity: 40,
      type: 'text' // 'text' | 'box'
    };

    this.render();
  }

  setBreakpoint(breakpoint) {
    this.currentBreakpoint = breakpoint;
    if (this.activeElement && this.activeMeta) {
      this._renderActiveTab();
      this.updateTabCounters();
      this._updateResetButtonVisibility();
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="admin-sidepanel-header">
        <div class="admin-sidepanel-title" id="admin-panel-title">
          <strong>Inspector</strong>
          <span>Select an element on canvas</span>
        </div>
        <div style="display: flex; gap: 4px; align-items: center;">
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-sidepanel-collapse" data-tooltip="Collapse Inspector Sidebar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/><path d="m10 9-3 3 3 3"/></svg>
          </button>
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-sidepanel-close" data-tooltip="Close Panel">✕</button>
        </div>
      </div>

      <!-- Navigation Tabs with Change Counter Indicators -->
      <nav class="admin-tabs-nav" aria-label="Inspector Tabs">
        <button type="button" class="admin-tab-btn is-active" data-tab="text" data-tooltip="Typography, colors, and shadows">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          <span>TEXTS</span>
          <span class="tab-change-badge" id="badge-tab-text" style="display: none;">0</span>
        </button>
        <button type="button" class="admin-tab-btn" data-tab="spacing" data-tooltip="Margins, padding, and gaps">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
          <span>SPACING</span>
          <span class="tab-change-badge" id="badge-tab-spacing" style="display: none;">0</span>
        </button>
        <button type="button" class="admin-tab-btn" data-tab="media" data-tooltip="Audio tracks and image assets">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          <span>MEDIA</span>
          <span class="tab-change-badge" id="badge-tab-media" style="display: none;">0</span>
        </button>
        <button type="button" class="admin-tab-btn" data-tab="props" data-tooltip="Custom data-* attributes">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>PROPS</span>
          <span class="tab-change-badge" id="badge-tab-props" style="display: none;">0</span>
        </button>
      </nav>

      <!-- Tab Content Area -->
      <div class="admin-tab-content" id="admin-tab-content">
        <div class="admin-empty-notice" style="text-align: center; padding: 40px 16px; color: var(--admin-text-muted);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
          <p style="margin: 0; font-size: 12px;">Click any element on the canvas to inspect and edit.</p>
        </div>
      </div>

      <!-- Footer Quick Actions (Reset Changes shows whenever changes exist) -->
      <div class="admin-sidepanel-footer" id="admin-panel-footer" style="display: none;">
        <button type="button" class="admin-btn admin-btn-danger" id="btn-reset-element" data-tooltip="Reset changes" style="display: none;">Reset Changes</button>
        <button type="button" class="admin-btn admin-btn-ghost" id="btn-copy-css" data-tooltip="Copy inline CSS overrides">Copy CSS</button>
      </div>
    `;

    this._bindTabEvents();
    this._bindHeaderEvents();
  }

  _bindHeaderEvents() {
    const collapseBtn = this.container.querySelector('#btn-sidepanel-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        if (typeof this.onToggleCollapse === 'function') {
          this.onToggleCollapse();
        }
      });
    }

    const closeBtn = this.container.querySelector('#btn-sidepanel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (typeof this.onDeselect === 'function') {
          this.onDeselect();
        }
      });
    }

    // Reset Changes on this element
    const resetBtn = this.container.querySelector('#btn-reset-element');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this._handleResetElement();
      });
    }

    const copyCssBtn = this.container.querySelector('#btn-copy-css');
    if (copyCssBtn) {
      copyCssBtn.addEventListener('click', () => {
        if (!this.activeElement) return;
        const css = this.activeElement.getAttribute('style') || '/* No inline overrides */';
        navigator.clipboard.writeText(css).then(() => {
          copyCssBtn.textContent = 'Copied!';
          setTimeout(() => { copyCssBtn.textContent = 'Copy CSS'; }, 1500);
        });
      });
    }
  }

  _bindTabEvents() {
    this.container.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.activeTab = btn.dataset.tab;
        if (this.activeElement && this.activeMeta) {
          this._renderActiveTab();
          this.updateTabCounters();
          this._updateResetButtonVisibility();
        }
      });
    });
  }

  /**
   * Capture pristine baseline state of an element before the first sidebar mutation
   */
  _captureBaselineIfNeeded() {
    if (!this.activeElement || !this.activeMeta) return;
    const selector = this.activeMeta.selector;
    if (!this.elementBaselines.has(selector)) {
      const isTextOnly = this.activeElement.children.length === 0;
      const win = (this.activeElement.ownerDocument) ? this.activeElement.ownerDocument.defaultView : window;
      const computed = win ? win.getComputedStyle(this.activeElement) : null;
      this.elementBaselines.set(selector, {
        style: this.activeElement.getAttribute('style') || '',
        text: isTextOnly ? this.activeElement.textContent : this.activeElement.innerHTML,
        isTextOnly,
        dataset: { ...this.activeElement.dataset },
        computedColor: computed ? computed.color : '',
        computedBgColor: computed ? computed.backgroundColor : '',
        computedBorderColor: computed ? computed.borderColor : '',
        computedFontFamily: computed ? computed.fontFamily : '',
        computedFontSize: computed ? computed.fontSize : '',
        computedFontWeight: computed ? computed.fontWeight : '',
        computedTextAlign: computed ? computed.textAlign : '',
        computedLineHeight: computed ? computed.lineHeight : '',
        computedLetterSpacing: computed ? computed.letterSpacing : '',
        computedMarginTop: computed ? computed.marginTop : '',
        computedMarginBottom: computed ? computed.marginBottom : '',
        computedMarginLeft: computed ? computed.marginLeft : '',
        computedMarginRight: computed ? computed.marginRight : '',
        computedPaddingTop: computed ? computed.paddingTop : '',
        computedPaddingBottom: computed ? computed.paddingBottom : '',
        computedPaddingLeft: computed ? computed.paddingLeft : '',
        computedPaddingRight: computed ? computed.paddingRight : '',
        computedGap: computed ? computed.gap : '',
      });
    }
  }

  /**
   * Check if the active element has pending/recorded overrides
   */
  hasActiveElementChanges() {
    if (!this.activeMeta || !this.exportSystem) return false;
    const data = this.exportSystem.getElementData(this.activeMeta.selector);
    if (!data) return false;

    const hasStyles = data.styles && Object.keys(data.styles).length > 0;
    const hasBp = data.breakpoints && Object.values(data.breakpoints).some(bp => Object.keys(bp || {}).length > 0);
    const hasAttrs = data.dataAttributes && Object.keys(data.dataAttributes).length > 0;
    const hasText = data.text !== undefined;
    const hasMedia = data.media !== undefined;

    return Boolean(hasStyles || hasBp || hasAttrs || hasText || hasMedia);
  }

  _updateResetButtonVisibility() {
    const footer = this.container.querySelector('#admin-panel-footer');
    const resetBtn = this.container.querySelector('#btn-reset-element');
    const counts = this.exportSystem ? this.exportSystem.getSectionCounts() : { text: 0, spacing: 0, media: 0, props: 0, total: 0 };
    
    const sectionLabels = {
      text: 'Text Section',
      spacing: 'Spacing Section',
      media: 'Media Section',
      props: 'Props Section'
    };

    const currentTab = this.activeTab || 'text';
    const sectionCount = counts[currentTab] || 0;
    const hasSectionChanges = sectionCount > 0 || this._hasActiveElementSectionChanges(currentTab);

    if (footer) {
      footer.style.display = (this.activeElement || counts.total > 0) ? 'flex' : 'none';
    }

    if (resetBtn) {
      const label = sectionLabels[currentTab] || 'Section';
      resetBtn.style.display = hasSectionChanges ? 'inline-flex' : 'none';
      resetBtn.textContent = `Reset ${label}`;
      resetBtn.setAttribute('data-tooltip', `Clear all modified properties in the ${label.toLowerCase()}`);
    }
  }

  _hasActiveElementSectionChanges(sectionName) {
    if (!this.activeMeta) return false;

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

    if (sectionName === 'text') {
      if (this.isFieldChanged('text')) return true;
      return textStyleList.some(k => this.isFieldChanged(k));
    } else if (sectionName === 'spacing') {
      return spacingStyleList.some(k => this.isFieldChanged(k));
    } else if (sectionName === 'media') {
      return this.isFieldChanged('src') || this.isFieldChanged('audio') || this.isFieldChanged('backgroundImage');
    } else if (sectionName === 'props') {
      return this.isFieldChanged('dataAttributes');
    }
    return false;
  }

  /**
   * Reset all changes in the current section category
   */
  _handleResetSection(sectionName) {
    const currentTab = sectionName || this.activeTab || 'text';

    if (this.exportSystem) {
      this.exportSystem.resetSection(currentTab);
    }

    if (this.activeElement && this.activeMeta) {
      const selector = this.activeMeta.selector;
      const baseline = this.elementBaselines.get(selector);

      if (currentTab === 'text') {
        const textStyleList = [
          'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
          'textAlign', 'fontStyle', 'textTransform', 'fontVariant', 'textShadow',
          'boxShadow', 'color', 'backgroundColor', 'borderColor', 'borderWidth',
          'borderRadius', 'opacity'
        ];
        textStyleList.forEach(k => {
          this.activeElement.style.removeProperty(this._camelToKebab(k));
        });
        if (baseline && baseline.text !== undefined) {
          if (baseline.isTextOnly) {
            this.activeElement.textContent = baseline.text;
          } else {
            this.activeElement.innerHTML = baseline.text;
          }
        }
      } else if (currentTab === 'spacing') {
        const spacingStyleList = [
          'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
          'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'gap'
        ];
        spacingStyleList.forEach(k => this.activeElement.style.removeProperty(k));
      } else if (currentTab === 'media') {
        if (this.activeElement.tagName === 'IMG' || this.activeElement.tagName === 'AUDIO') {
          if (baseline && baseline.src) this.activeElement.src = baseline.src;
        }
        this.activeElement.style.removeProperty('background-image');
      } else if (currentTab === 'props') {
        if (baseline && baseline.dataset) {
          Object.keys(this.activeElement.dataset).forEach(k => delete this.activeElement.dataset[k]);
          Object.entries(baseline.dataset).forEach(([k, v]) => {
            this.activeElement.dataset[k] = v;
          });
        }
      }
    }

    // 1. Notify change FIRST so schemaApplier strips the dynamic style rules from iframe <style>
    this._notifyChange({ reset: true, resetSection: currentTab });

    // 2. Refresh activeMeta.styles directly with clean baseline defaults and computed styles
    this._refreshActiveMetaStyles();
    this._parseExistingShadow();

    // 3. Re-render UI tab with synchronized baseline values
    this._renderActiveTab();
    this.updateTabCounters();
    this._updateResetButtonVisibility();
  }

  _handleResetElement() {
    this._handleResetSection(this.activeTab);
  }

  /**
   * Refresh the activeMeta.styles snapshot directly from the element's computed styles or pristine baselines
   */
  _refreshActiveMetaStyles() {
    if (!this.activeElement || !this.activeMeta) return;
    const selector = this.activeMeta.selector;
    const baseline = this.elementBaselines.get(selector);
    const win = (this.activeElement.ownerDocument) ? this.activeElement.ownerDocument.defaultView : window;
    const computed = win ? win.getComputedStyle(this.activeElement) : null;

    if (computed) {
      const toNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : Math.round(n);
      };

      const getPropVal = (propKey, computedVal, baselineVal) => {
        if (!this.isFieldChanged(propKey) && baselineVal) {
          return baselineVal;
        }
        return computedVal;
      };

      this.activeMeta.styles = {
        color: getPropVal('color', computed.color, baseline ? baseline.computedColor : ''),
        backgroundColor: getPropVal('backgroundColor', computed.backgroundColor, baseline ? baseline.computedBgColor : ''),
        borderColor: getPropVal('borderColor', computed.borderColor, baseline ? baseline.computedBorderColor : ''),
        borderWidth: toNum(computed.borderWidth),
        borderRadius: toNum(computed.borderRadius),
        fontFamily: getPropVal('fontFamily', computed.fontFamily, baseline ? baseline.computedFontFamily : ''),
        fontSize: toNum(computed.fontSize),
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        textAlign: computed.textAlign,
        textShadow: computed.textShadow !== 'none' ? computed.textShadow : '',
        boxShadow: computed.boxShadow !== 'none' ? computed.boxShadow : '',
        textTransform: computed.textTransform,
        fontVariant: computed.fontVariant,
        marginTop: toNum(computed.marginTop),
        marginBottom: toNum(computed.marginBottom),
        marginLeft: toNum(computed.marginLeft),
        marginRight: toNum(computed.marginRight),
        paddingTop: toNum(computed.paddingTop),
        paddingBottom: toNum(computed.paddingBottom),
        paddingLeft: toNum(computed.paddingLeft),
        paddingRight: toNum(computed.paddingRight),
        gap: toNum(computed.gap),
        letterSpacing: toNum(computed.letterSpacing),
        lineHeight: computed.lineHeight,
      };
    }
  }

  /**
   * Load element into the inspector
   */
  inspect(element, metadata) {
    this.activeElement = element;
    this.activeMeta = metadata;

    this._captureBaselineIfNeeded();
    this._refreshActiveMetaStyles();
    this._parseExistingShadow();

    const titleEl = this.container.querySelector('#admin-panel-title');
    const footerEl = this.container.querySelector('#admin-panel-footer');

    if (titleEl) {
      const friendlyName = getFriendlyName(element);
      titleEl.innerHTML = `
        <strong>${friendlyName}</strong>
        <span>Selected Component</span>
      `;
    }

    if (footerEl) {
      footerEl.style.display = 'flex';
    }

    this._renderActiveTab();
    this.updateTabCounters();
    this._updateResetButtonVisibility();
  }

  _parseExistingShadow() {
    if (!this.activeElement) return;

    const isTextTag = /^(H[1-6]|P|SPAN|A|BUTTON|LABEL|STRONG|EM|LI|SMALL|B|I|DIV)$/i.test(this.activeElement.tagName);
    const overrides = this.getElementOverrides();
    const win = this.activeElement.ownerDocument ? this.activeElement.ownerDocument.defaultView : window;
    const computed = win ? win.getComputedStyle(this.activeElement) : null;

    // Check for inline overrides first, then pending schema overrides, then computed styles
    const inlineTextSh = (this.activeElement.style.textShadow || '').trim();
    const inlineBoxSh = (this.activeElement.style.boxShadow || '').trim();
    const overrideTextSh = (overrides.styles && overrides.styles.textShadow) || '';
    const overrideBoxSh = (overrides.styles && overrides.styles.boxShadow) || '';
    const computedTextSh = (computed && computed.textShadow && computed.textShadow !== 'none') ? computed.textShadow.trim() : '';
    const computedBoxSh = (computed && computed.boxShadow && computed.boxShadow !== 'none') ? computed.boxShadow.trim() : '';

    const effectiveTextSh = inlineTextSh || overrideTextSh || computedTextSh;
    const effectiveBoxSh = inlineBoxSh || overrideBoxSh || computedBoxSh;

    const hasValidTextShadow = effectiveTextSh && effectiveTextSh !== 'none' && !/^rgba?\(0,\s*0,\s*0,\s*0\)/.test(effectiveTextSh);
    const hasValidBoxShadow = effectiveBoxSh && effectiveBoxSh !== 'none' && !/^rgba?\(0,\s*0,\s*0,\s*0\)/.test(effectiveBoxSh);

    if (hasValidTextShadow) {
      this.shadowState.type = 'text';
      this._extractShadowValues(effectiveTextSh);
    } else if (hasValidBoxShadow) {
      this.shadowState.type = 'box';
      this._extractShadowValues(effectiveBoxSh);
    } else {
      // Default target based on semantic element type
      this.shadowState.type = isTextTag ? 'text' : 'box';
      this.shadowState.x = 0;
      this.shadowState.y = 4;
      this.shadowState.blur = 16;
      this.shadowState.spread = 0;
      this.shadowState.color = '#00e5ff';
      this.shadowState.opacity = 40;
    }
  }

  _extractShadowValues(shStr) {
    if (!shStr || shStr === 'none') return;

    // Split by comma outside parentheses for multiple shadows, take the prominent first one
    const firstShadow = shStr.split(/,(?![^(]*\))/)[0].trim();
    if (!firstShadow) return;

    // 1. Extract RGBA / RGB or Hex color
    const rgbaMatch = firstShadow.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    const hexMatch = firstShadow.match(/#(?:[0-9a-fA-F]{3,8})/);

    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);
      const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
      this.shadowState.color = this._rgbToHex(`rgb(${r}, ${g}, ${b})`);
      this.shadowState.opacity = Math.round(a * 100);
    } else if (hexMatch) {
      this.shadowState.color = hexMatch[0];
      this.shadowState.opacity = 100;
    }

    // 2. Remove color string before extracting length numbers to prevent RGB channel values from being parsed as pixel offsets
    const cleanStr = firstShadow.replace(/rgba?\([^)]+\)/gi, '').replace(/#[0-9a-fA-F]+/g, '').trim();
    const lengths = cleanStr.match(/-?\d+(?:\.\d+)?(?:px)?/g) || [];
    const nums = lengths.map(l => parseFloat(l) || 0);

    if (nums.length >= 2) {
      this.shadowState.x = Math.round(nums[0]);
      this.shadowState.y = Math.round(nums[1]);
      this.shadowState.blur = nums[2] !== undefined ? Math.round(nums[2]) : 0;
      this.shadowState.spread = nums[3] !== undefined ? Math.round(nums[3]) : 0;
    }
  }

  clear() {
    this.activeElement = null;
    this.activeMeta = null;

    const titleEl = this.container.querySelector('#admin-panel-title');
    const footerEl = this.container.querySelector('#admin-panel-footer');
    const contentEl = this.container.querySelector('#admin-tab-content');

    if (titleEl) {
      titleEl.innerHTML = `
        <strong>Inspector</strong>
        <span>Select an element on canvas</span>
      `;
    }
    if (footerEl) footerEl.style.display = 'none';

    if (contentEl) {
      contentEl.innerHTML = `
        <div class="admin-empty-notice" style="text-align: center; padding: 40px 16px; color: var(--admin-text-muted);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
          <p style="margin: 0; font-size: 12px;">Click any element on the canvas to inspect and edit.</p>
        </div>
      `;
    }

    this.updateTabCounters();
  }

  /**
   * Get active overrides for the current element from exportSystem
   */
  getElementOverrides() {
    if (!this.activeMeta || !this.exportSystem) return { styles: {}, dataAttributes: {}, hasText: false, hasMedia: false };
    const data = this.exportSystem.getElementData(this.activeMeta.selector);
    if (!data) return { styles: {}, dataAttributes: {}, hasText: false, hasMedia: false };

    const universalStyles = data.styles || {};
    const bpStyles = (data.breakpoints && data.breakpoints[this.currentBreakpoint]) || {};
    const effectiveStyles = this.currentBreakpoint === 'universal'
      ? { ...universalStyles }
      : { ...universalStyles, ...bpStyles };

    const hasText = this.currentBreakpoint === 'universal'
      ? data.text !== undefined
      : ((data.breakpoints && data.breakpoints[this.currentBreakpoint] && data.breakpoints[this.currentBreakpoint].text !== undefined) || data.text !== undefined);

    const hasMedia = this.currentBreakpoint === 'universal'
      ? data.media !== undefined
      : ((data.breakpoints && data.breakpoints[this.currentBreakpoint] && data.breakpoints[this.currentBreakpoint].media !== undefined) || data.media !== undefined);

    return {
      styles: effectiveStyles,
      dataAttributes: data.dataAttributes || {},
      hasText,
      hasMedia
    };
  }

  /**
   * Reads the current effective property value considering breakpoint overrides, universal overrides, and baselines
   */
  getEffectiveFieldValue(propKey, fallback = null) {
    if (!this.activeMeta || !this.exportSystem) return fallback;
    const selector = this.activeMeta.selector;
    const data = this.exportSystem.getElementData(selector);
    if (!data) return fallback;

    if (this.currentBreakpoint !== 'universal') {
      const bp = data.breakpoints && data.breakpoints[this.currentBreakpoint];
      if (bp && bp[propKey] !== undefined && bp[propKey] !== null && bp[propKey] !== '') {
        return bp[propKey];
      }
    }

    if (data.styles && data.styles[propKey] !== undefined && data.styles[propKey] !== null && data.styles[propKey] !== '') {
      return data.styles[propKey];
    }

    return fallback;
  }

  /**
   * Reads current effective text content considering breakpoint overrides, universal overrides, and baselines
   */
  getEffectiveText(fallback = '') {
    if (!this.activeMeta || !this.exportSystem) return fallback;
    const selector = this.activeMeta.selector;
    const data = this.exportSystem.getElementData(selector);
    if (!data) return fallback;

    if (this.currentBreakpoint !== 'universal') {
      const bp = data.breakpoints && data.breakpoints[this.currentBreakpoint];
      if (bp && bp.text !== undefined) {
        return bp.text;
      }
    }

    if (data.text !== undefined) {
      return data.text;
    }

    return fallback;
  }

  /**
   * Check if a specific style or setting has been changed on the element for the current breakpoint context
   */
  isFieldChanged(fieldKey) {
    if (!this.activeElement || !this.activeMeta || !this.exportSystem) return false;
    const selector = this.activeMeta.selector;
    const data = this.exportSystem.getElementData(selector);
    if (!data) return false;

    if (fieldKey === 'text') {
      if (this.currentBreakpoint === 'universal') {
        return data.text !== undefined;
      }
      const hasBpText = Boolean(data.breakpoints && data.breakpoints[this.currentBreakpoint] && data.breakpoints[this.currentBreakpoint].text !== undefined);
      return hasBpText || (data.text !== undefined);
    }

    if (fieldKey === 'media') {
      if (this.currentBreakpoint === 'universal') {
        return data.media !== undefined;
      }
      const hasBpMedia = Boolean(data.breakpoints && data.breakpoints[this.currentBreakpoint] && data.breakpoints[this.currentBreakpoint].media !== undefined);
      return hasBpMedia || (data.media !== undefined);
    }

    if (fieldKey.startsWith('data-')) {
      const propName = fieldKey.replace(/^data-/, '');
      return Boolean(data.dataAttributes && data.dataAttributes[propName] !== undefined);
    }

    if (this.currentBreakpoint === 'universal') {
      return Boolean(data.styles && data.styles[fieldKey] !== undefined);
    }

    const hasBpStyle = Boolean(data.breakpoints && data.breakpoints[this.currentBreakpoint] && data.breakpoints[this.currentBreakpoint][fieldKey] !== undefined);
    const hasUnivStyle = Boolean(data.styles && data.styles[fieldKey] !== undefined);
    return hasBpStyle || hasUnivStyle;
  }

  /**
   * Calculate collective change counts per section across all elements and update tab bar badges
   */
  updateTabCounters() {
    const textBadge = this.container.querySelector('#badge-tab-text');
    const spacingBadge = this.container.querySelector('#badge-tab-spacing');
    const mediaBadge = this.container.querySelector('#badge-tab-media');
    const propsBadge = this.container.querySelector('#badge-tab-props');

    if (!this.exportSystem) {
      if (textBadge) textBadge.style.display = 'none';
      if (spacingBadge) spacingBadge.style.display = 'none';
      if (mediaBadge) mediaBadge.style.display = 'none';
      if (propsBadge) propsBadge.style.display = 'none';
      this._updateResetButtonVisibility();
      return;
    }

    const counts = this.exportSystem.getSectionCounts();

    this._updateBadge(textBadge, counts.text);
    this._updateBadge(spacingBadge, counts.spacing);
    this._updateBadge(mediaBadge, counts.media);
    this._updateBadge(propsBadge, counts.props);

    this._updateResetButtonVisibility();
  }

  _updateBadge(badgeEl, count) {
    if (!badgeEl) return;
    if (count > 0) {
      badgeEl.textContent = count;
      badgeEl.style.display = 'inline-flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  _renderActiveTab() {
    const contentEl = this.container.querySelector('#admin-tab-content');
    if (!contentEl || !this.activeElement || !this.activeMeta) return;

    if (this.activeTab === 'text') {
      contentEl.innerHTML = this._buildTextTabHtml();
      this._bindTextTabControls(contentEl);
    } else if (this.activeTab === 'spacing') {
      contentEl.innerHTML = this._buildSpacingTabHtml();
      this._bindSpacingTabControls(contentEl);
    } else if (this.activeTab === 'media') {
      contentEl.innerHTML = this._buildMediaTabHtml();
      this._bindMediaTabControls(contentEl);
    } else if (this.activeTab === 'props') {
      contentEl.innerHTML = this._buildPropsTabHtml();
      this._bindPropsTabControls(contentEl);
    }

    this._syncFieldIndicators();
  }

  /**
   * Synchronize the visibility of all field-level reset buttons and modification indicator dots
   */
  _syncFieldIndicators() {
    if (!this.container || !this.activeElement) return;
    const tabContent = this.container.querySelector('#admin-tab-content');
    if (!tabContent) return;

    tabContent.querySelectorAll('.admin-field-row, .admin-section').forEach(containerEl => {
      const allResetBtns = containerEl.querySelectorAll('.btn-field-reset');
      const allDots = containerEl.querySelectorAll('.field-change-dot');

      allResetBtns.forEach(btn => {
        const type = btn.dataset.resetType;
        const key = btn.dataset.resetKey;
        let isChanged = false;

        if (type === 'text') {
          isChanged = this.isFieldChanged('text');
        } else if (type === 'shadow') {
          isChanged = this.isFieldChanged('boxShadow') || this.isFieldChanged('textShadow');
        } else if (type === 'allMargins') {
          isChanged = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].some(k => this.isFieldChanged(k));
        } else if (type === 'allPaddings') {
          isChanged = ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].some(k => this.isFieldChanged(k));
        } else if (type === 'media') {
          isChanged = this.isFieldChanged('media') || this.isFieldChanged('backgroundImage');
        } else if (type === 'dataAttr') {
          isChanged = this.isFieldChanged(`data-${key}`) || this.isFieldChanged(key);
        } else if (type === 'style') {
          if (key === 'textTransform' || key === 'appearance') {
            isChanged = this.isFieldChanged('textTransform') || this.isFieldChanged('fontVariant');
          } else {
            isChanged = this.isFieldChanged(key);
          }
        }

        btn.style.display = isChanged ? 'inline-flex' : 'none';
      });

      allDots.forEach(dotEl => {
        const fieldKey = dotEl.dataset.fieldIndicator;
        let isChanged = false;
        if (fieldKey === 'text') isChanged = this.isFieldChanged('text');
        else if (fieldKey === 'shadow') isChanged = this.isFieldChanged('boxShadow') || this.isFieldChanged('textShadow');
        else if (fieldKey === 'allMargins') isChanged = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].some(k => this.isFieldChanged(k));
        else if (fieldKey === 'allPaddings') isChanged = ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].some(k => this.isFieldChanged(k));
        else if (fieldKey === 'media') isChanged = this.isFieldChanged('media') || this.isFieldChanged('backgroundImage');
        else if (fieldKey === 'appearance') isChanged = this.isFieldChanged('textTransform') || this.isFieldChanged('fontVariant');
        else if (fieldKey && fieldKey.startsWith('data-')) isChanged = this.isFieldChanged(fieldKey);
        else if (fieldKey) isChanged = this.isFieldChanged(fieldKey);

        dotEl.style.display = isChanged ? 'inline-block' : 'none';
      });

      if (containerEl.classList.contains('admin-section')) {
        const hasModifiedInside = containerEl.querySelector('.btn-field-reset[style*="inline-flex"], .field-change-dot[style*="inline-block"]') !== null;
        if (hasModifiedInside) {
          containerEl.classList.add('is-modified');
        } else {
          containerEl.classList.remove('is-modified');
        }
      } else if (containerEl.classList.contains('admin-field-row')) {
        const rowBtn = containerEl.querySelector('.btn-field-reset');
        const isRowChanged = rowBtn && rowBtn.style.display !== 'none';
        if (isRowChanged) {
          containerEl.classList.add('is-modified');
        } else {
          containerEl.classList.remove('is-modified');
        }
      }
    });

    this.updateTabCounters();
    this._updateResetButtonVisibility();
  }

  /**
   * Helper to build modern slider row with sleek minimal steppers (no circles)
   */
  _renderSliderRow(prefix, min, max, step, val, unit = 'px') {
    return `
      <div class="admin-slider-row">
        <input type="range" class="admin-range-input" id="slider-${prefix}" min="${min}" max="${max}" step="${step}" value="${val}">
        <div class="admin-stepper-wrap">
          <input type="number" class="admin-range-number" id="num-${prefix}" min="${min}" max="${max}" step="${step}" value="${val}">
          <div class="admin-stepper-btns">
            <button type="button" class="stepper-btn up" data-step-target="num-${prefix}" data-dir="1" tabindex="-1">
              <svg width="6" height="4" viewBox="0 0 6 4" fill="none"><path d="M1 3L3 1L5 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button type="button" class="stepper-btn down" data-step-target="num-${prefix}" data-dir="-1" tabindex="-1">
              <svg width="6" height="4" viewBox="0 0 6 4" fill="none"><path d="M1 1L3 3L5 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <span class="unit-label">${unit}</span>
      </div>
    `;
  }

  /**
   * Reset helper for a single property
   */
  resetProperty(type, key) {
    if (!this.activeElement || !this.activeMeta) return;
    const selector = this.activeMeta.selector;
    const baseline = this.elementBaselines.get(selector);

    if (type === 'text') {
      if (baseline) {
        if (baseline.isTextOnly) {
          this.activeElement.textContent = baseline.text;
        } else {
          this.activeElement.innerHTML = baseline.text;
        }
      }
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'text', 'text', this.currentBreakpoint);
      }
    } else if (type === 'shadow') {
      this.activeElement.style.removeProperty('text-shadow');
      this.activeElement.style.removeProperty('box-shadow');
      this.shadowState = { type: 'text', x: 0, y: 0, blur: 0, spread: 0, color: '#00e5ff', opacity: 0 };
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'style', 'textShadow', this.currentBreakpoint);
        this.exportSystem.removeChange(selector, 'style', 'boxShadow', this.currentBreakpoint);
      }
    } else if (type === 'allMargins') {
      ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].forEach(prop => {
        this.activeElement.style.removeProperty(this._camelToKebab(prop));
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', prop, this.currentBreakpoint);
        }
      });
    } else if (type === 'allPaddings') {
      ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach(prop => {
        this.activeElement.style.removeProperty(this._camelToKebab(prop));
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', prop, this.currentBreakpoint);
        }
      });
    } else if (type === 'style') {
      if (key === 'textTransform' || key === 'appearance') {
        this.activeElement.style.removeProperty('text-transform');
        this.activeElement.style.removeProperty('font-variant');
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', 'textTransform', this.currentBreakpoint);
          this.exportSystem.removeChange(selector, 'style', 'fontVariant', this.currentBreakpoint);
        }
      } else {
        this.activeElement.style.removeProperty(this._camelToKebab(key));
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', key, this.currentBreakpoint);
        }
      }
    } else if (type === 'media') {
      if (this.activeElement.tagName === 'IMG') {
        if (baseline && baseline.dataset && baseline.dataset.src) {
          this.activeElement.setAttribute('src', baseline.dataset.src);
        }
      }
      if (this.activeElement.dataset.audio) {
        delete this.activeElement.dataset.audio;
      }
      this.activeElement.style.removeProperty('background-image');
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'media', 'src', this.currentBreakpoint);
        this.exportSystem.removeChange(selector, 'media', 'audio', this.currentBreakpoint);
        this.exportSystem.removeChange(selector, 'dataAttr', 'audio', this.currentBreakpoint);
        this.exportSystem.removeChange(selector, 'style', 'backgroundImage', this.currentBreakpoint);
      }
    } else if (type === 'dataAttr') {
      delete this.activeElement.dataset[key];
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'dataAttr', key, this.currentBreakpoint);
      }
    }

    // 1. Notify change so exportSystem & schemaApplier immediately strip the dynamic override rule from the iframe <style>
    this._notifyChange({ reset: true, resetProperty: key });

    // 2. Now that dynamic styles are removed from iframe, refresh activeMeta.styles with clean computed values
    this._refreshActiveMetaStyles();

    // 3. If baseline recorded true computed color/background, ensure activeMeta matches accurately
    if (baseline) {
      if (key === 'color' && baseline.computedColor) {
        this.activeMeta.styles.color = baseline.computedColor;
      } else if (key === 'backgroundColor' && baseline.computedBgColor) {
        this.activeMeta.styles.backgroundColor = baseline.computedBgColor;
      } else if (key === 'borderColor' && baseline.computedBorderColor) {
        this.activeMeta.styles.borderColor = baseline.computedBorderColor;
      }
    }

    // 4. Re-parse existing shadow
    this._parseExistingShadow();

    // 5. Re-render the active tab
    this._renderActiveTab();
    this.updateTabCounters();
    this._updateResetButtonVisibility();
  }

  // ==========================================================================
  // TAB 1: TEXT & TYPOGRAPHY EDITOR
  // ==========================================================================
  _buildTextTabHtml() {
    const selector = this.activeMeta ? this.activeMeta.selector : null;
    const baseline = selector ? this.elementBaselines.get(selector) : null;
    const s = this.activeMeta.styles;
    const win = (this.activeElement && this.activeElement.ownerDocument) ? this.activeElement.ownerDocument.defaultView : window;
    const computed = win ? win.getComputedStyle(this.activeElement) : s;

    let textVal = this.getEffectiveText('');
    if (!textVal) {
      const textNodes = Array.from(this.activeElement.childNodes).filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
      if (textNodes.length > 0) {
        textVal = textNodes.map(n => n.textContent).join(' ').trim();
      } else if (this.activeElement.children.length === 0) {
        textVal = (this.activeElement.textContent || '').trim();
      } else {
        textVal = (this.activeElement.innerText || this.activeElement.textContent || '').trim();
      }
    }

    const getEffectiveColor = (key, computedVal, baselineVal) => {
      const eff = this.getEffectiveFieldValue(key, null);
      if (eff) return eff;
      return baselineVal || computedVal || s[key];
    };

    const textColorHex = this._rgbToHex(getEffectiveColor('color', computed.color, baseline ? baseline.computedColor : ''));
    const bgColorHex = this._rgbToHex(getEffectiveColor('backgroundColor', computed.backgroundColor, baseline ? baseline.computedBgColor : ''));
    const borderColorHex = this._rgbToHex(getEffectiveColor('borderColor', computed.borderColor, baseline ? baseline.computedBorderColor : ''));

    const effectiveWeight = this.getEffectiveFieldValue('fontWeight', baseline ? baseline.computedFontWeight : computed.fontWeight);
    const isBold = effectiveWeight >= 700 || effectiveWeight === 'bold';
    const effectiveFontStyle = this.getEffectiveFieldValue('fontStyle', computed.fontStyle);
    const isItalic = effectiveFontStyle === 'italic';
    const textTransform = this.getEffectiveFieldValue('textTransform', computed.textTransform || 'none');
    const fontVariant = this.getEffectiveFieldValue('fontVariant', computed.fontVariant || 'normal');

    // Parse Line Height
    let currentLineHeight = parseFloat(this.getEffectiveFieldValue('lineHeight', computed.lineHeight)) || 1.5;
    if (currentLineHeight > 10) {
      const fs = parseFloat(this.getEffectiveFieldValue('fontSize', computed.fontSize)) || 16;
      currentLineHeight = Math.round((currentLineHeight / fs) * 100) / 100;
    }

    // Parse Letter Spacing
    let currentLetterSpacing = parseFloat(this.getEffectiveFieldValue('letterSpacing', computed.letterSpacing)) || 0;

    // Check changed states for dots & reset symbols
    const hasTextChanged = this.isFieldChanged('text');
    const hasFontFamilyChanged = this.isFieldChanged('fontFamily');
    const hasFontSizeChanged = this.isFieldChanged('fontSize');
    const hasFontWeightChanged = this.isFieldChanged('fontWeight');
    const hasLineHeightChanged = this.isFieldChanged('lineHeight');
    const hasLetterSpacingChanged = this.isFieldChanged('letterSpacing');
    const hasAppearanceChanged = this.isFieldChanged('textTransform') || this.isFieldChanged('fontVariant');
    const hasTextAlignChanged = this.isFieldChanged('textAlign');
    const hasShadowChanged = this.isFieldChanged('boxShadow') || this.isFieldChanged('textShadow');
    const hasColorChanged = this.isFieldChanged('color');
    const hasBgChanged = this.isFieldChanged('backgroundColor');
    const hasBorderChanged = this.isFieldChanged('borderColor') || this.isFieldChanged('borderWidth') || this.isFieldChanged('borderRadius');

    return `
      <!-- Text Content -->
      <div class="admin-section ${hasTextChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Text Content</span>
            <span class="field-change-dot" data-field-indicator="text" style="display: ${hasTextChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <button type="button" class="btn-field-reset" data-reset-type="text" data-tooltip="Reset text content" style="display: ${hasTextChanged ? 'inline-flex' : 'none'};">↺</button>
        </div>
        <div class="admin-field-row" style="margin-bottom: 0;">
          <textarea class="admin-textarea" id="ctrl-text-content" rows="2" placeholder="Edit text content...">${textVal ? textVal.trim() : ''}</textarea>
        </div>
      </div>

      <!-- Typography -->
      <div class="admin-section">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Typography</span>
          </div>
        </div>

        <!-- Font Family -->
        <div class="admin-field-row ${hasFontFamilyChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label" for="ctrl-font-family">Font</label>
            <span class="field-change-dot" data-field-indicator="fontFamily" style="display: ${hasFontFamilyChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            <select class="admin-select" id="ctrl-font-family">
              <option value="'Dela Gothic One', sans-serif">Dela Gothic One (Display/Headings)</option>
              <option value="'DM Sans', sans-serif">DM Sans (Modern Body)</option>
              <option value="'Work Sans', sans-serif">Work Sans (Technical/Nav)</option>
              <option value="'Kanit', sans-serif">Kanit (Grotesk Heavy)</option>
              <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">System Sans</option>
              <option value="Georgia, serif">Classic Serif</option>
              <option value="'SF Mono', Monaco, monospace">Monospace</option>
            </select>
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="fontFamily" data-tooltip="Reset font family" style="display: ${hasFontFamilyChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Font Size Slider -->
        <div class="admin-field-row ${hasFontSizeChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Font Size</label>
            <span class="field-change-dot" data-field-indicator="fontSize" style="display: ${hasFontSizeChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('font-size', 10, 140, 1, parseFloat(this.getEffectiveFieldValue('fontSize', s.fontSize || computed.fontSize)) || 16, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="fontSize" data-tooltip="Reset font size" style="display: ${hasFontSizeChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Font Weight -->
        <div class="admin-field-row ${hasFontWeightChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label" for="ctrl-font-weight">Font Weight</label>
            <span class="field-change-dot" data-field-indicator="fontWeight" style="display: ${hasFontWeightChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            <select class="admin-select" id="ctrl-font-weight">
              <option value="100">100 - Thin</option>
              <option value="200">200 - Extra Light</option>
              <option value="300">300 - Light</option>
              <option value="400">400 - Regular</option>
              <option value="500">500 - Medium</option>
              <option value="600">600 - Semi Bold</option>
              <option value="700">700 - Bold</option>
              <option value="800">800 - Extra Bold</option>
              <option value="900">900 - Black</option>
            </select>
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="fontWeight" data-tooltip="Reset font weight" style="display: ${hasFontWeightChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Line Spacing (Line Height) -->
        <div class="admin-field-row ${hasLineHeightChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Line Spacing</label>
            <span class="field-change-dot" data-field-indicator="lineHeight" style="display: ${hasLineHeightChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('line-height', 0.8, 3.5, 0.05, currentLineHeight, 'em')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="lineHeight" data-tooltip="Reset line spacing" style="display: ${hasLineHeightChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Letter Spacing -->
        <div class="admin-field-row ${hasLetterSpacingChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Letter Spacing</label>
            <span class="field-change-dot" data-field-indicator="letterSpacing" style="display: ${hasLetterSpacingChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('letter-spacing', -3, 24, 0.5, currentLetterSpacing, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="letterSpacing" data-tooltip="Reset letter spacing" style="display: ${hasLetterSpacingChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Appearance: Normal, Upper, Lower, Title, Small Caps -->
        <div class="admin-field-row ${hasAppearanceChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Appearance</label>
            <span class="field-change-dot" data-field-indicator="appearance" style="display: ${hasAppearanceChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            <div class="admin-appearance-group">
              <button type="button" class="admin-case-btn ${textTransform === 'none' && fontVariant === 'normal' ? 'is-active' : ''}" data-case="normal" data-tooltip="Normal Case">Aa</button>
              <button type="button" class="admin-case-btn ${textTransform === 'uppercase' ? 'is-active' : ''}" data-case="uppercase" data-tooltip="UPPERCASE">AA</button>
              <button type="button" class="admin-case-btn ${textTransform === 'lowercase' ? 'is-active' : ''}" data-case="lowercase" data-tooltip="lowercase">aa</button>
              <button type="button" class="admin-case-btn ${textTransform === 'capitalize' ? 'is-active' : ''}" data-case="capitalize" data-tooltip="Title Case">Abc</button>
              <button type="button" class="admin-case-btn ${fontVariant === 'small-caps' ? 'is-active' : ''}" data-case="small-caps" data-tooltip="Small Caps">A<span style="font-size: 8px;">A</span></button>
            </div>
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="textTransform" data-tooltip="Reset appearance" style="display: ${hasAppearanceChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Alignment & Formatting -->
        <div class="admin-field-row ${hasTextAlignChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Alignment</label>
            <span class="field-change-dot" data-field-indicator="textAlign" style="display: ${hasTextAlignChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control" style="justify-content: space-between;">
            <div class="admin-button-group">
              <button type="button" class="admin-icon-toggle ${s.textAlign === 'left' ? 'is-active' : ''}" data-align="left" data-tooltip="Align Left">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
              </button>
              <button type="button" class="admin-icon-toggle ${s.textAlign === 'center' ? 'is-active' : ''}" data-align="center" data-tooltip="Align Center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>
              </button>
              <button type="button" class="admin-icon-toggle ${s.textAlign === 'right' ? 'is-active' : ''}" data-align="right" data-tooltip="Align Right">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
              </button>
            </div>

            <!-- Bold & Italic Toggles -->
            <div class="admin-button-group">
              <button type="button" class="admin-icon-toggle ${isBold ? 'is-active' : ''}" id="btn-toggle-bold" data-tooltip="Bold">
                <strong>B</strong>
              </button>
              <button type="button" class="admin-icon-toggle ${isItalic ? 'is-active' : ''}" id="btn-toggle-italic" data-tooltip="Italic">
                <em>I</em>
              </button>
            </div>
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="textAlign" data-tooltip="Reset alignment" style="display: ${hasTextAlignChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>
      </div>

      <!-- Non-Code Visual Shadow & Glow Studio (Text Shadow vs Box Shadow) -->
      <div class="admin-section ${hasShadowChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Shadow & Glow Studio</span>
            <span class="field-change-dot" data-field-indicator="shadow" style="display: ${hasShadowChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <button type="button" class="btn-field-reset" data-reset-type="shadow" data-tooltip="Reset shadow & glow" style="display: ${hasShadowChanged ? 'inline-flex' : 'none'};">↺</button>
        </div>

        <div class="admin-shadow-studio-body">
          <!-- Shadow Target Mode: Text Glow vs Box Shadow -->
          <div class="admin-field-row" style="margin-bottom: 4px;">
            <label class="admin-field-label">Target</label>
            <div class="admin-field-control">
              <div class="admin-appearance-group" id="shadow-target-group">
                <button type="button" class="admin-case-btn ${this.shadowState.type === 'text' ? 'is-active' : ''}" data-shadow-type="text" data-tooltip="Apply glow directly to the text letters">Text Glow</button>
                <button type="button" class="admin-case-btn ${this.shadowState.type === 'box' ? 'is-active' : ''}" data-shadow-type="box" data-tooltip="Apply shadow to the container box/card">Box Shadow</button>
              </div>
            </div>
          </div>

          <!-- Visual Live Swatch -->
          <div class="admin-shadow-swatch-wrap">
            <div class="admin-shadow-preview-swatch ${this.shadowState.type === 'text' ? 'is-text-preview' : 'is-box-preview'}" id="shadow-preview-swatch">
              <span id="shadow-preview-text">GLOW PREVIEW</span>
            </div>
          </div>

          <!-- Presets -->
          <div class="admin-field-row" style="margin-top: 2px;">
            <label class="admin-field-label">Presets</label>
            <div class="admin-shadow-presets">
              <button type="button" class="shadow-preset-btn" data-preset="none">None</button>
              <button type="button" class="shadow-preset-btn" data-preset="glow">Cyan Glow</button>
              <button type="button" class="shadow-preset-btn" data-preset="magenta">Neon Pink</button>
              <button type="button" class="shadow-preset-btn" data-preset="subtle">Soft Dark</button>
              <button type="button" class="shadow-preset-btn" data-preset="deep">Deep Aura</button>
            </div>
          </div>

          <!-- X Offset -->
          <div class="admin-field-row">
            <label class="admin-field-label">X Offset</label>
            <div class="admin-field-control">
              ${this._renderSliderRow('shadow-x', -40, 40, 1, this.shadowState.x, 'px')}
            </div>
          </div>

          <!-- Y Offset -->
          <div class="admin-field-row">
            <label class="admin-field-label">Y Offset</label>
            <div class="admin-field-control">
              ${this._renderSliderRow('shadow-y', -40, 40, 1, this.shadowState.y, 'px')}
            </div>
          </div>

          <!-- Blur Radius -->
          <div class="admin-field-row">
            <label class="admin-field-label">Blur Radius</label>
            <div class="admin-field-control">
              ${this._renderSliderRow('shadow-blur', 0, 60, 1, this.shadowState.blur, 'px')}
            </div>
          </div>

          <!-- Spread Radius (Only applicable for Box Shadow) -->
          <div class="admin-field-row" id="row-shadow-spread" style="${this.shadowState.type === 'text' ? 'display: none;' : ''}">
            <label class="admin-field-label">Spread</label>
            <div class="admin-field-control">
              ${this._renderSliderRow('shadow-spread', -20, 30, 1, this.shadowState.spread, 'px')}
            </div>
          </div>

          <!-- Shadow Color & Opacity -->
          <div class="admin-field-row">
            <label class="admin-field-label">Color & Alpha</label>
            <div class="admin-field-control">
              <div class="admin-color-field" style="flex: 1;">
                <div class="admin-color-preview-wrap" style="background-color: ${this.shadowState.color};">
                  <input type="color" class="admin-color-native" id="native-color-shadow" value="${this.shadowState.color}">
                </div>
                <input type="text" class="admin-input admin-color-hex-input" id="hex-color-shadow" value="${this.shadowState.color}">
              </div>
              <div style="display: flex; align-items: center; gap: 4px; width: 78px;">
                <div class="admin-stepper-wrap" style="flex: 1;">
                  <input type="number" class="admin-range-number" id="num-shadow-opacity" min="0" max="100" step="5" value="${this.shadowState.opacity}">
                  <div class="admin-stepper-btns">
                    <button type="button" class="stepper-btn up" data-step-target="num-shadow-opacity" data-dir="1" tabindex="-1">
                      <svg width="6" height="4" viewBox="0 0 6 4" fill="none"><path d="M1 3L3 1L5 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button type="button" class="stepper-btn down" data-step-target="num-shadow-opacity" data-dir="-1" tabindex="-1">
                      <svg width="6" height="4" viewBox="0 0 6 4" fill="none"><path d="M1 1L3 3L5 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                <span class="unit-label">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Colors (Text, Background, Border) -->
      <div class="admin-section">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Colors & Borders</span>
          </div>
        </div>

        <!-- Text Color -->
        <div class="admin-field-row ${hasColorChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Font Color</label>
            <span class="field-change-dot" data-field-indicator="color" style="display: ${hasColorChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            <div class="admin-color-field">
              <div class="admin-color-preview-wrap" style="background-color: ${textColorHex};">
                <input type="color" class="admin-color-native" id="native-color-text" value="${textColorHex}">
              </div>
              <input type="text" class="admin-input admin-color-hex-input" id="hex-color-text" value="${textColorHex}">
            </div>
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="color" data-tooltip="Reset font color" style="display: ${hasColorChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Background Color -->
        <div class="admin-field-row ${hasBgChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Background</label>
            <span class="field-change-dot" data-field-indicator="backgroundColor" style="display: ${hasBgChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            <div class="admin-color-field">
              <div class="admin-color-preview-wrap" style="background-color: ${bgColorHex};">
                <input type="color" class="admin-color-native" id="native-color-bg" value="${bgColorHex}">
              </div>
              <input type="text" class="admin-input admin-color-hex-input" id="hex-color-bg" value="${bgColorHex}">
            </div>
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="backgroundColor" data-tooltip="Reset background" style="display: ${hasBgChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Border Color -->
        <div class="admin-field-row ${hasBorderChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Border Color</label>
            <span class="field-change-dot" data-field-indicator="borderColor" style="display: ${hasBorderChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            <div class="admin-color-field">
              <div class="admin-color-preview-wrap" style="background-color: ${borderColorHex};">
                <input type="color" class="admin-color-native" id="native-color-border" value="${borderColorHex}">
              </div>
              <input type="text" class="admin-input admin-color-hex-input" id="hex-color-border" value="${borderColorHex}">
            </div>
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="borderColor" data-tooltip="Reset border color" style="display: ${hasBorderChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Border Width -->
        <div class="admin-field-row ${this.isFieldChanged('borderWidth') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Border Width</label>
            <span class="field-change-dot" data-field-indicator="borderWidth" style="display: ${this.isFieldChanged('borderWidth') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('border-width', 0, 20, 1, parseFloat(this.getEffectiveFieldValue('borderWidth', s.borderWidth || computed.borderWidth)) || 0, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="borderWidth" data-tooltip="Reset border width" style="display: ${this.isFieldChanged('borderWidth') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Border Radius -->
        <div class="admin-field-row ${this.isFieldChanged('borderRadius') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Border Radius</label>
            <span class="field-change-dot" data-field-indicator="borderRadius" style="display: ${this.isFieldChanged('borderRadius') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('border-radius', 0, 48, 1, parseFloat(this.getEffectiveFieldValue('borderRadius', s.borderRadius || computed.borderRadius)) || 0, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="borderRadius" data-tooltip="Reset border radius" style="display: ${this.isFieldChanged('borderRadius') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>
      </div>
    `;
  }

  _bindTextTabControls(container) {
    // 1. Text Content Live Edit
    const textInput = container.querySelector('#ctrl-text-content');
    if (textInput) {
      textInput.addEventListener('input', () => {
        const newVal = textInput.value;
        const textNodes = Array.from(this.activeElement.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
        if (textNodes.length > 0) {
          textNodes[0].textContent = newVal;
          for (let i = 1; i < textNodes.length; i++) {
            textNodes[i].textContent = '';
          }
        } else if (this.activeElement.children.length === 0) {
          this.activeElement.textContent = newVal;
        } else {
          const newTextNode = this.activeElement.ownerDocument.createTextNode(newVal);
          this.activeElement.insertBefore(newTextNode, this.activeElement.firstChild);
        }
        this._notifyChange({ text: newVal });
        this.updateTabCounters();
      });
    }

    // 2. Font Family
    const fontSelect = container.querySelector('#ctrl-font-family');
    if (fontSelect) {
      const computed = window.getComputedStyle ? window.getComputedStyle(this.activeElement) : {};
      const currentFamily = this.activeElement.style.fontFamily || (this.activeMeta.styles && this.activeMeta.styles.fontFamily) || computed.fontFamily || '';
      let matched = false;
      if (currentFamily) {
        const cleanCurrent = currentFamily.toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
        for (const opt of fontSelect.options) {
          const cleanOpt = opt.value.toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
          if (cleanOpt === cleanCurrent || cleanCurrent.includes(cleanOpt) || cleanOpt.includes(cleanCurrent)) {
            fontSelect.value = opt.value;
            matched = true;
            break;
          }
        }
        if (!matched && cleanCurrent) {
          const customOpt = document.createElement('option');
          customOpt.value = currentFamily;
          customOpt.textContent = `Custom (${currentFamily.split(',')[0].replace(/['"]/g, '')})`;
          customOpt.selected = true;
          fontSelect.appendChild(customOpt);
          fontSelect.value = currentFamily;
        }
      }

      fontSelect.addEventListener('change', () => {
        this.activeElement.style.removeProperty('font-family');
        this._notifyChange({ styleKey: 'fontFamily', val: fontSelect.value });
        this.updateTabCounters();
      });
    }

    // 3. Font Size Slider & Stepper
    this._bindSliderPair(container, 'font-size', (val) => {
      this.activeElement.style.removeProperty('font-size');
      this._notifyChange({ styleKey: 'fontSize', val: `${val}px` });
      this.updateTabCounters();
    });

    // 4. Font Weight
    const weightSelect = container.querySelector('#ctrl-font-weight');
    if (weightSelect) {
      const computed = window.getComputedStyle ? window.getComputedStyle(this.activeElement) : {};
      const rawWeight = this.activeElement.style.fontWeight || (this.activeMeta.styles && this.activeMeta.styles.fontWeight) || computed.fontWeight || '400';
      let normWeight = '400';
      if (rawWeight === 'bold' || rawWeight === 'bolder') normWeight = '700';
      else if (rawWeight === 'normal' || rawWeight === 'lighter') normWeight = '400';
      else if (!isNaN(parseInt(rawWeight, 10))) normWeight = String(parseInt(rawWeight, 10));

      let matchedWeight = false;
      for (const opt of weightSelect.options) {
        if (opt.value === normWeight) {
          weightSelect.value = normWeight;
          matchedWeight = true;
          break;
        }
      }
      if (!matchedWeight) {
        weightSelect.value = '400';
      }

      weightSelect.addEventListener('change', () => {
        this.activeElement.style.removeProperty('font-weight');
        this._notifyChange({ styleKey: 'fontWeight', val: weightSelect.value });
        this.updateTabCounters();
      });
    }

    // 5. Line Spacing (Line Height)
    this._bindSliderPair(container, 'line-height', (val) => {
      this.activeElement.style.removeProperty('line-height');
      this._notifyChange({ styleKey: 'lineHeight', val: `${val}` });
      this.updateTabCounters();
    });

    // 6. Letter Spacing
    this._bindSliderPair(container, 'letter-spacing', (val) => {
      this.activeElement.style.removeProperty('letter-spacing');
      this._notifyChange({ styleKey: 'letterSpacing', val: `${val}px` });
      this.updateTabCounters();
    });

    // 7. Appearance: Case Switching
    container.querySelectorAll('.admin-case-btn[data-case]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.admin-case-btn[data-case]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const caseVal = btn.dataset.case;
        this.activeElement.style.removeProperty('font-variant');
        this.activeElement.style.removeProperty('text-transform');
        if (caseVal === 'small-caps') {
          this._notifyChange({ styleKey: 'fontVariant', val: 'small-caps' });
          this._notifyChange({ styleKey: 'textTransform', val: 'none' });
        } else {
          this._notifyChange({ styleKey: 'fontVariant', val: 'normal' });
          this._notifyChange({ styleKey: 'textTransform', val: caseVal === 'normal' ? 'none' : caseVal });
        }
        this.updateTabCounters();
      });
    });

    // 8. Alignments
    container.querySelectorAll('[data-align]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-align]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const align = btn.dataset.align;
        this.activeElement.style.removeProperty('text-align');
        this._notifyChange({ styleKey: 'textAlign', val: align });
        this.updateTabCounters();
      });
    });

    // 9. Bold & Italic
    const boldBtn = container.querySelector('#btn-toggle-bold');
    if (boldBtn) {
      boldBtn.addEventListener('click', () => {
        const isBold = boldBtn.classList.toggle('is-active');
        const val = isBold ? '700' : '400';
        this.activeElement.style.removeProperty('font-weight');
        if (weightSelect) weightSelect.value = val;
        this._notifyChange({ styleKey: 'fontWeight', val });
        this.updateTabCounters();
      });
    }

    const italicBtn = container.querySelector('#btn-toggle-italic');
    if (italicBtn) {
      italicBtn.addEventListener('click', () => {
        const isItalic = italicBtn.classList.toggle('is-active');
        const val = isItalic ? 'italic' : 'normal';
        this.activeElement.style.removeProperty('font-style');
        this._notifyChange({ styleKey: 'fontStyle', val });
        this.updateTabCounters();
      });
    }

    // 10. Non-code Shadow & Glow Studio controls
    this._bindShadowStudioControls(container);

    // 11. Colors
    this._bindColorPair(container, 'text', (val) => {
      this.activeElement.style.removeProperty('color');
      this._notifyChange({ styleKey: 'color', val });
      this.updateTabCounters();
    });

    this._bindColorPair(container, 'bg', (val) => {
      this.activeElement.style.removeProperty('background-color');
      this._notifyChange({ styleKey: 'backgroundColor', val });
      this.updateTabCounters();
    });

    this._bindColorPair(container, 'border', (val) => {
      this.activeElement.style.removeProperty('border-color');
      this._notifyChange({ styleKey: 'borderColor', val });
      this.updateTabCounters();
    });

    // 12. Border width & radius
    this._bindSliderPair(container, 'border-width', (val) => {
      this.activeElement.style.removeProperty('border-width');
      this._notifyChange({ styleKey: 'borderWidth', val: `${val}px` });
      this.updateTabCounters();
    });

    this._bindSliderPair(container, 'border-radius', (val) => {
      this.activeElement.style.removeProperty('border-radius');
      this._notifyChange({ styleKey: 'borderRadius', val: `${val}px` });
      this.updateTabCounters();
    });

    // 13. Bind inline reset buttons
    this._bindResetButtons(container);
  }

  _bindShadowStudioControls(container) {
    const swatch = container.querySelector('#shadow-preview-swatch');
    const swatchText = container.querySelector('#shadow-preview-text');
    const spreadRow = container.querySelector('#row-shadow-spread');

    const updateSwatchOnly = () => {
      if (!swatch) return;
      const { x, y, blur, spread, color, opacity, type } = this.shadowState;
      const alpha = Math.max(0, Math.min(1, opacity / 100));
      const rgb = this._hexToRgb(color);
      const rgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

      if (type === 'text') {
        swatch.classList.add('is-text-preview');
        swatch.classList.remove('is-box-preview');
        swatch.style.boxShadow = 'none';
        const textShadowCss = opacity > 0 ? `${x}px ${y}px ${blur}px ${rgbaColor}` : 'none';
        if (swatchText) swatchText.style.textShadow = textShadowCss;
      } else {
        swatch.classList.remove('is-text-preview');
        swatch.classList.add('is-box-preview');
        if (swatchText) swatchText.style.textShadow = 'none';
        const boxCss = opacity > 0 ? `${x}px ${y}px ${blur}px ${spread}px ${rgbaColor}` : 'none';
        swatch.style.boxShadow = boxCss;
      }
    };

    const applyShadowToElement = () => {
      const { x, y, blur, spread, color, opacity, type } = this.shadowState;
      const alpha = Math.max(0, Math.min(1, opacity / 100));
      const rgb = this._hexToRgb(color);
      const rgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

      updateSwatchOnly();

      if (type === 'text') {
        const textShadowCss = opacity > 0 ? `${x}px ${y}px ${blur}px ${rgbaColor}` : 'none';
        this.activeElement.style.removeProperty('text-shadow');
        this._notifyChange({ styleKey: 'textShadow', val: textShadowCss });
      } else {
        const boxCss = opacity > 0 ? `${x}px ${y}px ${blur}px ${spread}px ${rgbaColor}` : 'none';
        this.activeElement.style.removeProperty('box-shadow');
        this._notifyChange({ styleKey: 'boxShadow', val: boxCss });
      }

      this.updateTabCounters();
      this._updateResetButtonVisibility();
    };

    // Target switcher (Text Glow vs Box Shadow)
    container.querySelectorAll('#shadow-target-group [data-shadow-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#shadow-target-group [data-shadow-type]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.shadowState.type = btn.dataset.shadowType;

        if (spreadRow) {
          spreadRow.style.display = this.shadowState.type === 'text' ? 'none' : 'flex';
        }

        applyShadowToElement();
      });
    });

    // Sliders
    this._bindSliderPair(container, 'shadow-x', (val) => {
      this.shadowState.x = val;
      applyShadowToElement();
    });
    this._bindSliderPair(container, 'shadow-y', (val) => {
      this.shadowState.y = val;
      applyShadowToElement();
    });
    this._bindSliderPair(container, 'shadow-blur', (val) => {
      this.shadowState.blur = val;
      applyShadowToElement();
    });
    this._bindSliderPair(container, 'shadow-spread', (val) => {
      this.shadowState.spread = val;
      applyShadowToElement();
    });

    // Shadow Color
    this._bindColorPair(container, 'shadow', (val) => {
      this.shadowState.color = val;
      applyShadowToElement();
    });

    // Opacity
    const opacityInput = container.querySelector('#num-shadow-opacity');
    if (opacityInput) {
      opacityInput.addEventListener('input', () => {
        this.shadowState.opacity = parseInt(opacityInput.value, 10) || 0;
        applyShadowToElement();
      });

      // Stepper arrows for opacity
      container.querySelectorAll('.stepper-btn[data-step-target="num-shadow-opacity"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const dir = parseInt(btn.dataset.dir, 10) || 1;
          let current = parseInt(opacityInput.value, 10) || 0;
          current = Math.max(0, Math.min(100, current + (dir * 5)));
          opacityInput.value = current;
          this.shadowState.opacity = current;
          applyShadowToElement();
        });
      });
    }

    // Presets
    container.querySelectorAll('.shadow-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (preset === 'none') {
          this.shadowState = { ...this.shadowState, x: 0, y: 0, blur: 0, spread: 0, opacity: 0 };
          this.activeElement.style.boxShadow = 'none';
          this.activeElement.style.textShadow = 'none';
          this._notifyChange({ styleKey: 'boxShadow', val: 'none' });
          this._notifyChange({ styleKey: 'textShadow', val: 'none' });
          this._renderActiveTab();
          return;
        } else if (preset === 'glow') {
          this.shadowState = { ...this.shadowState, x: 0, y: 0, blur: 18, spread: 2, color: '#00e5ff', opacity: 70 };
        } else if (preset === 'magenta') {
          this.shadowState = { ...this.shadowState, x: 0, y: 0, blur: 20, spread: 3, color: '#fa00ff', opacity: 75 };
        } else if (preset === 'subtle') {
          this.shadowState = { ...this.shadowState, x: 0, y: 2, blur: 8, spread: 0, color: '#000000', opacity: 25 };
        } else if (preset === 'deep') {
          this.shadowState = { ...this.shadowState, x: 0, y: 10, blur: 28, spread: -2, color: '#000000', opacity: 65 };
        }
        applyShadowToElement();
        this._renderActiveTab();
      });
    });

    // Initial swatch render ONLY (DO NOT modify activeElement on inspect!)
    updateSwatchOnly();
  }

  // ==========================================================================
  // TAB 2: MARGIN & SPACING SLIDERS (0px to 120px)
  // ==========================================================================
  _buildSpacingTabHtml() {
    const selector = this.activeMeta ? this.activeMeta.selector : null;
    const baseline = selector ? this.elementBaselines.get(selector) : null;
    const s = (this.activeMeta && this.activeMeta.styles) ? this.activeMeta.styles : {};
    const win = (this.activeElement && this.activeElement.ownerDocument) ? this.activeElement.ownerDocument.defaultView : window;
    const computed = (win && this.activeElement) ? win.getComputedStyle(this.activeElement) : null;

    const getSpacingValue = (key) => {
      // 1. Check if user has an explicit override (device-scoped or universal)
      const overrideVal = this.getEffectiveFieldValue(key, null);
      if (overrideVal !== null && overrideVal !== undefined && overrideVal !== '') {
        const n = parseFloat(overrideVal);
        if (!isNaN(n)) return Math.round(n);
      }

      // 2. Check metadata styles snapshot extracted when element was inspected
      if (s && s[key] !== undefined && s[key] !== null && s[key] !== '') {
        const n = parseFloat(s[key]);
        if (!isNaN(n)) return Math.round(n);
      }

      // 3. Check live computed style from iframe element
      if (computed) {
        const compVal = computed[key];
        if (compVal !== undefined && compVal !== null && compVal !== '' && compVal !== 'normal' && compVal !== 'auto') {
          const n = parseFloat(compVal);
          if (!isNaN(n)) return Math.round(n);
        }
      }

      // 4. Check baseline computed property
      if (baseline) {
        const baseKey = `computed${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (baseline[baseKey] !== undefined && baseline[baseKey] !== '' && baseline[baseKey] !== 'normal' && baseline[baseKey] !== 'auto') {
          const n = parseFloat(baseline[baseKey]);
          if (!isNaN(n)) return Math.round(n);
        }
      }

      return 0;
    };

    const mt = getSpacingValue('marginTop');
    const mb = getSpacingValue('marginBottom');
    const ml = getSpacingValue('marginLeft');
    const mr = getSpacingValue('marginRight');

    const pt = getSpacingValue('paddingTop');
    const pb = getSpacingValue('paddingBottom');
    const pl = getSpacingValue('paddingLeft');
    const pr = getSpacingValue('paddingRight');

    const gap = getSpacingValue('gap');

    const hasMarginChanged = this.isFieldChanged('marginTop') || this.isFieldChanged('marginBottom') || this.isFieldChanged('marginLeft') || this.isFieldChanged('marginRight');
    const hasPaddingChanged = this.isFieldChanged('paddingTop') || this.isFieldChanged('paddingBottom') || this.isFieldChanged('paddingLeft') || this.isFieldChanged('paddingRight');
    const hasGapChanged = this.isFieldChanged('gap');

    return `
      <!-- Visual Box Model Interactive Diagram -->
      <div class="admin-section">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Box Model (Figma / DevTools)</span>
          </div>
        </div>
        <div class="admin-box-model">
          <span class="admin-box-label">Margin</span>
          <span class="box-val top" id="box-val-mt">${mt}</span>
          <span class="box-val bottom" id="box-val-mb">${mb}</span>
          <span class="box-val left" id="box-val-ml">${ml}</span>
          <span class="box-val right" id="box-val-mr">${mr}</span>

          <div class="admin-box-padding">
            <span class="admin-box-label" style="color: #10b981;">Padding</span>
            <span class="box-val top" id="box-val-pt">${pt}</span>
            <span class="box-val bottom" id="box-val-pb">${pb}</span>
            <span class="box-val left" id="box-val-pl">${pl}</span>
            <span class="box-val right" id="box-val-pr">${pr}</span>

            <div class="admin-box-content">
              <span>${this.activeMeta.tagName.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Page & Element Margins (0px to 120px) -->
      <div class="admin-section ${hasMarginChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Margins (0px – 120px)</span>
            <span class="field-change-dot" data-field-indicator="allMargins" style="display: ${hasMarginChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" class="admin-btn admin-btn-ghost" id="btn-toggle-link-margin" style="padding: 2px 6px; font-size: 10px;">
              ${this.linkMargins ? '🔗 Linked' : '🔓 Unlinked'}
            </button>
            <button type="button" class="btn-field-reset" data-reset-type="allMargins" data-tooltip="Reset all margins" style="display: ${hasMarginChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Margin Top -->
        <div class="admin-field-row ${this.isFieldChanged('marginTop') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Margin Top</label>
            <span class="field-change-dot" data-field-indicator="marginTop" style="display: ${this.isFieldChanged('marginTop') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('margin-top', 0, 120, 1, mt, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="marginTop" data-tooltip="Reset margin top" style="display: ${this.isFieldChanged('marginTop') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Margin Bottom -->
        <div class="admin-field-row ${this.isFieldChanged('marginBottom') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Margin Bottom</label>
            <span class="field-change-dot" data-field-indicator="marginBottom" style="display: ${this.isFieldChanged('marginBottom') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('margin-bottom', 0, 120, 1, mb, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="marginBottom" data-tooltip="Reset margin bottom" style="display: ${this.isFieldChanged('marginBottom') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Margin Left -->
        <div class="admin-field-row ${this.isFieldChanged('marginLeft') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Margin Left</label>
            <span class="field-change-dot" data-field-indicator="marginLeft" style="display: ${this.isFieldChanged('marginLeft') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('margin-left', 0, 120, 1, ml, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="marginLeft" data-tooltip="Reset margin left" style="display: ${this.isFieldChanged('marginLeft') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Margin Right -->
        <div class="admin-field-row ${this.isFieldChanged('marginRight') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Margin Right</label>
            <span class="field-change-dot" data-field-indicator="marginRight" style="display: ${this.isFieldChanged('marginRight') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('margin-right', 0, 120, 1, mr, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="marginRight" data-tooltip="Reset margin right" style="display: ${this.isFieldChanged('marginRight') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>
      </div>

      <!-- Element Paddings (0px to 120px) -->
      <div class="admin-section ${hasPaddingChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Paddings (0px – 120px)</span>
            <span class="field-change-dot" data-field-indicator="allPaddings" style="display: ${hasPaddingChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" class="admin-btn admin-btn-ghost" id="btn-toggle-link-padding" style="padding: 2px 6px; font-size: 10px;">
              ${this.linkPaddings ? '🔗 Linked' : '🔓 Unlinked'}
            </button>
            <button type="button" class="btn-field-reset" data-reset-type="allPaddings" data-tooltip="Reset all paddings" style="display: ${hasPaddingChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Padding Top -->
        <div class="admin-field-row ${this.isFieldChanged('paddingTop') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Padding Top</label>
            <span class="field-change-dot" data-field-indicator="paddingTop" style="display: ${this.isFieldChanged('paddingTop') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('padding-top', 0, 120, 1, pt, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="paddingTop" data-tooltip="Reset padding top" style="display: ${this.isFieldChanged('paddingTop') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Padding Bottom -->
        <div class="admin-field-row ${this.isFieldChanged('paddingBottom') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Padding Bottom</label>
            <span class="field-change-dot" data-field-indicator="paddingBottom" style="display: ${this.isFieldChanged('paddingBottom') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('padding-bottom', 0, 120, 1, pb, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="paddingBottom" data-tooltip="Reset padding bottom" style="display: ${this.isFieldChanged('paddingBottom') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Padding Left -->
        <div class="admin-field-row ${this.isFieldChanged('paddingLeft') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Padding Left</label>
            <span class="field-change-dot" data-field-indicator="paddingLeft" style="display: ${this.isFieldChanged('paddingLeft') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('padding-left', 0, 120, 1, pl, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="paddingLeft" data-tooltip="Reset padding left" style="display: ${this.isFieldChanged('paddingLeft') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Padding Right -->
        <div class="admin-field-row ${this.isFieldChanged('paddingRight') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Padding Right</label>
            <span class="field-change-dot" data-field-indicator="paddingRight" style="display: ${this.isFieldChanged('paddingRight') ? 'inline-block' : 'none'};">●</span>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('padding-right', 0, 120, 1, pr, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="paddingRight" data-tooltip="Reset padding right" style="display: ${this.isFieldChanged('paddingRight') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>
      </div>

      <!-- Gap (Flex/Grid) -->
      <div class="admin-section ${hasGapChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Flex / Grid Gap</span>
            <span class="field-change-dot" data-field-indicator="gap" style="display: ${hasGapChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="gap" data-tooltip="Reset gap" style="display: ${hasGapChanged ? 'inline-flex' : 'none'};">↺</button>
        </div>
        <div class="admin-field-row">
          <label class="admin-field-label">Gap Spacing</label>
          <div class="admin-field-control">
            ${this._renderSliderRow('gap', 0, 80, 1, gap, 'px')}
          </div>
        </div>
      </div>
    `;
  }

  _bindSpacingTabControls(container) {
    // 1. Link Toggles
    const linkMarginBtn = container.querySelector('#btn-toggle-link-margin');
    if (linkMarginBtn) {
      linkMarginBtn.addEventListener('click', () => {
        this.linkMargins = !this.linkMargins;
        linkMarginBtn.textContent = this.linkMargins ? '🔗 Linked' : '🔓 Unlinked';
      });
    }

    const linkPaddingBtn = container.querySelector('#btn-toggle-link-padding');
    if (linkPaddingBtn) {
      linkPaddingBtn.addEventListener('click', () => {
        this.linkPaddings = !this.linkPaddings;
        linkPaddingBtn.textContent = this.linkPaddings ? '🔗 Linked' : '🔓 Unlinked';
      });
    }

    // Box model number labels
    const boxMt = container.querySelector('#box-val-mt');
    const boxMb = container.querySelector('#box-val-mb');
    const boxMl = container.querySelector('#box-val-ml');
    const boxMr = container.querySelector('#box-val-mr');

    const boxPt = container.querySelector('#box-val-pt');
    const boxPb = container.querySelector('#box-val-pb');
    const boxPl = container.querySelector('#box-val-pl');
    const boxPr = container.querySelector('#box-val-pr');

    // 2. Margins
    const setMargin = (dir, val) => {
      const key = `margin${dir.charAt(0).toUpperCase() + dir.slice(1)}`;
      this.activeElement.style.removeProperty(this._camelToKebab(key));
      this._notifyChange({ styleKey: key, val: `${val}px` });
    };

    this._bindSliderPair(container, 'margin-top', (val) => {
      if (boxMt) boxMt.textContent = val;
      if (this.linkMargins) {
        ['Top', 'Bottom', 'Left', 'Right'].forEach(d => {
          this.activeElement.style.removeProperty(`margin-${d.toLowerCase()}`);
          this._notifyChange({ styleKey: `margin${d}`, val: `${val}px` });
        });
        this._renderActiveTab();
      } else {
        setMargin('top', val);
      }
      this.updateTabCounters();
    });

    this._bindSliderPair(container, 'margin-bottom', (val) => {
      if (boxMb) boxMb.textContent = val;
      setMargin('bottom', val);
      this.updateTabCounters();
    });

    this._bindSliderPair(container, 'margin-left', (val) => {
      if (boxMl) boxMl.textContent = val;
      setMargin('left', val);
      this.updateTabCounters();
    });

    this._bindSliderPair(container, 'margin-right', (val) => {
      if (boxMr) boxMr.textContent = val;
      setMargin('right', val);
      this.updateTabCounters();
    });

    // 3. Paddings
    const setPadding = (dir, val) => {
      const key = `padding${dir.charAt(0).toUpperCase() + dir.slice(1)}`;
      this.activeElement.style.removeProperty(this._camelToKebab(key));
      this._notifyChange({ styleKey: key, val: `${val}px` });
    };

    this._bindSliderPair(container, 'padding-top', (val) => {
      if (boxPt) boxPt.textContent = val;
      if (this.linkPaddings) {
        ['Top', 'Bottom', 'Left', 'Right'].forEach(d => {
          this.activeElement.style.removeProperty(`padding-${d.toLowerCase()}`);
          this._notifyChange({ styleKey: `padding${d}`, val: `${val}px` });
        });
        this._renderActiveTab();
      } else {
        setPadding('top', val);
      }
      this.updateTabCounters();
    });

    this._bindSliderPair(container, 'padding-bottom', (val) => {
      if (boxPb) boxPb.textContent = val;
      setPadding('bottom', val);
      this.updateTabCounters();
    });

    this._bindSliderPair(container, 'padding-left', (val) => {
      if (boxPl) boxPl.textContent = val;
      setPadding('left', val);
      this.updateTabCounters();
    });

    this._bindSliderPair(container, 'padding-right', (val) => {
      if (boxPr) boxPr.textContent = val;
      setPadding('right', val);
      this.updateTabCounters();
    });

    // 4. Gap
    this._bindSliderPair(container, 'gap', (val) => {
      this.activeElement.style.removeProperty('gap');
      this._notifyChange({ styleKey: 'gap', val: `${val}px` });
      this.updateTabCounters();
    });

    // 5. Reset buttons
    this._bindResetButtons(container);
  }

  // ==========================================================================
  // TAB 3: MEDIA DROP ZONES (Audio & Images routed via /api/upload)
  // ==========================================================================
  _buildMediaTabHtml() {
    const isImg = this.activeElement.tagName === 'IMG';
    const isAudioTarget = this.activeElement.hasAttribute('data-audio') || this.activeElement.closest('[data-audio]');
    const currentSrc = isImg ? this.activeElement.getAttribute('src') : (this.activeElement.dataset.audio || '');

    const hasMediaChanged = this.isFieldChanged('media') || this.isFieldChanged('backgroundImage');

    return `
      <div class="admin-section ${hasMediaChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>${isAudioTarget ? 'Audio Track Replacement' : (isImg ? 'Image Asset Replacement' : 'Background Image')}</span>
            <span class="field-change-dot" data-field-indicator="media" style="display: ${hasMediaChanged ? 'inline-block' : 'none'};">●</span>
          </div>
          <button type="button" class="btn-field-reset" data-reset-type="media" data-tooltip="Reset media" style="display: ${hasMediaChanged ? 'inline-flex' : 'none'};">↺</button>
        </div>

        <div class="admin-dropzone" id="media-dropzone">
          <input type="file" id="media-file-input" style="display: none;" accept="${isAudioTarget ? 'audio/*' : 'image/*'}">
          <div class="dropzone-icon">
            ${isAudioTarget ? `
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            ` : `
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            `}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #fff;">
            Drag & Drop ${isAudioTarget ? 'WAV / MP3 file' : 'Image (PNG/JPG/WebP)'}
          </div>
          <div style="font-size: 10px; color: var(--admin-text-secondary);">or click to browse local files</div>
        </div>

        <!-- Current URL / Audio Preview -->
        <div class="admin-field-row" style="margin-top: 12px; margin-bottom: 0;">
          <label class="admin-field-label">Current URL</label>
          <div class="admin-field-control">
            <input type="text" class="admin-input" id="media-url-input" value="${currentSrc || ''}" placeholder="https://...">
          </div>
        </div>

        ${isAudioTarget && currentSrc ? `
          <div style="margin-top: 10px;">
            <audio controls src="${currentSrc}" style="width: 100%; height: 32px; border-radius: 4px;"></audio>
          </div>
        ` : ''}
      </div>
    `;
  }

  _bindMediaTabControls(container) {
    const dropzone = container.querySelector('#media-dropzone');
    const fileInput = container.querySelector('#media-file-input');
    const urlInput = container.querySelector('#media-url-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      });

      ['dragleave', 'drop'].forEach(ev => {
        dropzone.addEventListener(ev, () => dropzone.classList.remove('is-dragover'));
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this._handleMediaUpload(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          this._handleMediaUpload(fileInput.files[0]);
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('change', () => {
        const val = urlInput.value.trim();
        this._applyMediaUrl(val);
      });
    }

    this._bindResetButtons(container);
  }

  async _handleMediaUpload(file) {
    const isImg = this.activeElement.tagName === 'IMG';
    const isAudio = this.activeElement.hasAttribute('data-audio') || this.activeElement.closest('[data-audio]') || file.type.startsWith('audio/');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', isAudio ? 'audio' : 'image');

    try {
      const dropzone = this.container.querySelector('#media-dropzone');
      if (dropzone) {
        dropzone.innerHTML = `<div style="font-size: 11px; color: var(--admin-accent-cyan);">Uploading asset...</div>`;
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload server error');
      const data = await res.json();
      const finalUrl = data.url || URL.createObjectURL(file);

      this._applyMediaUrl(finalUrl);
    } catch {
      // Fallback to local Blob URL
      const localUrl = URL.createObjectURL(file);
      this._applyMediaUrl(localUrl);
    }
  }

  _applyMediaUrl(url) {
    const isImg = this.activeElement.tagName === 'IMG';
    const isAudio = this.activeElement.hasAttribute('data-audio') || this.activeElement.closest('[data-audio]');

    if (isImg) {
      this.activeElement.setAttribute('src', url);
      this._notifyChange({ media: { src: url } });
    } else if (isAudio) {
      this.activeElement.dataset.audio = url;
      this._notifyChange({ dataAttr: { audio: url }, media: { audio: url } });
    } else {
      this.activeElement.style.backgroundImage = `url('${url}')`;
      this._notifyChange({ styleKey: 'backgroundImage', val: `url('${url}')` });
    }

    this._renderActiveTab();
    this.updateTabCounters();
  }

  // ==========================================================================
  // TAB 4: CUSTOM DATA ATTRIBUTES (PROPS)
  // ==========================================================================
  _buildPropsTabHtml() {
    const dataset = { ...this.activeElement.dataset };
    const propKeys = Object.keys(dataset);

    const hasPropsChanged = propKeys.length > 0;

    return `
      <div class="admin-section ${hasPropsChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Custom Data Attributes</span>
            <span class="field-change-dot" data-field-indicator="props" style="display: ${hasPropsChanged ? 'inline-block' : 'none'};">●</span>
          </div>
        </div>

        ${propKeys.length === 0 ? `
          <div style="font-size: 11px; color: var(--admin-text-secondary); text-align: center; padding: 12px 0;">
            No custom data-* attributes attached.
          </div>
        ` : `
          <div class="admin-props-list">
            ${propKeys.map(key => {
              const val = dataset[key];
              const kebab = this._camelToKebab(key);
              const isChanged = this.isFieldChanged(`data-${key}`) || this.isFieldChanged(key);
              return `
                <div class="admin-field-row" style="margin-bottom: 6px;">
                  <div class="admin-field-label-wrap">
                    <label class="admin-field-label" style="font-family: var(--admin-mono); font-size: 10px;">data-${kebab}</label>
                    <span class="field-change-dot" data-field-indicator="data-${key}" style="display: ${isChanged ? 'inline-block' : 'none'};">●</span>
                  </div>
                  <div class="admin-field-control">
                    <input type="text" class="admin-input prop-val-input" data-prop="${key}" value="${val}">
                    <button type="button" class="btn-field-reset" data-reset-type="dataAttr" data-reset-key="${key}" data-tooltip="Reset attribute" style="display: ${isChanged ? 'inline-flex' : 'none'};">↺</button>
                    <button type="button" class="admin-btn admin-btn-ghost btn-remove-prop" data-prop="${key}" data-tooltip="Remove attribute" style="padding: 2px 6px; color: #ef4444;">✕</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <!-- Add New Prop -->
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--admin-border-subtle);">
          <div style="font-size: 10.5px; font-weight: 600; color: #fff; margin-bottom: 8px;">Add New Data Attribute</div>
          <div style="display: flex; gap: 6px;">
            <input type="text" class="admin-input" id="new-prop-name" placeholder="attribute-name" style="flex: 1;">
            <input type="text" class="admin-input" id="new-prop-val" placeholder="value" style="flex: 1;">
            <button type="button" class="admin-btn admin-btn-primary" id="btn-add-prop" style="padding: 0 10px;">Add</button>
          </div>
        </div>
      </div>
    `;
  }

  _bindPropsTabControls(container) {
    // Edit existing props
    container.querySelectorAll('.prop-val-input').forEach(input => {
      input.addEventListener('change', () => {
        const prop = input.dataset.prop;
        const val = input.value.trim();
        this.activeElement.dataset[prop] = val;
        this.activeMeta.dataAttributes[prop] = val;
        this._notifyChange({ dataAttr: { [prop]: val } });
        this.updateTabCounters();
      });
    });

    // Delete attribute
    container.querySelectorAll('.btn-remove-prop').forEach(btn => {
      btn.addEventListener('click', () => {
        const prop = btn.dataset.prop;
        delete this.activeElement.dataset[prop];
        delete this.activeMeta.dataAttributes[prop];
        this._notifyChange({ removeDataAttr: prop });
        this._renderActiveTab();
        this.updateTabCounters();
      });
    });

    // Add new prop
    const addBtn = container.querySelector('#btn-add-prop');
    const nameInput = container.querySelector('#new-prop-name');
    const valInput = container.querySelector('#new-prop-val');

    if (addBtn && nameInput && valInput) {
      addBtn.addEventListener('click', () => {
        let name = nameInput.value.trim().replace(/^data-/, '');
        const val = valInput.value.trim();
        if (!name) return;

        const camel = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this.activeElement.dataset[camel] = val;
        this.activeMeta.dataAttributes[camel] = val;
        this._notifyChange({ dataAttr: { [camel]: val } });
        this._renderActiveTab();
        this.updateTabCounters();
      });
    }

    this._bindResetButtons(container);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  _bindResetButtons(container) {
    container.querySelectorAll('.btn-field-reset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.resetType;
        const key = btn.dataset.resetKey;
        this.resetProperty(type, key);
      });
    });
  }

  _bindSliderPair(container, prefix, onChange) {
    const slider = container.querySelector(`#slider-${prefix}`);
    const num = container.querySelector(`#num-${prefix}`);

    if (!slider || !num) return;

    const updateVal = (val) => {
      slider.value = val;
      num.value = val;
      onChange(Number(val));
    };

    slider.addEventListener('input', () => {
      num.value = slider.value;
      onChange(Number(slider.value));
    });

    num.addEventListener('input', () => {
      slider.value = num.value;
      onChange(Number(num.value));
    });

    // Handle modern sleek stepper up/down arrow buttons
    container.querySelectorAll(`.stepper-btn[data-step-target="num-${prefix}"]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const dir = parseInt(btn.dataset.dir, 10) || 1;
        const step = parseFloat(slider.step) || 1;
        const min = parseFloat(slider.min) !== undefined ? parseFloat(slider.min) : -Infinity;
        const max = parseFloat(slider.max) !== undefined ? parseFloat(slider.max) : Infinity;
        let current = parseFloat(num.value) || 0;

        const multiplier = e.shiftKey ? 5 : 1;
        let next = current + (dir * step * multiplier);
        next = Math.max(min, Math.min(max, next));

        if (step < 1) {
          next = Math.round(next * 100) / 100;
        } else {
          next = Math.round(next);
        }

        updateVal(next);
      });
    });
  }

  _bindColorPair(container, prefix, onChange) {
    const native = container.querySelector(`#native-color-${prefix}`);
    const hex = container.querySelector(`#hex-color-${prefix}`);
    const previewWrap = native ? native.closest('.admin-color-preview-wrap') : null;
    const parentField = previewWrap ? previewWrap.closest('.admin-color-field') : null;

    const parseToHex = (raw) => {
      if (!raw) return null;
      let str = String(raw).trim();
      const rgbMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('').toUpperCase();
      }
      const hexMatch = str.match(/#?([0-9a-fA-F]{3,6})/);
      if (hexMatch) {
        let h = hexMatch[1];
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        if (h.length === 6) return `#${h.toUpperCase()}`;
      }
      return null;
    };

    const copyColorToClipboard = (inputEl, btnEl) => {
      let val = parseToHex(typeof inputEl === 'string' ? inputEl : inputEl ? inputEl.value : '');
      if (!val) val = '#00F0FF';

      window.__adminColorClipboard = val;

      if (inputEl && inputEl.focus) {
        try {
          inputEl.focus();
          inputEl.select();
        } catch (_) {}
      }

      const showCopiedUI = () => {
        if (btnEl) {
          btnEl.classList.add('copied');
          const origText = btnEl.innerHTML;
          btnEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
          setTimeout(() => {
            btnEl.classList.remove('copied');
            btnEl.innerHTML = origText;
          }, 1200);
        }
      };

      try {
        document.execCommand('copy');
      } catch (_) {}

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(showCopiedUI).catch(() => {
          showCopiedUI();
        });
      } else {
        showCopiedUI();
      }
    };

    const pasteColorFromClipboard = (inputEl, btnEl, onPasted) => {
      const applyVal = (rawText) => {
        const cleaned = parseToHex(rawText);
        if (cleaned) {
          if (inputEl) inputEl.value = cleaned;
          window.__adminColorClipboard = cleaned;
          onPasted(cleaned);
          return true;
        }
        return false;
      };

      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText()
          .then(text => {
            if (!applyVal(text)) {
              if (!applyVal(window.__adminColorClipboard)) {
                const current = inputEl ? inputEl.value : '#00F0FF';
                const val = prompt('Paste HEX color code:', current);
                if (val) applyVal(val);
              }
            }
          })
          .catch(() => {
            if (!applyVal(window.__adminColorClipboard)) {
              const current = inputEl ? inputEl.value : '#00F0FF';
              const val = prompt('Paste HEX color code:', current);
              if (val) applyVal(val);
            }
          });
      } else {
        if (!applyVal(window.__adminColorClipboard)) {
          const current = inputEl ? inputEl.value : '#00F0FF';
          const val = prompt('Paste HEX color code:', current);
          if (val) applyVal(val);
        }
      }
    };

    const attachPasteListener = (inputElement, onParsed) => {
      if (!inputElement) return;
      inputElement.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const cleaned = parseToHex(text);
        if (cleaned) {
          inputElement.value = cleaned;
          onParsed(cleaned);
        }
      });
    };

    const hexToHsv = (hexStr) => {
      let c = (hexStr || '').replace('#', '').trim();
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      if (c.length !== 6) return [0, 1, 1];
      const r = parseInt(c.substring(0, 2), 16) / 255;
      const g = parseInt(c.substring(2, 4), 16) / 255;
      const b = parseInt(c.substring(4, 6), 16) / 255;

      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      const s = max === 0 ? 0 : d / max;
      const v = max;

      if (max !== min) {
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [Math.round(h * 360), s, v];
    };

    const hsvToRgb = (h, s, v) => {
      let r, g, b;
      const i = Math.floor(h / 60) % 6;
      const f = h / 60 - Math.floor(h / 60);
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);
      switch (i) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const rgbToHex = (r, g, b) => {
      return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('').toUpperCase();
    };

    if (native && hex) {
      // Attach paste listener to main hex input
      attachPasteListener(hex, (cleaned) => {
        hex.value = cleaned;
        native.value = cleaned;
        if (previewWrap) previewWrap.style.backgroundColor = cleaned;
        onChange(cleaned);
      });

      if (previewWrap && parentField) {
        // Inject Copy & Paste buttons next to the color field if missing
        if (!parentField.querySelector('.admin-color-copy-btn')) {
          const copyBtn = document.createElement('button');
          copyBtn.type = 'button';
          copyBtn.className = 'admin-color-btn admin-color-copy-btn';
          copyBtn.title = 'Copy HEX';
          copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
          parentField.appendChild(copyBtn);

          copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyColorToClipboard(hex, copyBtn);
          });
        }

        if (!parentField.querySelector('.admin-color-paste-btn')) {
          const pasteBtn = document.createElement('button');
          pasteBtn.type = 'button';
          pasteBtn.className = 'admin-color-btn admin-color-paste-btn';
          pasteBtn.title = 'Paste HEX';
          pasteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`;
          parentField.appendChild(pasteBtn);

          pasteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pasteColorFromClipboard(hex, pasteBtn, (pastedVal) => {
              hex.value = pastedVal;
              native.value = pastedVal;
              if (previewWrap) previewWrap.style.backgroundColor = pastedVal;
              onChange(pastedVal);
            });
          });
        }

        previewWrap.addEventListener('click', (e) => {
          e.stopPropagation();

          // Close active panels
          container.querySelectorAll('.admin-hex-picker-panel').forEach(p => p.remove());

          let currentHex = parseToHex(hex.value) || '#00F0FF';
          let [h, s, v] = hexToHsv(currentHex);

          const panel = document.createElement('div');
          panel.className = 'admin-hex-picker-panel';

          panel.innerHTML = `
            <div class="admin-sat-val-box">
              <div class="admin-sat-val-white"></div>
              <div class="admin-sat-val-black"></div>
              <div class="admin-sat-val-handle"></div>
            </div>
            <div class="admin-hue-slider-wrap">
              <div class="admin-hue-handle"></div>
            </div>
            <div class="admin-picker-footer">
              <div class="admin-picker-preview" style="background-color: ${currentHex};"></div>
              <input type="text" class="admin-picker-hex-input" value="${currentHex}" maxlength="7" spellcheck="false" placeholder="#00F0FF">
              <button type="button" class="admin-color-btn admin-picker-copy-btn" title="Copy HEX">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
              <button type="button" class="admin-color-btn admin-picker-paste-btn" title="Paste HEX">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              </button>
            </div>
          `;

          parentField.appendChild(panel);

          // Smart Viewport Calculation (relative to container & screen)
          const scrollParent = parentField.closest('.admin-side-panel-body, .admin-tab-content, .admin-side-panel') || document.body;
          const fieldRect = parentField.getBoundingClientRect();
          const scrollRect = scrollParent.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const panelHeight = 185;

          const containerBottom = Math.min(viewportHeight, scrollRect.bottom);
          const containerTop = Math.max(0, scrollRect.top);

          const spaceBelow = containerBottom - fieldRect.bottom;
          const spaceAbove = fieldRect.top - containerTop;

          if (spaceBelow < panelHeight + 10 && spaceAbove > spaceBelow) {
            panel.classList.add('position-above');
          } else {
            panel.classList.add('position-below');
          }

          setTimeout(() => {
            if (panel.scrollIntoView) {
              panel.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            }
          }, 20);

          const satValBox = panel.querySelector('.admin-sat-val-box');
          const satValHandle = panel.querySelector('.admin-sat-val-handle');
          const hueSlider = panel.querySelector('.admin-hue-slider-wrap');
          const hueHandle = panel.querySelector('.admin-hue-handle');
          const pickerPreview = panel.querySelector('.admin-picker-preview');
          const pickerInput = panel.querySelector('.admin-picker-hex-input');
          const panelCopyBtn = panel.querySelector('.admin-picker-copy-btn');
          const panelPasteBtn = panel.querySelector('.admin-picker-paste-btn');

          const updateUI = (notify = true) => {
            const pureHue = hsvToRgb(h, 1, 1);
            satValBox.style.backgroundColor = `rgb(${pureHue[0]}, ${pureHue[1]}, ${pureHue[2]})`;

            satValHandle.style.left = `${Math.max(0, Math.min(100, s * 100))}%`;
            satValHandle.style.top = `${Math.max(0, Math.min(100, (1 - v) * 100))}%`;

            hueHandle.style.left = `${Math.max(0, Math.min(100, (h / 360) * 100))}%`;

            const [r, g, b] = hsvToRgb(h, s, v);
            const hexVal = rgbToHex(r, g, b);

            pickerPreview.style.backgroundColor = hexVal;
            previewWrap.style.backgroundColor = hexVal;
            pickerInput.value = hexVal;
            hex.value = hexVal;
            native.value = hexVal;

            if (notify) onChange(hexVal);
          };

          updateUI(false);

          // Attach paste listener to panel hex input
          attachPasteListener(pickerInput, (cleaned) => {
            [h, s, v] = hexToHsv(cleaned);
            updateUI(true);
          });

          // Panel Copy & Paste Handlers
          if (panelCopyBtn) {
            panelCopyBtn.addEventListener('click', (ce) => {
              ce.stopPropagation();
              copyColorToClipboard(pickerInput, panelCopyBtn);
            });
          }

          if (panelPasteBtn) {
            panelPasteBtn.addEventListener('click', (pe) => {
              pe.stopPropagation();
              pasteColorFromClipboard(pickerInput, panelPasteBtn, (pastedVal) => {
                [h, s, v] = hexToHsv(pastedVal);
                updateUI(true);
              });
            });
          }

          // Saturation / Value Canvas Drag (Pointer Events with setPointerCapture)
          let isDraggingSatVal = false;
          const handleSatVal = (evt) => {
            const rect = satValBox.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, evt.clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, evt.clientY - rect.top));
            s = x / rect.width;
            v = 1 - (y / rect.height);
            updateUI(true);
          };

          const satValPointerDown = (evt) => {
            if (evt.button !== 0 && evt.buttons !== 1) return;
            isDraggingSatVal = true;
            try { satValBox.setPointerCapture(evt.pointerId); } catch (_) {}
            handleSatVal(evt);
          };

          const satValPointerMove = (evt) => {
            if (isDraggingSatVal) {
              handleSatVal(evt);
            }
          };

          const satValPointerUp = (evt) => {
            isDraggingSatVal = false;
            try { satValBox.releasePointerCapture(evt.pointerId); } catch (_) {}
          };

          satValBox.addEventListener('pointerdown', satValPointerDown);
          satValBox.addEventListener('pointermove', satValPointerMove);
          satValBox.addEventListener('pointerup', satValPointerUp);
          satValBox.addEventListener('pointercancel', satValPointerUp);

          // Hue Slider Drag (Pointer Events with setPointerCapture)
          let isDraggingHue = false;
          const handleHue = (evt) => {
            const rect = hueSlider.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, evt.clientX - rect.left));
            h = Math.round((x / rect.width) * 360) % 360;
            updateUI(true);
          };

          const huePointerDown = (evt) => {
            if (evt.button !== 0 && evt.buttons !== 1) return;
            isDraggingHue = true;
            try { hueSlider.setPointerCapture(evt.pointerId); } catch (_) {}
            handleHue(evt);
          };

          const huePointerMove = (evt) => {
            if (isDraggingHue) {
              handleHue(evt);
            }
          };

          const huePointerUp = (evt) => {
            isDraggingHue = false;
            try { hueSlider.releasePointerCapture(evt.pointerId); } catch (_) {}
          };

          hueSlider.addEventListener('pointerdown', huePointerDown);
          hueSlider.addEventListener('pointermove', huePointerMove);
          hueSlider.addEventListener('pointerup', huePointerUp);
          hueSlider.addEventListener('pointercancel', huePointerUp);

          // Direct HEX Input inside Panel
          pickerInput.addEventListener('input', () => {
            const cleaned = parseToHex(pickerInput.value);
            if (cleaned) {
              [h, s, v] = hexToHsv(cleaned);
              updateUI(true);
            }
          });

          const closeHandler = (evt) => {
            if (!panel.contains(evt.target) && evt.target !== previewWrap) {
              panel.remove();
              document.removeEventListener('click', closeHandler);
            }
          };
          setTimeout(() => document.addEventListener('click', closeHandler), 10);
        });
      }

      native.addEventListener('input', () => {
        const hexVal = native.value.toUpperCase();
        hex.value = hexVal;
        if (previewWrap) previewWrap.style.backgroundColor = hexVal;
        onChange(hexVal);
      });

      hex.addEventListener('input', () => {
        let val = hex.value.trim();
        if (!val.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(val)) {
          val = `#${val}`;
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          const upper = val.toUpperCase();
          native.value = upper;
          if (previewWrap) previewWrap.style.backgroundColor = upper;
          onChange(upper);
        } else if (/^#[0-9A-Fa-f]{3}$/.test(val)) {
          const expanded = `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}`.toUpperCase();
          native.value = expanded;
          if (previewWrap) previewWrap.style.backgroundColor = expanded;
          onChange(expanded);
        }
      });

      hex.addEventListener('blur', () => {
        let val = hex.value.trim();
        if (!val.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(val)) {
          val = `#${val}`;
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          hex.value = val.toUpperCase();
        } else if (/^#[0-9A-Fa-f]{3}$/.test(val)) {
          hex.value = `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}`.toUpperCase();
        } else {
          hex.value = native.value.toUpperCase();
        }
      });
    }
  }

  _notifyChange(detail = {}) {
    if (!detail.reset) {
      this._captureBaselineIfNeeded();
    }
    if (typeof this.onElementChange === 'function' && this.activeElement && this.activeMeta) {
      this.onElementChange(this.activeElement, this.activeMeta, detail, this.currentBreakpoint);
    }
    this._syncFieldIndicators();
  }

  _rgbToHex(colorStr) {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
      return '#000000';
    }
    const str = String(colorStr).trim();
    if (str.startsWith('#')) {
      if (str.length === 4) {
        return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`.toUpperCase();
      }
      return str.toUpperCase();
    }
    const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
      const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
      const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = str;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      const toHex = (c) => c.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    } catch {
      return '#FFFFFF';
    }
  }

  _hexToRgb(hex) {
    let clean = hex.replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16) || 0;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  _camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
}
