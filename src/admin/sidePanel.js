/**
 * Side Panel Inspector for Eko In-Context Visual Editor
 * Provides visual controls interface: Text Editor, Margin & Spacing Sliders (0-120px),
 * Media Drop Zones (audio & images routed through media proxy pipe to Hugging Face RawStorage),
 * and dynamic data attribute management.
 */

export class SidePanel {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {Function} options.onElementChange - Called when any style/text/prop changes
   * @param {Function} options.onDeselect - Called when user deselects
   */
  constructor(container, { onElementChange, onDeselect }) {
    this.container = container;
    this.onElementChange = onElementChange;
    this.onDeselect = onDeselect;

    this.activeElement = null;
    this.activeMeta = null;
    this.activeTab = 'text'; // 'text' | 'spacing' | 'media' | 'props'
    this.linkMargins = false;
    this.linkPaddings = false;
    this.previewAudio = null;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="admin-sidepanel-header">
        <div class="admin-sidepanel-title" id="admin-panel-title">
          <strong>Inspector</strong>
          <span>Select an element on canvas</span>
        </div>
        <div style="display: flex; gap: 4px;">
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-sidepanel-close" title="Close Panel">✕</button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="admin-tabs-nav" aria-label="Inspector Tabs">
        <button type="button" class="admin-tab-btn is-active" data-tab="text">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          <span>Text</span>
        </button>
        <button type="button" class="admin-tab-btn" data-tab="spacing">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
          <span>Spacing</span>
        </button>
        <button type="button" class="admin-tab-btn" data-tab="media">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          <span>Media</span>
        </button>
        <button type="button" class="admin-tab-btn" data-tab="props">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>Props</span>
        </button>
      </nav>

      <!-- Tab Content Area -->
      <div class="admin-tab-content" id="admin-tab-content">
        <div class="admin-empty-notice" style="text-align: center; padding: 40px 16px; color: var(--admin-text-muted);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
          <p style="margin: 0; font-size: 12px;">Click any element on the canvas to inspect and edit.</p>
        </div>
      </div>

      <!-- Footer Quick Actions -->
      <div class="admin-sidepanel-footer" id="admin-panel-footer" style="display: none;">
        <button type="button" class="admin-btn admin-btn-danger" id="btn-reset-element" title="Clear visual style overrides on this element">Reset Styles</button>
        <button type="button" class="admin-btn admin-btn-ghost" id="btn-copy-css" title="Copy inline CSS">Copy CSS</button>
      </div>
    `;

    this._bindTabEvents();
    this._bindHeaderEvents();
  }

  _bindHeaderEvents() {
    const closeBtn = this.container.querySelector('#btn-sidepanel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (typeof this.onDeselect === 'function') {
          this.onDeselect();
        }
      });
    }

    const resetBtn = this.container.querySelector('#btn-reset-element');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!this.activeElement) return;
        // Clear all inline styles on element
        this.activeElement.removeAttribute('style');
        this._notifyChange();
        this.inspect(this.activeElement, this.activeMeta);
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
        }
      });
    });
  }

  /**
   * Load element into the inspector
   */
  inspect(element, metadata) {
    this.activeElement = element;
    this.activeMeta = metadata;

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

  // ==========================================================================
  // TAB 1: TEXT EDITOR
  // ==========================================================================
  _buildTextTabHtml() {
    const s = this.activeMeta.styles;
    const textVal = this.activeElement.children.length === 0 ? this.activeElement.textContent : (this.activeElement.innerText || this.activeElement.textContent);

    const textColorHex = this._rgbToHex(s.color);
    const bgColorHex = this._rgbToHex(s.backgroundColor);
    const borderColorHex = this._rgbToHex(s.borderColor);

    const isBold = s.fontWeight >= 700 || s.fontWeight === 'bold';
    const isItalic = s.fontStyle === 'italic';
    const isUpper = s.textTransform === 'uppercase';

    return `
      <!-- Text Content -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Text Content</span>
        </div>
        <textarea class="admin-textarea" id="ctrl-text-content" rows="3" placeholder="Enter text content...">${this._escapeHtml(textVal)}</textarea>
      </div>

      <!-- Typography & Hierarchy -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Typography</span>
        </div>

        <!-- Font Family -->
        <div class="admin-field-row">
          <label class="admin-field-label" for="ctrl-font-family">Font Family</label>
          <div class="admin-field-control">
            <select class="admin-select" id="ctrl-font-family">
              <option value="'Dela Gothic One', sans-serif">Dela Gothic One (Display)</option>
              <option value="'DM Sans', sans-serif">DM Sans (Body/Modern)</option>
              <option value="'Work Sans', sans-serif">Work Sans (Technical/Nav)</option>
              <option value="'Kanit', sans-serif">Kanit (Grotesk Heavy)</option>
              <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">System Sans</option>
              <option value="Georgia, serif">Classic Serif</option>
              <option value="'SF Mono', Monaco, monospace">Monospace</option>
            </select>
          </div>
        </div>

        <!-- Font Size Slider -->
        <div class="admin-field-row">
          <label class="admin-field-label">Font Size</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-font-size" min="10" max="140" value="${s.fontSize || 16}">
              <input type="number" class="admin-range-number" id="num-font-size" min="10" max="140" value="${s.fontSize || 16}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>

        <!-- Font Weight -->
        <div class="admin-field-row">
          <label class="admin-field-label" for="ctrl-font-weight">Font Weight</label>
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
          </div>
        </div>

        <!-- Alignment & Style Toggles -->
        <div class="admin-field-row">
          <label class="admin-field-label">Formatting</label>
          <div class="admin-field-control" style="justify-content: space-between;">
            <!-- Alignments -->
            <div class="admin-button-group">
              <button type="button" class="admin-icon-toggle ${s.textAlign === 'left' ? 'is-active' : ''}" data-align="left" title="Align Left">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
              </button>
              <button type="button" class="admin-icon-toggle ${s.textAlign === 'center' ? 'is-active' : ''}" data-align="center" title="Align Center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>
              </button>
              <button type="button" class="admin-icon-toggle ${s.textAlign === 'right' ? 'is-active' : ''}" data-align="right" title="Align Right">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
              </button>
            </div>

            <!-- Toggles (Bold, Italic, Uppercase) -->
            <div class="admin-button-group">
              <button type="button" class="admin-icon-toggle ${isBold ? 'is-active' : ''}" id="btn-toggle-bold" title="Bold">
                <strong>B</strong>
              </button>
              <button type="button" class="admin-icon-toggle ${isItalic ? 'is-active' : ''}" id="btn-toggle-italic" title="Italic">
                <em>I</em>
              </button>
              <button type="button" class="admin-icon-toggle ${isUpper ? 'is-active' : ''}" id="btn-toggle-upper" title="Uppercase">
                <span>TT</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Text Shadows -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Text Shadow</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          <button type="button" class="admin-btn admin-btn-ghost shadow-preset" data-shadow="none">None</button>
          <button type="button" class="admin-btn admin-btn-ghost shadow-preset" data-shadow="0 0 4px rgba(250, 0, 255, 0.85), 0 0 20px rgba(250, 0, 255, 0.55), 0 0 50px rgba(250, 0, 255, 0.25)">Magenta Glow</button>
          <button type="button" class="admin-btn admin-btn-ghost shadow-preset" data-shadow="0 0 8px #00e5ff, 0 0 24px rgba(0, 229, 255, 0.4)">Cyan Neon</button>
          <button type="button" class="admin-btn admin-btn-ghost shadow-preset" data-shadow="0 2px 10px rgba(0, 0, 0, 0.7)">Soft Drop</button>
          <button type="button" class="admin-btn admin-btn-ghost shadow-preset" data-shadow="2px 2px 0px #000000">Hard Cut</button>
        </div>
        <div class="admin-field-row" style="margin-top: 8px;">
          <label class="admin-field-label">Custom Shadow</label>
          <input type="text" class="admin-input" id="ctrl-text-shadow" value="${this._escapeHtml(s.textShadow || '')}" placeholder="e.g. 0 0 10px #ff00ff">
        </div>
      </div>

      <!-- Colors (Text, Background, Border) -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Colors</span>
        </div>

        <!-- Text Color -->
        <div class="admin-field-row">
          <label class="admin-field-label">Text Color</label>
          <div class="admin-field-control">
            <div class="admin-color-field">
              <div class="admin-color-preview-wrap" style="background-color: ${textColorHex};">
                <input type="color" class="admin-color-native" id="native-color-text" value="${textColorHex}">
              </div>
              <input type="text" class="admin-input admin-color-hex-input" id="hex-color-text" value="${textColorHex}">
            </div>
          </div>
        </div>

        <!-- Background Color -->
        <div class="admin-field-row">
          <label class="admin-field-label">Background</label>
          <div class="admin-field-control">
            <div class="admin-color-field">
              <div class="admin-color-preview-wrap" style="background-color: ${bgColorHex};">
                <input type="color" class="admin-color-native" id="native-color-bg" value="${bgColorHex}">
              </div>
              <input type="text" class="admin-input admin-color-hex-input" id="hex-color-bg" value="${bgColorHex}">
            </div>
          </div>
        </div>

        <!-- Border Color -->
        <div class="admin-field-row">
          <label class="admin-field-label">Border Color</label>
          <div class="admin-field-control">
            <div class="admin-color-field">
              <div class="admin-color-preview-wrap" style="background-color: ${borderColorHex};">
                <input type="color" class="admin-color-native" id="native-color-border" value="${borderColorHex}">
              </div>
              <input type="text" class="admin-input admin-color-hex-input" id="hex-color-border" value="${borderColorHex}">
            </div>
          </div>
        </div>

        <!-- Border Width & Radius -->
        <div class="admin-field-row">
          <label class="admin-field-label">Border Width</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-border-width" min="0" max="20" value="${s.borderWidth || 0}">
              <input type="number" class="admin-range-number" id="num-border-width" min="0" max="20" value="${s.borderWidth || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>

        <div class="admin-field-row">
          <label class="admin-field-label">Border Radius</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-border-radius" min="0" max="48" value="${s.borderRadius || 0}">
              <input type="number" class="admin-range-number" id="num-border-radius" min="0" max="48" value="${s.borderRadius || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
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
          // If element has markup, update safe text or innerText
          this.activeElement.innerText = textInput.value;
        }
        this._notifyChange({ text: textInput.value });
      });
    }

    // 2. Font Family
    const fontSelect = container.querySelector('#ctrl-font-family');
    if (fontSelect) {
      // Find matching option
      const currentFont = this.activeMeta.styles.fontFamily;
      for (const opt of fontSelect.options) {
        if (currentFont && currentFont.includes(opt.value.split(',')[0].replace(/['"]/g, ''))) {
          opt.selected = true;
          break;
        }
      }
      fontSelect.addEventListener('change', () => {
        this.activeElement.style.fontFamily = fontSelect.value;
        this._notifyChange({ styleKey: 'fontFamily', val: fontSelect.value });
      });
    }

    // 3. Font Size Slider & Number
    this._bindSliderPair(container, 'font-size', (val) => {
      this.activeElement.style.fontSize = `${val}px`;
      this._notifyChange({ styleKey: 'fontSize', val: `${val}px` });
    });

    // 4. Font Weight
    const weightSelect = container.querySelector('#ctrl-font-weight');
    if (weightSelect) {
      weightSelect.value = String(this.activeMeta.styles.fontWeight || '400');
      weightSelect.addEventListener('change', () => {
        this.activeElement.style.fontWeight = weightSelect.value;
        this._notifyChange({ styleKey: 'fontWeight', val: weightSelect.value });
      });
    }

    // 5. Alignments
    container.querySelectorAll('[data-align]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-align]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const align = btn.dataset.align;
        this.activeElement.style.textAlign = align;
        this._notifyChange({ styleKey: 'textAlign', val: align });
      });
    });

    // 6. Formatting Toggles (Bold, Italic, Uppercase)
    const boldBtn = container.querySelector('#btn-toggle-bold');
    if (boldBtn) {
      boldBtn.addEventListener('click', () => {
        const isBold = boldBtn.classList.toggle('is-active');
        const val = isBold ? '700' : '400';
        this.activeElement.style.fontWeight = val;
        if (weightSelect) weightSelect.value = val;
        this._notifyChange({ styleKey: 'fontWeight', val });
      });
    }

    const italicBtn = container.querySelector('#btn-toggle-italic');
    if (italicBtn) {
      italicBtn.addEventListener('click', () => {
        const isItalic = italicBtn.classList.toggle('is-active');
        const val = isItalic ? 'italic' : 'normal';
        this.activeElement.style.fontStyle = val;
        this._notifyChange({ styleKey: 'fontStyle', val });
      });
    }

    const upperBtn = container.querySelector('#btn-toggle-upper');
    if (upperBtn) {
      upperBtn.addEventListener('click', () => {
        const isUpper = upperBtn.classList.toggle('is-active');
        const val = isUpper ? 'uppercase' : 'none';
        this.activeElement.style.textTransform = val;
        this._notifyChange({ styleKey: 'textTransform', val });
      });
    }

    // 7. Text Shadows
    const shadowInput = container.querySelector('#ctrl-text-shadow');
    container.querySelectorAll('.shadow-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const shadow = btn.dataset.shadow;
        if (shadowInput) shadowInput.value = shadow === 'none' ? '' : shadow;
        this.activeElement.style.textShadow = shadow;
        this._notifyChange({ styleKey: 'textShadow', val: shadow });
      });
    });

    if (shadowInput) {
      shadowInput.addEventListener('input', () => {
        this.activeElement.style.textShadow = shadowInput.value;
        this._notifyChange({ styleKey: 'textShadow', val: shadowInput.value });
      });
    }

    // 8. Colors (Text, Background, Border)
    this._bindColorPair(container, 'text', (val) => {
      this.activeElement.style.color = val;
      this._notifyChange({ styleKey: 'color', val });
    });

    this._bindColorPair(container, 'bg', (val) => {
      this.activeElement.style.backgroundColor = val;
      this._notifyChange({ styleKey: 'backgroundColor', val });
    });

    this._bindColorPair(container, 'border', (val) => {
      this.activeElement.style.borderColor = val;
      if (!this.activeElement.style.borderStyle) {
        this.activeElement.style.borderStyle = 'solid';
      }
      this._notifyChange({ styleKey: 'borderColor', val });
    });

    // 9. Border width & radius
    this._bindSliderPair(container, 'border-width', (val) => {
      this.activeElement.style.borderWidth = `${val}px`;
      if (!this.activeElement.style.borderStyle && val > 0) {
        this.activeElement.style.borderStyle = 'solid';
      }
      this._notifyChange({ styleKey: 'borderWidth', val: `${val}px` });
    });

    this._bindSliderPair(container, 'border-radius', (val) => {
      this.activeElement.style.borderRadius = `${val}px`;
      this._notifyChange({ styleKey: 'borderRadius', val: `${val}px` });
    });
  }

  // ==========================================================================
  // TAB 2: MARGIN & SPACING SLIDERS (0px to 120px)
  // ==========================================================================
  _buildSpacingTabHtml() {
    const s = this.activeMeta.styles;

    return `
      <!-- Visual Box Model Interactive Diagram -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Box Model (Figma / DevTools)</span>
        </div>
        <div class="admin-box-model">
          <span class="admin-box-label">Margin</span>
          <span class="box-val top" id="box-val-mt">${s.marginTop || 0}</span>
          <span class="box-val bottom" id="box-val-mb">${s.marginBottom || 0}</span>
          <span class="box-val left" id="box-val-ml">${s.marginLeft || 0}</span>
          <span class="box-val right" id="box-val-mr">${s.marginRight || 0}</span>

          <div class="admin-box-padding">
            <span class="admin-box-label" style="color: #10b981;">Padding</span>
            <span class="box-val top" id="box-val-pt">${s.paddingTop || 0}</span>
            <span class="box-val bottom" id="box-val-pb">${s.paddingBottom || 0}</span>
            <span class="box-val left" id="box-val-pl">${s.paddingLeft || 0}</span>
            <span class="box-val right" id="box-val-pr">${s.paddingRight || 0}</span>

            <div class="admin-box-content">
              <span>${this.activeMeta.tagName.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Page & Element Margins (0px to 120px) -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Margin Sliders (0px – 120px)</span>
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-toggle-link-margin" style="padding: 2px 6px; font-size: 10px;">
            ${this.linkMargins ? '🔗 Linked' : '🔓 Unlinked'}
          </button>
        </div>

        <!-- Margin Top -->
        <div class="admin-field-row">
          <label class="admin-field-label">Margin Top</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-margin-top" min="0" max="120" value="${s.marginTop || 0}">
              <input type="number" class="admin-range-number" id="num-margin-top" min="0" max="120" value="${s.marginTop || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>

        <!-- Margin Bottom -->
        <div class="admin-field-row">
          <label class="admin-field-label">Margin Bottom</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-margin-bottom" min="0" max="120" value="${s.marginBottom || 0}">
              <input type="number" class="admin-range-number" id="num-margin-bottom" min="0" max="120" value="${s.marginBottom || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>

        <!-- Margin Left -->
        <div class="admin-field-row">
          <label class="admin-field-label">Margin Left</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-margin-left" min="0" max="120" value="${s.marginLeft || 0}">
              <input type="number" class="admin-range-number" id="num-margin-left" min="0" max="120" value="${s.marginLeft || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>

        <!-- Margin Right -->
        <div class="admin-field-row">
          <label class="admin-field-label">Margin Right</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-margin-right" min="0" max="120" value="${s.marginRight || 0}">
              <input type="number" class="admin-range-number" id="num-margin-right" min="0" max="120" value="${s.marginRight || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Element Padding (0px to 120px) -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Element Padding (0px – 120px)</span>
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-toggle-link-padding" style="padding: 2px 6px; font-size: 10px;">
            ${this.linkPaddings ? '🔗 Linked' : '🔓 Unlinked'}
          </button>
        </div>

        <!-- Padding Top -->
        <div class="admin-field-row">
          <label class="admin-field-label">Padding Top</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-padding-top" min="0" max="120" value="${s.paddingTop || 0}">
              <input type="number" class="admin-range-number" id="num-padding-top" min="0" max="120" value="${s.paddingTop || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>

        <!-- Padding Bottom -->
        <div class="admin-field-row">
          <label class="admin-field-label">Padding Bottom</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-padding-bottom" min="0" max="120" value="${s.paddingBottom || 0}">
              <input type="number" class="admin-range-number" id="num-padding-bottom" min="0" max="120" value="${s.paddingBottom || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>

        <!-- Padding Left -->
        <div class="admin-field-row">
          <label class="admin-field-label">Padding Left</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-padding-left" min="0" max="120" value="${s.paddingLeft || 0}">
              <input type="number" class="admin-range-number" id="num-padding-left" min="0" max="120" value="${s.paddingLeft || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>

        <!-- Padding Right -->
        <div class="admin-field-row">
          <label class="admin-field-label">Padding Right</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-padding-right" min="0" max="120" value="${s.paddingRight || 0}">
              <input type="number" class="admin-range-number" id="num-padding-right" min="0" max="120" value="${s.paddingRight || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Inner Element Tracking Gaps (0px to 120px) -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Tracking & Gaps (0px – 120px)</span>
        </div>

        <!-- Grid/Flex Gap -->
        <div class="admin-field-row">
          <label class="admin-field-label">Element Gap</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-gap" min="0" max="120" value="${s.gap || 0}">
              <input type="number" class="admin-range-number" id="num-gap" min="0" max="120" value="${s.gap || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>

        <!-- Letter Spacing -->
        <div class="admin-field-row">
          <label class="admin-field-label">Letter Spacing</label>
          <div class="admin-field-control">
            <div class="admin-slider-row">
              <input type="range" class="admin-range-input" id="slider-letter-spacing" min="-2" max="24" value="${s.letterSpacing || 0}">
              <input type="number" class="admin-range-number" id="num-letter-spacing" min="-2" max="24" value="${s.letterSpacing || 0}">
              <span style="font-size: 11px; color: var(--admin-text-muted);">px</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _bindSpacingTabControls(container) {
    // Linked Margins Toggle
    const linkMarginBtn = container.querySelector('#btn-toggle-link-margin');
    if (linkMarginBtn) {
      linkMarginBtn.addEventListener('click', () => {
        this.linkMargins = !this.linkMargins;
        linkMarginBtn.textContent = this.linkMargins ? '🔗 Linked' : '🔓 Unlinked';
      });
    }

    // Linked Paddings Toggle
    const linkPadBtn = container.querySelector('#btn-toggle-link-padding');
    if (linkPadBtn) {
      linkPadBtn.addEventListener('click', () => {
        this.linkPaddings = !this.linkPaddings;
        linkPadBtn.textContent = this.linkPaddings ? '🔗 Linked' : '🔓 Unlinked';
      });
    }

    // Margin Sliders
    const marginSides = [
      { key: 'marginTop', id: 'margin-top', boxId: 'box-val-mt' },
      { key: 'marginBottom', id: 'margin-bottom', boxId: 'box-val-mb' },
      { key: 'marginLeft', id: 'margin-left', boxId: 'box-val-ml' },
      { key: 'marginRight', id: 'margin-right', boxId: 'box-val-mr' },
    ];

    marginSides.forEach(({ key, id, boxId }) => {
      this._bindSliderPair(container, id, (val) => {
        const boxEl = container.querySelector(`#${boxId}`);
        if (boxEl) boxEl.textContent = val;

        if (this.linkMargins) {
          marginSides.forEach(side => {
            this.activeElement.style[side.key] = `${val}px`;
            const b = container.querySelector(`#${side.boxId}`);
            if (b) b.textContent = val;
            const s = container.querySelector(`#slider-${side.id}`);
            const n = container.querySelector(`#num-${side.id}`);
            if (s) s.value = val;
            if (n) n.value = val;
            this._notifyChange({ styleKey: side.key, val: `${val}px` });
          });
        } else {
          this.activeElement.style[key] = `${val}px`;
          this._notifyChange({ styleKey: key, val: `${val}px` });
        }
      });
    });

    // Padding Sliders
    const paddingSides = [
      { key: 'paddingTop', id: 'padding-top', boxId: 'box-val-pt' },
      { key: 'paddingBottom', id: 'padding-bottom', boxId: 'box-val-pb' },
      { key: 'paddingLeft', id: 'padding-left', boxId: 'box-val-pl' },
      { key: 'paddingRight', id: 'padding-right', boxId: 'box-val-pr' },
    ];

    paddingSides.forEach(({ key, id, boxId }) => {
      this._bindSliderPair(container, id, (val) => {
        const boxEl = container.querySelector(`#${boxId}`);
        if (boxEl) boxEl.textContent = val;

        if (this.linkPaddings) {
          paddingSides.forEach(side => {
            this.activeElement.style[side.key] = `${val}px`;
            const b = container.querySelector(`#${side.boxId}`);
            if (b) b.textContent = val;
            const s = container.querySelector(`#slider-${side.id}`);
            const n = container.querySelector(`#num-${side.id}`);
            if (s) s.value = val;
            if (n) n.value = val;
            this._notifyChange({ styleKey: side.key, val: `${val}px` });
          });
        } else {
          this.activeElement.style[key] = `${val}px`;
          this._notifyChange({ styleKey: key, val: `${val}px` });
        }
      });
    });

    // Gap & Tracking
    this._bindSliderPair(container, 'gap', (val) => {
      this.activeElement.style.gap = `${val}px`;
      this._notifyChange({ styleKey: 'gap', val: `${val}px` });
    });

    this._bindSliderPair(container, 'letter-spacing', (val) => {
      this.activeElement.style.letterSpacing = `${val}px`;
      this._notifyChange({ styleKey: 'letterSpacing', val: `${val}px` });
    });
  }

  // ==========================================================================
  // TAB 3: MEDIA MANAGEMENT BLOCKS
  // ==========================================================================
  _buildMediaTabHtml() {
    const m = this.activeMeta.media;

    return `
      <!-- Audio Track Drop Zone -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Audio Track Drop Zone</span>
          <span class="admin-dropzone-pipe-tag">Proxy Pipe: HF RawStorage</span>
        </div>

        <div class="admin-dropzone" id="audio-dropzone">
          <div class="admin-dropzone-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <div class="admin-dropzone-title">Drop Audio Track Here</div>
          <div class="admin-dropzone-desc">Accepts .mp3, .wav, .flac, .aac files</div>
          <button type="button" class="admin-btn admin-btn-ghost" style="pointer-events: none; margin-top: 4px;">Or Click to Browse</button>
          <input type="file" id="audio-file-input" accept="audio/*" style="display: none;">
        </div>

        <div id="audio-upload-status" style="font-size: 11px; margin-top: 6px; display: none;"></div>

        <!-- Active Audio Player on Canvas Preview -->
        <div class="admin-audio-preview" id="admin-audio-preview-card" style="${m.audioSrc ? 'display: flex;' : 'display: none;'}">
          <button type="button" class="admin-audio-btn" id="btn-play-preview-audio" title="Test Audio Playback">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <div class="admin-audio-info">
            <div class="admin-audio-title" id="preview-audio-name">${m.audioSrc ? m.audioSrc.split('/').pop() : 'No active audio'}</div>
            <div class="admin-audio-sub" id="preview-audio-source">Swapped on Preview Canvas</div>
          </div>
        </div>
      </div>

      <!-- Layout Image Drop Zone -->
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Layout Image Drop Zone</span>
          <span class="admin-dropzone-pipe-tag">Proxy Pipe: Assets</span>
        </div>

        <div class="admin-dropzone" id="image-dropzone">
          <div class="admin-dropzone-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div class="admin-dropzone-title">Drop Image Asset Here</div>
          <div class="admin-dropzone-desc">Updates target image or background-image</div>
          <button type="button" class="admin-btn admin-btn-ghost" style="pointer-events: none; margin-top: 4px;">Or Click to Browse</button>
          <input type="file" id="image-file-input" accept="image/*" style="display: none;">
        </div>

        <div id="image-upload-status" style="font-size: 11px; margin-top: 6px; display: none;"></div>

        <!-- Active Image Preview Thumbnail -->
        <div class="admin-image-preview-card" id="admin-image-preview-card" style="${m.imageSrc ? 'display: block;' : 'display: none;'}">
          <img id="preview-image-thumb" src="${m.imageSrc || ''}" alt="Preview Asset">
        </div>
      </div>
    `;
  }

  _bindMediaTabControls(container) {
    // 1. Audio Drop Zone
    const audioDrop = container.querySelector('#audio-dropzone');
    const audioInput = container.querySelector('#audio-file-input');
    const audioStatus = container.querySelector('#audio-upload-status');
    const audioCard = container.querySelector('#admin-audio-preview-card');
    const audioNameEl = container.querySelector('#preview-audio-name');
    const playBtn = container.querySelector('#btn-play-preview-audio');

    if (audioDrop && audioInput) {
      audioDrop.addEventListener('click', () => audioInput.click());

      audioDrop.addEventListener('dragover', (e) => {
        e.preventDefault();
        audioDrop.classList.add('is-dragover');
      });

      audioDrop.addEventListener('dragleave', () => {
        audioDrop.classList.remove('is-dragover');
      });

      audioDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        audioDrop.classList.remove('is-dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this._handleMediaUpload(e.dataTransfer.files[0], 'audio', audioStatus, audioCard, audioNameEl);
        }
      });

      audioInput.addEventListener('change', () => {
        if (audioInput.files && audioInput.files.length > 0) {
          this._handleMediaUpload(audioInput.files[0], 'audio', audioStatus, audioCard, audioNameEl);
        }
      });
    }

    // Audio Play/Pause preview tester
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (!this.previewAudio) {
          const doc = this.activeElement.ownerDocument;
          const landingAudio = doc.querySelector('#audio');
          if (landingAudio && landingAudio.src) {
            this.previewAudio = landingAudio;
          }
        }

        if (this.previewAudio) {
          if (this.previewAudio.paused) {
            this.previewAudio.play();
            playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
          } else {
            this.previewAudio.pause();
            playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
          }
        }
      });
    }

    // 2. Image Drop Zone
    const imgDrop = container.querySelector('#image-dropzone');
    const imgInput = container.querySelector('#image-file-input');
    const imgStatus = container.querySelector('#image-upload-status');
    const imgCard = container.querySelector('#admin-image-preview-card');
    const imgThumb = container.querySelector('#preview-image-thumb');

    if (imgDrop && imgInput) {
      imgDrop.addEventListener('click', () => imgInput.click());

      imgDrop.addEventListener('dragover', (e) => {
        e.preventDefault();
        imgDrop.classList.add('is-dragover');
      });

      imgDrop.addEventListener('dragleave', () => {
        imgDrop.classList.remove('is-dragover');
      });

      imgDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        imgDrop.classList.remove('is-dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this._handleMediaUpload(e.dataTransfer.files[0], 'image', imgStatus, imgCard, null, imgThumb);
        }
      });

      imgInput.addEventListener('change', () => {
        if (imgInput.files && imgInput.files.length > 0) {
          this._handleMediaUpload(imgInput.files[0], 'image', imgStatus, imgCard, null, imgThumb);
        }
      });
    }
  }

  async _handleMediaUpload(file, type, statusEl, cardEl, nameEl, thumbEl) {
    if (!file) return;

    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = 'var(--admin-accent-cyan)';
      statusEl.innerHTML = `<span>⏳ Uploading ${file.name} through proxy pipe...</span>`;
    }

    try {
      // Read file to Base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send to server-side media proxy
      const payload = {
        fileName: file.name,
        fileType: type,
        mimeType: file.type,
        fileData: base64Data
      };

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Upload error');
      }

      const mediaUrl = data.url;

      // Update status
      if (statusEl) {
        const hfBadge = data.hfUploadSuccess
          ? '✓ Committed to Hugging Face RawStorage'
          : (data.hfConfigured ? '✓ Stored in media cache' : '✓ Saved to server proxy');
        statusEl.style.color = 'var(--admin-accent-green)';
        statusEl.innerHTML = `<span>${hfBadge}</span>`;
      }

      // Dynamically swap player / image source on preview canvas!
      const doc = this.activeElement.ownerDocument;

      if (type === 'audio') {
        // 1. Update landing audio element
        const landingAudio = doc.querySelector('#audio');
        if (landingAudio) {
          landingAudio.src = mediaUrl;
          landingAudio.load();
          this.previewAudio = landingAudio;
        }

        // 2. If target element is an audio or track list item
        if (this.activeElement.tagName === 'AUDIO') {
          this.activeElement.src = mediaUrl;
          this.activeElement.load();
        } else {
          this.activeElement.dataset.trackSrc = mediaUrl;
        }

        // 3. Update track title if on player
        const titleEl = doc.querySelector('.track-meta h3');
        if (titleEl) {
          titleEl.textContent = file.name.replace(/\.[^/.]+$/, '');
        }

        if (cardEl) cardEl.style.display = 'flex';
        if (nameEl) nameEl.textContent = file.name;

        this._notifyChange({
          media: {
            type: 'audio',
            src: mediaUrl,
            fileName: file.name
          }
        });
      } else if (type === 'image') {
        // Swap image source
        if (this.activeElement.tagName === 'IMG') {
          this.activeElement.src = mediaUrl;
        } else {
          this.activeElement.style.backgroundImage = `url("${mediaUrl}")`;
          this.activeElement.style.backgroundSize = 'cover';
        }

        if (cardEl) cardEl.style.display = 'block';
        if (thumbEl) thumbEl.src = mediaUrl;

        this._notifyChange({
          media: {
            type: 'image',
            src: mediaUrl,
            fileName: file.name
          }
        });
      }

    } catch (err) {
      console.error('[Media Upload Failed]:', err);
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.color = '#ff5252';
        statusEl.textContent = `Upload failed: ${err.message}`;
      }
    }
  }

  // ==========================================================================
  // TAB 4: DATA ATTRIBUTES & PROPS
  // ==========================================================================
  _buildPropsTabHtml() {
    const dataset = this.activeMeta.dataAttributes || {};
    const keys = Object.keys(dataset);

    return `
      <div class="admin-section">
        <div class="admin-section-header">
          <span>Data Attributes (dataset)</span>
        </div>

        <div class="admin-data-table" id="data-attributes-table">
          ${keys.length === 0 ? '<p style="color: var(--admin-text-muted); font-size: 11px; margin: 4px 0;">No custom data attributes on this element.</p>' : ''}
          ${keys.map(key => `
            <div class="admin-data-row" data-key="${key}">
              <input type="text" class="admin-input" value="data-${this._camelToKebab(key)}" readonly style="opacity: 0.8; font-family: var(--admin-mono); font-size: 11px;">
              <input type="text" class="admin-input data-attr-val" data-prop="${key}" value="${this._escapeHtml(dataset[key])}" style="font-family: var(--admin-mono); font-size: 11px;">
              <button type="button" class="admin-btn admin-btn-ghost btn-remove-prop" data-prop="${key}" title="Delete attribute">✕</button>
            </div>
          `).join('')}
        </div>

        <!-- Add New Prop Box -->
        <div style="margin-top: 14px; border-top: 1px dashed var(--admin-border-subtle); padding-top: 12px;">
          <div style="font-size: 11px; font-weight: 600; color: var(--admin-text-secondary); margin-bottom: 6px;">Add Custom Attribute</div>
          <div class="admin-data-add-box">
            <input type="text" class="admin-input" id="new-prop-name" placeholder="attribute-name" style="font-family: var(--admin-mono); font-size: 11px;">
            <input type="text" class="admin-input" id="new-prop-val" placeholder="value" style="font-family: var(--admin-mono); font-size: 11px;">
            <button type="button" class="admin-btn admin-btn-primary" id="btn-add-prop">Add</button>
          </div>
        </div>
      </div>
    `;
  }

  _bindPropsTabControls(container) {
    // Edit existing values
    container.querySelectorAll('.data-attr-val').forEach(input => {
      input.addEventListener('input', () => {
        const prop = input.dataset.prop;
        this.activeElement.dataset[prop] = input.value;
        this._notifyChange({ dataAttr: { [prop]: input.value } });
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

        // Convert kebab-case to camelCase for dataset
        const camel = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this.activeElement.dataset[camel] = val;
        this.activeMeta.dataAttributes[camel] = val;
        this._notifyChange({ dataAttr: { [camel]: val } });
        this._renderActiveTab();
      });
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  _bindSliderPair(container, prefix, onChange) {
    const slider = container.querySelector(`#slider-${prefix}`);
    const num = container.querySelector(`#num-${prefix}`);

    if (slider && num) {
      slider.addEventListener('input', () => {
        num.value = slider.value;
        onChange(Number(slider.value));
      });
      num.addEventListener('input', () => {
        slider.value = num.value;
        onChange(Number(num.value));
      });
    }
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
    if (typeof this.onElementChange === 'function' && this.activeElement && this.activeMeta) {
      this.onElementChange(this.activeElement, this.activeMeta, detail);
    }
  }

  _rgbToHex(rgbStr) {
    if (!rgbStr || rgbStr === 'transparent' || rgbStr === 'rgba(0, 0, 0, 0)') {
      return '#000000';
    }
    if (rgbStr.startsWith('#')) return rgbStr;

    const m = rgbStr.match(/\d+/g);
    if (!m || m.length < 3) return '#ffffff';

    const r = parseInt(m[0], 10).toString(16).padStart(2, '0');
    const g = parseInt(m[1], 10).toString(16).padStart(2, '0');
    const b = parseInt(m[2], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  _escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  _camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }
}
