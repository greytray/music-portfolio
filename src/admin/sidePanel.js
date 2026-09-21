/**
 * Side Panel Inspector for Eko In-Context Visual Editor
 * Provides rich visual controls: Typography (Font, Size, Weight, Line Spacing, Letter Spacing, Appearance/Case),
 * Non-code Visual Shadow & Glow Studio (Text Shadow vs Box Shadow),
 * Margin & Padding Sliders (0-120px), Modern Sleek Stepper Arrows,
 * Accurate Per-Element Change Tracking & Reset System,
 * Media Drop Zones (audio & images routed through media proxy),
 * and dynamic data attributes.
 */

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
          <span>TEXT</span>
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

      <!-- Footer Quick Actions (Reset Changes only shows when changes exist) -->
      <div class="admin-sidepanel-footer" id="admin-panel-footer" style="display: none;">
        <button type="button" class="admin-btn admin-btn-danger" id="btn-reset-element" data-tooltip="Reset all changes made to this element" style="display: none;">Reset Changes</button>
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
      this.elementBaselines.set(selector, {
        style: this.activeElement.getAttribute('style') || '',
        text: isTextOnly ? this.activeElement.textContent : this.activeElement.innerHTML,
        isTextOnly,
        dataset: { ...this.activeElement.dataset }
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
    const resetBtn = this.container.querySelector('#btn-reset-element');
    if (resetBtn) {
      const hasChanges = this.hasActiveElementChanges();
      resetBtn.style.display = hasChanges ? 'inline-flex' : 'none';
    }
  }

  /**
   * Reset all changes made to the active element
   */
  _handleResetElement() {
    if (!this.activeElement || !this.activeMeta) return;
    const selector = this.activeMeta.selector;
    const baseline = this.elementBaselines.get(selector);

    if (baseline) {
      // Restore style attribute
      if (baseline.style) {
        this.activeElement.setAttribute('style', baseline.style);
      } else {
        this.activeElement.removeAttribute('style');
      }

      // Restore exact text or innerHTML
      if (baseline.isTextOnly) {
        this.activeElement.textContent = baseline.text;
      } else {
        this.activeElement.innerHTML = baseline.text;
      }

      // Restore data attributes
      Object.keys(this.activeElement.dataset).forEach(k => delete this.activeElement.dataset[k]);
      Object.entries(baseline.dataset).forEach(([k, v]) => {
        this.activeElement.dataset[k] = v;
      });

      this.elementBaselines.delete(selector);
    } else {
      this.activeElement.removeAttribute('style');
    }

    if (this.exportSystem && selector) {
      this.exportSystem.resetElement(selector);
    }

    // Refresh active computed styles so sidebar UI immediately syncs to restored values
    this._refreshActiveMetaStyles();
    this._parseExistingShadow();

    this._notifyChange({ reset: true });
    this._renderActiveTab();
    this.updateTabCounters();
    this._updateResetButtonVisibility();
  }

  /**
   * Refresh the activeMeta.styles snapshot directly from the element's computed styles
   */
  _refreshActiveMetaStyles() {
    if (!this.activeElement || !this.activeMeta) return;
    const win = this.activeElement.ownerDocument ? this.activeElement.ownerDocument.defaultView : window;
    const computed = win ? win.getComputedStyle(this.activeElement) : null;
    if (computed) {
      const toNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : Math.round(n);
      };

      this.activeMeta.styles = {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        borderWidth: toNum(computed.borderWidth),
        borderRadius: toNum(computed.borderRadius),
        fontFamily: computed.fontFamily,
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

    // Parse existing shadow without mutating element
    this._parseExistingShadow();

    const titleEl = this.container.querySelector('#admin-panel-title');
    const footerEl = this.container.querySelector('#admin-panel-footer');

    if (titleEl) {
      titleEl.innerHTML = `
        <strong>${metadata.tagName.toLowerCase()}${metadata.id ? `#${metadata.id}` : ''}</strong>
        <span>${metadata.selector}</span>
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
    const effectiveStyles = { ...universalStyles, ...bpStyles };

    return {
      styles: effectiveStyles,
      dataAttributes: data.dataAttributes || {},
      hasText: data.text !== undefined,
      hasMedia: data.media !== undefined
    };
  }

  /**
   * Check if a specific style or setting has been changed on the element
   */
  isFieldChanged(fieldKey) {
    if (!this.activeElement) return false;
    const overrides = this.getElementOverrides();
    if (fieldKey === 'text') return overrides.hasText;
    if (fieldKey === 'media') return overrides.hasMedia;
    if (fieldKey.startsWith('data-')) {
      const propName = fieldKey.replace(/^data-/, '');
      return overrides.dataAttributes[propName] !== undefined;
    }
    return overrides.styles[fieldKey] !== undefined;
  }

  /**
   * Calculate change counts per tab and update the tab bar badges
   */
  updateTabCounters() {
    const textBadge = this.container.querySelector('#badge-tab-text');
    const spacingBadge = this.container.querySelector('#badge-tab-spacing');
    const mediaBadge = this.container.querySelector('#badge-tab-media');
    const propsBadge = this.container.querySelector('#badge-tab-props');

    if (!this.activeElement || !this.activeMeta) {
      if (textBadge) textBadge.style.display = 'none';
      if (spacingBadge) spacingBadge.style.display = 'none';
      if (mediaBadge) mediaBadge.style.display = 'none';
      if (propsBadge) propsBadge.style.display = 'none';
      return;
    }

    const overrides = this.getElementOverrides();
    const styleKeys = Object.keys(overrides.styles);

    // Text tab keys
    const textStyleList = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'fontStyle', 'textTransform', 'fontVariant', 'textShadow', 'boxShadow', 'color', 'backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'opacity'];
    let textCount = styleKeys.filter(k => textStyleList.includes(k)).length;
    if (overrides.hasText) textCount += 1;

    // Spacing tab keys
    const spacingStyleList = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap'];
    const spacingCount = styleKeys.filter(k => spacingStyleList.includes(k)).length;

    // Media tab
    const mediaCount = overrides.hasMedia ? 1 : (styleKeys.includes('backgroundImage') ? 1 : 0);

    // Props tab
    const propsCount = Object.keys(overrides.dataAttributes).length;

    this._updateBadge(textBadge, textCount);
    this._updateBadge(spacingBadge, spacingCount);
    this._updateBadge(mediaBadge, mediaCount);
    this._updateBadge(propsBadge, propsCount);
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

    // Refresh styles snapshot and shadow parsing from live DOM
    this._refreshActiveMetaStyles();
    this._parseExistingShadow();

    this._notifyChange({ resetProperty: key });
    this._renderActiveTab();
    this.updateTabCounters();
    this._updateResetButtonVisibility();
  }

  // ==========================================================================
  // TAB 1: TEXT & TYPOGRAPHY EDITOR
  // ==========================================================================
  _buildTextTabHtml() {
    const s = this.activeMeta.styles;
    const computed = window.getComputedStyle ? window.getComputedStyle(this.activeElement) : s;
    const textVal = this.activeElement.children.length === 0 ? this.activeElement.textContent : (this.activeElement.innerText || this.activeElement.textContent);

    const textColorHex = this._rgbToHex(this.activeElement.style.color || s.color || computed.color);
    const bgColorHex = this._rgbToHex(this.activeElement.style.backgroundColor || s.backgroundColor || computed.backgroundColor);
    const borderColorHex = this._rgbToHex(this.activeElement.style.borderColor || s.borderColor || computed.borderColor);

    const isBold = (this.activeElement.style.fontWeight || s.fontWeight || computed.fontWeight) >= 700;
    const isItalic = (this.activeElement.style.fontStyle || s.fontStyle || computed.fontStyle) === 'italic';
    const textTransform = this.activeElement.style.textTransform || s.textTransform || computed.textTransform || 'none';
    const fontVariant = this.activeElement.style.fontVariant || s.fontVariant || computed.fontVariant || 'normal';

    // Parse Line Height
    let currentLineHeight = parseFloat(this.activeElement.style.lineHeight || s.lineHeight || computed.lineHeight) || 1.5;
    if (currentLineHeight > 10) {
      const fs = parseFloat(s.fontSize || computed.fontSize) || 16;
      currentLineHeight = Math.round((currentLineHeight / fs) * 100) / 100;
    }

    // Parse Letter Spacing
    let currentLetterSpacing = parseFloat(this.activeElement.style.letterSpacing || s.letterSpacing || computed.letterSpacing) || 0;

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
            ${hasTextChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          ${hasTextChanged ? `<button type="button" class="btn-field-reset" data-reset-type="text" data-tooltip="Reset text content">↺</button>` : ''}
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
            ${hasFontFamilyChanged ? '<span class="field-change-dot">●</span>' : ''}
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
            ${hasFontFamilyChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="fontFamily" data-tooltip="Reset font family">↺</button>` : ''}
          </div>
        </div>

        <!-- Font Size Slider -->
        <div class="admin-field-row ${hasFontSizeChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Font Size</label>
            ${hasFontSizeChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('font-size', 10, 140, 1, parseFloat(s.fontSize) || 16, 'px')}
            ${hasFontSizeChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="fontSize" data-tooltip="Reset font size">↺</button>` : ''}
          </div>
        </div>

        <!-- Font Weight -->
        <div class="admin-field-row ${hasFontWeightChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label" for="ctrl-font-weight">Font Weight</label>
            ${hasFontWeightChanged ? '<span class="field-change-dot">●</span>' : ''}
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
            ${hasFontWeightChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="fontWeight" data-tooltip="Reset font weight">↺</button>` : ''}
          </div>
        </div>

        <!-- Line Spacing (Line Height) -->
        <div class="admin-field-row ${hasLineHeightChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Line Spacing</label>
            ${hasLineHeightChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('line-height', 0.8, 3.5, 0.05, currentLineHeight, 'em')}
            ${hasLineHeightChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="lineHeight" data-tooltip="Reset line spacing">↺</button>` : ''}
          </div>
        </div>

        <!-- Letter Spacing -->
        <div class="admin-field-row ${hasLetterSpacingChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Letter Spacing</label>
            ${hasLetterSpacingChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('letter-spacing', -3, 24, 0.5, currentLetterSpacing, 'px')}
            ${hasLetterSpacingChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="letterSpacing" data-tooltip="Reset letter spacing">↺</button>` : ''}
          </div>
        </div>

        <!-- Appearance: Normal, Upper, Lower, Title, Small Caps -->
        <div class="admin-field-row ${hasAppearanceChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Appearance</label>
            ${hasAppearanceChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            <div class="admin-appearance-group">
              <button type="button" class="admin-case-btn ${textTransform === 'none' && fontVariant === 'normal' ? 'is-active' : ''}" data-case="normal" data-tooltip="Normal Case">Aa</button>
              <button type="button" class="admin-case-btn ${textTransform === 'uppercase' ? 'is-active' : ''}" data-case="uppercase" data-tooltip="UPPERCASE">AA</button>
              <button type="button" class="admin-case-btn ${textTransform === 'lowercase' ? 'is-active' : ''}" data-case="lowercase" data-tooltip="lowercase">aa</button>
              <button type="button" class="admin-case-btn ${textTransform === 'capitalize' ? 'is-active' : ''}" data-case="capitalize" data-tooltip="Title Case">Abc</button>
              <button type="button" class="admin-case-btn ${fontVariant === 'small-caps' ? 'is-active' : ''}" data-case="small-caps" data-tooltip="Small Caps">A<span style="font-size: 8px;">A</span></button>
            </div>
            ${hasAppearanceChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="textTransform" data-tooltip="Reset appearance">↺</button>` : ''}
          </div>
        </div>

        <!-- Alignment & Formatting -->
        <div class="admin-field-row ${hasTextAlignChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Alignment</label>
            ${hasTextAlignChanged ? '<span class="field-change-dot">●</span>' : ''}
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
            ${hasTextAlignChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="textAlign" data-tooltip="Reset alignment">↺</button>` : ''}
          </div>
        </div>
      </div>

      <!-- Non-Code Visual Shadow & Glow Studio (Text Shadow vs Box Shadow) -->
      <div class="admin-section ${hasShadowChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Shadow & Glow Studio</span>
            ${hasShadowChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          ${hasShadowChanged ? `<button type="button" class="btn-field-reset" data-reset-type="shadow" data-tooltip="Reset shadow & glow">↺</button>` : ''}
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
            ${hasColorChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            <div class="admin-color-field">
              <div class="admin-color-preview-wrap" style="background-color: ${textColorHex};">
                <input type="color" class="admin-color-native" id="native-color-text" value="${textColorHex}">
              </div>
              <input type="text" class="admin-input admin-color-hex-input" id="hex-color-text" value="${textColorHex}">
            </div>
            ${hasColorChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="color" data-tooltip="Reset font color">↺</button>` : ''}
          </div>
        </div>

        <!-- Background Color -->
        <div class="admin-field-row ${hasBgChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Background</label>
            ${hasBgChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            <div class="admin-color-field">
              <div class="admin-color-preview-wrap" style="background-color: ${bgColorHex};">
                <input type="color" class="admin-color-native" id="native-color-bg" value="${bgColorHex}">
              </div>
              <input type="text" class="admin-input admin-color-hex-input" id="hex-color-bg" value="${bgColorHex}">
            </div>
            ${hasBgChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="backgroundColor" data-tooltip="Reset background">↺</button>` : ''}
          </div>
        </div>

        <!-- Border Color -->
        <div class="admin-field-row ${hasBorderChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Border Color</label>
            ${hasBorderChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            <div class="admin-color-field">
              <div class="admin-color-preview-wrap" style="background-color: ${borderColorHex};">
                <input type="color" class="admin-color-native" id="native-color-border" value="${borderColorHex}">
              </div>
              <input type="text" class="admin-input admin-color-hex-input" id="hex-color-border" value="${borderColorHex}">
            </div>
            ${hasBorderChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="borderColor" data-tooltip="Reset border">↺</button>` : ''}
          </div>
        </div>

        <!-- Border Width -->
        <div class="admin-field-row ${this.isFieldChanged('borderWidth') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Border Width</label>
            ${this.isFieldChanged('borderWidth') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('border-width', 0, 20, 1, parseFloat(s.borderWidth) || 0, 'px')}
            ${this.isFieldChanged('borderWidth') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="borderWidth" data-tooltip="Reset border width">↺</button>` : ''}
          </div>
        </div>

        <!-- Border Radius -->
        <div class="admin-field-row ${this.isFieldChanged('borderRadius') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Border Radius</label>
            ${this.isFieldChanged('borderRadius') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('border-radius', 0, 48, 1, parseFloat(s.borderRadius) || 0, 'px')}
            ${this.isFieldChanged('borderRadius') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="borderRadius" data-tooltip="Reset border radius">↺</button>` : ''}
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
        if (this.activeElement.children.length === 0) {
          this.activeElement.textContent = textInput.value;
        } else {
          this.activeElement.innerText = textInput.value;
        }
        this._notifyChange({ text: textInput.value });
        this.updateTabCounters();
      });
    }

    // 2. Font Family
    const fontSelect = container.querySelector('#ctrl-font-family');
    if (fontSelect) {
      const currentFamily = this.activeElement.style.fontFamily || this.activeMeta.styles.fontFamily || '';
      for (const opt of fontSelect.options) {
        if (currentFamily.toLowerCase().includes(opt.value.toLowerCase().replace(/['"]/g, '').split(',')[0])) {
          fontSelect.value = opt.value;
          break;
        }
      }
      fontSelect.addEventListener('change', () => {
        this.activeElement.style.fontFamily = fontSelect.value;
        this._notifyChange({ styleKey: 'fontFamily', val: fontSelect.value });
        this.updateTabCounters();
      });
    }

    // 3. Font Size Slider & Stepper
    this._bindSliderPair(container, 'font-size', (val) => {
      this.activeElement.style.fontSize = `${val}px`;
      this._notifyChange({ styleKey: 'fontSize', val: `${val}px` });
      this.updateTabCounters();
    });

    // 4. Font Weight
    const weightSelect = container.querySelector('#ctrl-font-weight');
    if (weightSelect) {
      const curWeight = this.activeElement.style.fontWeight || this.activeMeta.styles.fontWeight || '400';
      weightSelect.value = curWeight;
      weightSelect.addEventListener('change', () => {
        this.activeElement.style.fontWeight = weightSelect.value;
        this._notifyChange({ styleKey: 'fontWeight', val: weightSelect.value });
        this.updateTabCounters();
      });
    }

    // 5. Line Spacing (Line Height)
    this._bindSliderPair(container, 'line-height', (val) => {
      this.activeElement.style.lineHeight = `${val}`;
      this._notifyChange({ styleKey: 'lineHeight', val: `${val}` });
      this.updateTabCounters();
    });

    // 6. Letter Spacing
    this._bindSliderPair(container, 'letter-spacing', (val) => {
      this.activeElement.style.letterSpacing = `${val}px`;
      this._notifyChange({ styleKey: 'letterSpacing', val: `${val}px` });
      this.updateTabCounters();
    });

    // 7. Appearance: Case Switching
    container.querySelectorAll('.admin-case-btn[data-case]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.admin-case-btn[data-case]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const caseVal = btn.dataset.case;
        if (caseVal === 'small-caps') {
          this.activeElement.style.fontVariant = 'small-caps';
          this.activeElement.style.textTransform = 'none';
          this._notifyChange({ styleKey: 'fontVariant', val: 'small-caps' });
          this._notifyChange({ styleKey: 'textTransform', val: 'none' });
        } else {
          this.activeElement.style.fontVariant = 'normal';
          this.activeElement.style.textTransform = caseVal === 'normal' ? 'none' : caseVal;
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
        this.activeElement.style.textAlign = align;
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
        this.activeElement.style.fontWeight = val;
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
        this.activeElement.style.fontStyle = val;
        this._notifyChange({ styleKey: 'fontStyle', val });
        this.updateTabCounters();
      });
    }

    // 10. Non-code Shadow & Glow Studio controls
    this._bindShadowStudioControls(container);

    // 11. Colors
    this._bindColorPair(container, 'text', (val) => {
      this.activeElement.style.color = val;
      this._notifyChange({ styleKey: 'color', val });
      this.updateTabCounters();
    });

    this._bindColorPair(container, 'bg', (val) => {
      this.activeElement.style.backgroundColor = val;
      this._notifyChange({ styleKey: 'backgroundColor', val });
      this.updateTabCounters();
    });

    this._bindColorPair(container, 'border', (val) => {
      this.activeElement.style.borderColor = val;
      if (!this.activeElement.style.borderStyle) {
        this.activeElement.style.borderStyle = 'solid';
      }
      this._notifyChange({ styleKey: 'borderColor', val });
      this.updateTabCounters();
    });

    // 12. Border width & radius
    this._bindSliderPair(container, 'border-width', (val) => {
      this.activeElement.style.borderWidth = `${val}px`;
      if (!this.activeElement.style.borderStyle && val > 0) {
        this.activeElement.style.borderStyle = 'solid';
      }
      this._notifyChange({ styleKey: 'borderWidth', val: `${val}px` });
      this.updateTabCounters();
    });

    this._bindSliderPair(container, 'border-radius', (val) => {
      this.activeElement.style.borderRadius = `${val}px`;
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
        this.activeElement.style.textShadow = textShadowCss;
        this._notifyChange({ styleKey: 'textShadow', val: textShadowCss });
      } else {
        const boxCss = opacity > 0 ? `${x}px ${y}px ${blur}px ${spread}px ${rgbaColor}` : 'none';
        this.activeElement.style.boxShadow = boxCss;
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
    const s = this.activeMeta.styles;
    const computed = window.getComputedStyle ? window.getComputedStyle(this.activeElement) : s;

    const mt = parseFloat(this.activeElement.style.marginTop || s.marginTop || computed.marginTop) || 0;
    const mb = parseFloat(this.activeElement.style.marginBottom || s.marginBottom || computed.marginBottom) || 0;
    const ml = parseFloat(this.activeElement.style.marginLeft || s.marginLeft || computed.marginLeft) || 0;
    const mr = parseFloat(this.activeElement.style.marginRight || s.marginRight || computed.marginRight) || 0;

    const pt = parseFloat(this.activeElement.style.paddingTop || s.paddingTop || computed.paddingTop) || 0;
    const pb = parseFloat(this.activeElement.style.paddingBottom || s.paddingBottom || computed.paddingBottom) || 0;
    const pl = parseFloat(this.activeElement.style.paddingLeft || s.paddingLeft || computed.paddingLeft) || 0;
    const pr = parseFloat(this.activeElement.style.paddingRight || s.paddingRight || computed.paddingRight) || 0;

    const gap = parseFloat(this.activeElement.style.gap || s.gap || computed.gap) || 0;

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
            ${hasMarginChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" class="admin-btn admin-btn-ghost" id="btn-toggle-link-margin" style="padding: 2px 6px; font-size: 10px;">
              ${this.linkMargins ? '🔗 Linked' : '🔓 Unlinked'}
            </button>
            ${hasMarginChanged ? `<button type="button" class="btn-field-reset" data-reset-type="allMargins" data-tooltip="Reset all margins">↺</button>` : ''}
          </div>
        </div>

        <!-- Margin Top -->
        <div class="admin-field-row ${this.isFieldChanged('marginTop') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Margin Top</label>
            ${this.isFieldChanged('marginTop') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('margin-top', 0, 120, 1, mt, 'px')}
            ${this.isFieldChanged('marginTop') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="marginTop" data-tooltip="Reset margin top">↺</button>` : ''}
          </div>
        </div>

        <!-- Margin Bottom -->
        <div class="admin-field-row ${this.isFieldChanged('marginBottom') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Margin Bottom</label>
            ${this.isFieldChanged('marginBottom') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('margin-bottom', 0, 120, 1, mb, 'px')}
            ${this.isFieldChanged('marginBottom') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="marginBottom" data-tooltip="Reset margin bottom">↺</button>` : ''}
          </div>
        </div>

        <!-- Margin Left -->
        <div class="admin-field-row ${this.isFieldChanged('marginLeft') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Margin Left</label>
            ${this.isFieldChanged('marginLeft') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('margin-left', 0, 120, 1, ml, 'px')}
            ${this.isFieldChanged('marginLeft') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="marginLeft" data-tooltip="Reset margin left">↺</button>` : ''}
          </div>
        </div>

        <!-- Margin Right -->
        <div class="admin-field-row ${this.isFieldChanged('marginRight') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Margin Right</label>
            ${this.isFieldChanged('marginRight') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('margin-right', 0, 120, 1, mr, 'px')}
            ${this.isFieldChanged('marginRight') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="marginRight" data-tooltip="Reset margin right">↺</button>` : ''}
          </div>
        </div>
      </div>

      <!-- Element Paddings (0px to 120px) -->
      <div class="admin-section ${hasPaddingChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Paddings (0px – 120px)</span>
            ${hasPaddingChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" class="admin-btn admin-btn-ghost" id="btn-toggle-link-padding" style="padding: 2px 6px; font-size: 10px;">
              ${this.linkPaddings ? '🔗 Linked' : '🔓 Unlinked'}
            </button>
            ${hasPaddingChanged ? `<button type="button" class="btn-field-reset" data-reset-type="allPaddings" data-tooltip="Reset all paddings">↺</button>` : ''}
          </div>
        </div>

        <!-- Padding Top -->
        <div class="admin-field-row ${this.isFieldChanged('paddingTop') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Padding Top</label>
            ${this.isFieldChanged('paddingTop') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('padding-top', 0, 120, 1, pt, 'px')}
            ${this.isFieldChanged('paddingTop') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="paddingTop" data-tooltip="Reset padding top">↺</button>` : ''}
          </div>
        </div>

        <!-- Padding Bottom -->
        <div class="admin-field-row ${this.isFieldChanged('paddingBottom') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Padding Bottom</label>
            ${this.isFieldChanged('paddingBottom') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('padding-bottom', 0, 120, 1, pb, 'px')}
            ${this.isFieldChanged('paddingBottom') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="paddingBottom" data-tooltip="Reset padding bottom">↺</button>` : ''}
          </div>
        </div>

        <!-- Padding Left -->
        <div class="admin-field-row ${this.isFieldChanged('paddingLeft') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Padding Left</label>
            ${this.isFieldChanged('paddingLeft') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('padding-left', 0, 120, 1, pl, 'px')}
            ${this.isFieldChanged('paddingLeft') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="paddingLeft" data-tooltip="Reset padding left">↺</button>` : ''}
          </div>
        </div>

        <!-- Padding Right -->
        <div class="admin-field-row ${this.isFieldChanged('paddingRight') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Padding Right</label>
            ${this.isFieldChanged('paddingRight') ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('padding-right', 0, 120, 1, pr, 'px')}
            ${this.isFieldChanged('paddingRight') ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="paddingRight" data-tooltip="Reset padding right">↺</button>` : ''}
          </div>
        </div>
      </div>

      <!-- Gap (Flex/Grid) -->
      <div class="admin-section ${hasGapChanged ? 'is-modified' : ''}">
        <div class="admin-section-header">
          <div class="section-title-wrap">
            <span>Flex / Grid Gap</span>
            ${hasGapChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          ${hasGapChanged ? `<button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="gap" data-tooltip="Reset gap">↺</button>` : ''}
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
      this.activeElement.style[key] = `${val}px`;
      this._notifyChange({ styleKey: key, val: `${val}px` });
    };

    this._bindSliderPair(container, 'margin-top', (val) => {
      if (boxMt) boxMt.textContent = val;
      if (this.linkMargins) {
        ['Top', 'Bottom', 'Left', 'Right'].forEach(d => {
          this.activeElement.style[`margin${d}`] = `${val}px`;
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
      this.activeElement.style[key] = `${val}px`;
      this._notifyChange({ styleKey: key, val: `${val}px` });
    };

    this._bindSliderPair(container, 'padding-top', (val) => {
      if (boxPt) boxPt.textContent = val;
      if (this.linkPaddings) {
        ['Top', 'Bottom', 'Left', 'Right'].forEach(d => {
          this.activeElement.style[`padding${d}`] = `${val}px`;
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
      this.activeElement.style.gap = `${val}px`;
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
            ${hasMediaChanged ? '<span class="field-change-dot">●</span>' : ''}
          </div>
          ${hasMediaChanged ? `<button type="button" class="btn-field-reset" data-reset-type="media" data-tooltip="Reset media">↺</button>` : ''}
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
            ${hasPropsChanged ? '<span class="field-change-dot">●</span>' : ''}
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
              return `
                <div class="admin-field-row" style="margin-bottom: 6px;">
                  <label class="admin-field-label" style="font-family: var(--admin-mono); font-size: 10px;">data-${kebab}</label>
                  <div class="admin-field-control">
                    <input type="text" class="admin-input prop-val-input" data-prop="${key}" value="${val}">
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
    const previewWrap = native ? native.parentElement : null;

    if (native && hex) {
      native.addEventListener('input', () => {
        hex.value = native.value.toUpperCase();
        if (previewWrap) previewWrap.style.backgroundColor = native.value;
        onChange(native.value);
      });

      hex.addEventListener('input', () => {
        let val = hex.value.trim();
        if (!val.startsWith('#')) val = `#${val}`;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          native.value = val;
          if (previewWrap) previewWrap.style.backgroundColor = val;
          onChange(val);
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
    this._updateResetButtonVisibility();
  }

  _rgbToHex(rgbStr) {
    if (!rgbStr || rgbStr === 'transparent' || rgbStr === 'rgba(0, 0, 0, 0)') {
      return '#000000';
    }
    if (rgbStr.startsWith('#')) return rgbStr;

    const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';

    const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[3], 10).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`.toUpperCase();
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
