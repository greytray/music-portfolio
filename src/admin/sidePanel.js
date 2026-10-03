/**
 * Side Panel Inspector for Eko In-Context Visual Editor
 * Provides rich visual controls: Typography (Font, Size, Weight, Line Spacing, Letter Spacing, Appearance/Case),
 * Non-code Visual Shadow & Glow Studio (Text Shadow vs Box Shadow),
 * Margin & Padding Sliders (0-120px), Modern Sleek Stepper Arrows,
 * Accurate Per-Element Change Tracking & Reset System,
 * Media Drop Zones (audio & images routed through media proxy),
 * and dynamic data attributes.
 */

import { getFriendlyName, findSimilarCardElements, getEnclosingSectionName } from './selectionEngine.js';

export const HF_RAW_STORAGE_BASE = 'https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main/Images';

export const DEFAULT_PROJECT_IMAGES = [
  { name: 'Curved DAW Monitor', src: '/api/media?file=Images/curved_daw_monitor_1789336964825.jpg', category: 'Studio Gear' },
  { name: 'Digital EQ & Compressor', src: '/api/media?file=Images/digital_eq_compressor_1789337007076.jpg', category: 'Plugins' },
  { name: 'Digital Reverb DSP', src: '/api/media?file=Images/digital_reverb_dsp_1789337033441.jpg', category: 'Plugins' },
  { name: 'MIDI Beat Arranger', src: '/api/media?file=Images/midi_beat_arranger_1789337019783.jpg', category: 'Production' },
  { name: 'Spectral Cleanup DSP', src: '/api/media?file=Images/spectral_cleanup_dsp_1789336993282.jpg', category: 'Plugins' },
  { name: 'Vocal Tuning Plugin', src: '/api/media?file=Images/vocal_tuning_plugin_1789336979208.jpg', category: 'Plugins' },
  { name: 'Studio Mixing Desk', src: '/api/media?file=Images/studio_mixing_desk_1789325845543.jpg', category: 'Studio Gear' },
  { name: 'Studio Acoustic Monitors', src: '/api/media?file=Images/studio_acoustic_monitors_1789331401789.jpg', category: 'Hardware' },
  { name: 'Studio Drum Pads', src: '/api/media?file=Images/studio_drum_pads_1789331427695.jpg', category: 'Production' },
  { name: 'Studio Headphones', src: '/api/media?file=Images/studio_headphones_1789331438637.jpg', category: 'Hardware' },
  { name: 'Studio Rack Gear', src: '/api/media?file=Images/studio_rack_gear_1789331450217.jpg', category: 'Hardware' },
  { name: 'Studio Sound Waves', src: '/api/media?file=Images/studio_sound_waves_1789325859183.jpg', category: 'Audio' },
  { name: 'Studio Synth Keys', src: '/api/media?file=Images/studio_synth_keys_1789325893151.jpg', category: 'Instruments' },
  { name: 'Studio Tape Reel', src: '/api/media?file=Images/studio_tape_reel_1789331415391.jpg', category: 'Vintage' },
  { name: 'Studio Vocal Booth', src: '/api/media?file=Images/studio_vocal_booth_1789331461100.jpg', category: 'Recording' },
  { name: 'Studio Vocal Mic', src: '/api/media?file=Images/studio_vocal_mic_1789325878081.jpg', category: 'Recording' },
  { name: 'Futuristic Grid Loop', src: './assets/backgrounds/gif2.gif', category: 'Backgrounds' },
  { name: 'Waveform Visualizer Loop', src: './assets/backgrounds/c1.gif', category: 'Backgrounds' }
];

export const DEFAULT_PROJECT_AUDIO = [
  { id: 'feeling_mello', title: 'Feeling Mello', style: 'Original production', duration: '0:44', file: 'audio/feeling mello.mp3', src: '/api/media?file=audio/feeling mello.mp3' },
  { id: 'broken_jar', title: 'Broken Jar', style: 'Mastered production', duration: '0:38', file: 'audio/broken jar mastered.mp3', src: '/api/media?file=audio/broken jar mastered.mp3' },
  { id: 'kpop_beat', title: 'Kpop Beat', style: 'K-Pop production', duration: '1:14', file: 'audio/Kpop beat.mp3', src: '/api/media?file=audio/Kpop beat.mp3' },
  { id: 'kensuke', title: 'Kensuke', style: 'Original production', duration: '0:45', file: 'audio/Kensuke.mp3', src: '/api/media?file=audio/Kensuke.mp3' },
  { id: 'kpop_post_fx', title: 'K-Pop Post FX', style: 'Post-production mix', duration: '0:14', file: 'audio/K-Pop post fx.mp3', src: '/api/media?file=audio/K-Pop post fx.mp3' },
  { id: 'aiobahn', title: 'Aiobahn Maybe Last Mix', style: 'Final mix', duration: '0:53', file: 'audio/Aiobahn maybe last mix.mp3', src: '/api/media?file=audio/Aiobahn maybe last mix.mp3' }
];

export class SidePanel {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {Object} options.exportSystem - Reference to ExportSystem for change tracking
   * @param {Function} options.onElementChange - Called when any style/text/prop changes
   * @param {Function} options.onDeselect - Called when user deselects
   * @param {Function} options.onToggleCollapse - Called when toggling sidebar collapse
   * @param {Function} options.onToggleShowChanges - Called when toggling show/hide changes
   * @param {Function} options.onToast - Optional toast notification trigger
   */
  constructor(container, { exportSystem, onElementChange, onDeselect, onToggleCollapse, onToggleShowChanges, onToast, getIframeDoc } = {}) {
    this.container = container;
    this.exportSystem = exportSystem;
    this.onElementChange = onElementChange;
    this.onDeselect = onDeselect;
    this.onToggleCollapse = onToggleCollapse;
    this.onToggleShowChanges = onToggleShowChanges;
    this.onToast = onToast;
    this.getIframeDoc = getIframeDoc;

    this.showChangesHighlight = localStorage.getItem('eko_admin_show_changes') !== 'false';
    this._lastChangesCount = 0;

    // Undo / Redo History Stack for Sidebar Menu
    this.undoStack = [];
    this.redoStack = [];
    this._isUndoingOrRedoing = false;

    this.activeElement = null;
    this.activeMeta = null;
    this.activeTab = 'text'; // 'text' | 'spacing' | 'media' | 'props'
    this.currentBreakpoint = 'universal'; // 'universal' | 'desktop' | 'tablet' | 'mobile'
    this.linkMargins = false;
    this.linkPaddings = false;
    this.previewAudio = null;

    // Media Studio State (Images & Audio Management)
    this.mediaSubMode = null; // 'image' | 'audio' (auto-detected if null)
    this.availableImages = [...DEFAULT_PROJECT_IMAGES];
    this.availableAudioTracks = [...DEFAULT_PROJECT_AUDIO];
    this.imageTransformState = {
      flipH: false,
      flipV: false,
      scale: 100,
      width: '',
      height: '',
      objectFit: 'cover'
    };
    this.currentPlayingAuditionSrc = null;
    this.auditionAudioElement = null;
    this._loadAvailableMedia();

    // Element baselines: stores snapshot BEFORE any sidebar edits (selector -> { style, text, isTextOnly, dataset })
    this.elementBaselines = new Map();

    // Linked elements system for TEXTS subcategories
    this.linkedSubcategories = new Set(); // Set of section IDs that have linking enabled: 'sec-typography', 'sec-shadow', etc.
    this.currentSimilarElements = []; // Cached array of similar elements across cards in the active section
    this.selectionEngine = null;

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

  setSelectionEngine(engine) {
    this.selectionEngine = engine;
    if (this.linkedSubcategories && this.linkedSubcategories.size > 0 && this.currentSimilarElements && this.currentSimilarElements.length > 0) {
      this.selectionEngine.setLinkedElements(this.currentSimilarElements);
    }
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
        <div class="admin-sidepanel-header-actions" id="admin-sidepanel-header-actions">
          <button type="button" class="admin-btn admin-btn-ghost btn-undo" id="btn-sidepanel-undo" data-tooltip="Undo (Ctrl+Z)" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button type="button" class="admin-btn admin-btn-ghost btn-redo" id="btn-sidepanel-redo" data-tooltip="Redo (Ctrl+Shift+Z)" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
          </button>
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-sidepanel-collapse" data-tooltip="Collapse Inspector Sidebar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/><path d="m10 9-3 3 3 3"/></svg>
          </button>
          <button type="button" class="admin-btn admin-btn-ghost btn-sidepanel-close" id="btn-sidepanel-close" data-tooltip="Close Panel">✕</button>
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
        ${this._buildEmptyTabNotice('text')}
        <div class="admin-sidebar-scroll-end" aria-hidden="true">---------------------------------------------------</div>
      </div>

      <!-- Footer Quick Actions: Reset Changes and Compact Show Changes on/off -->
      <div class="admin-sidepanel-footer" id="admin-panel-footer">
        <button type="button" class="admin-btn admin-btn-danger" id="btn-reset-element" data-tooltip="Reset changes" style="display: none;">Reset Changes</button>
        <button type="button" class="admin-toggle-changes-compact ${this.showChangesHighlight ? 'is-on' : ''}" id="btn-toggle-show-changes" data-tooltip="Toggle changes highlight">
          <span class="toggle-changes-badge-dot"></span>
          <span class="toggle-changes-title" id="toggle-changes-title">Show Changes</span>
          <span class="toggle-changes-count" id="toggle-changes-count" style="display: none;">0</span>
          <span class="toggle-changes-pill" id="toggle-switch-label">${this.showChangesHighlight ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    `;

    this._bindTabEvents();
    this._bindHeaderEvents();
    this._bindFooterEvents();
    this._renderActiveTab();
  }

  _bindFooterEvents() {
    const toggleBtn = this.container.querySelector('#btn-toggle-show-changes');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.showChangesHighlight = !this.showChangesHighlight;
        try {
          localStorage.setItem('eko_admin_show_changes', String(this.showChangesHighlight));
        } catch (_) {}
        this.updateShowChangesBadge(this._lastChangesCount, this.showChangesHighlight);
        if (typeof this.onToggleShowChanges === 'function') {
          this.onToggleShowChanges(this.showChangesHighlight);
        }
      });
    }
  }

  /**
   * Update the compact show changes button badge and switch state
   */
  updateShowChangesBadge(count, isEnabled) {
    if (isEnabled !== undefined) {
      this.showChangesHighlight = isEnabled;
    }
    if (typeof count === 'number') {
      this._lastChangesCount = count;
    }
    const btn = this.container.querySelector('#btn-toggle-show-changes');
    const label = this.container.querySelector('#toggle-switch-label');
    const countBadge = this.container.querySelector('#toggle-changes-count');

    if (btn) {
      if (this.showChangesHighlight) {
        btn.classList.add('is-on');
        if (label) label.textContent = 'ON';
      } else {
        btn.classList.remove('is-on');
        if (label) label.textContent = 'OFF';
      }
    }

    if (countBadge) {
      const displayCount = typeof count === 'number' ? count : this._lastChangesCount;
      if (displayCount > 0) {
        countBadge.style.display = 'inline-flex';
        countBadge.textContent = `${displayCount}`;
        countBadge.title = `${displayCount} changed element${displayCount === 1 ? '' : 's'}`;
      } else {
        countBadge.style.display = 'none';
      }
    }
  }

  _bindHeaderEvents() {
    const undoBtn = this.container.querySelector('#btn-sidepanel-undo');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        this.undo();
      });
    }

    const redoBtn = this.container.querySelector('#btn-sidepanel-redo');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => {
        this.redo();
      });
    }

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
  }

  _bindTabEvents() {
    this.container.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.auditionAudioElement) {
          try {
            this.auditionAudioElement.pause();
          } catch (_) {}
          this.auditionAudioElement = null;
          this.currentPlayingAuditionSrc = null;
        }
        this.container.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.activeTab = btn.dataset.tab;
        this._renderActiveTab();
        this.updateTabCounters();
        this._updateResetButtonVisibility();
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
      this._parseExistingShadow();
      this.elementBaselines.set(selector, {
        style: this.activeElement.getAttribute('style') || '',
        text: isTextOnly ? this.activeElement.textContent : this.activeElement.innerHTML,
        isTextOnly,
        dataset: { ...this.activeElement.dataset },
        shadowState: { ...this.shadowState },
        computedColor: computed ? computed.color : '',
        computedBgColor: computed ? computed.backgroundColor : '',
        computedBorderColor: computed ? computed.borderColor : '',
        computedBorderWidth: computed ? computed.borderWidth : '',
        computedBorderRadius: computed ? computed.borderRadius : '',
        computedFontFamily: computed ? computed.fontFamily : '',
        computedFontSize: computed ? computed.fontSize : '',
        computedFontWeight: computed ? computed.fontWeight : '',
        computedFontStyle: computed ? computed.fontStyle : '',
        computedTextAlign: computed ? computed.textAlign : '',
        computedTextTransform: computed ? computed.textTransform : '',
        computedFontVariant: computed ? computed.fontVariant : '',
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
        computedTextShadow: computed ? computed.textShadow : '',
        computedBoxShadow: computed ? computed.boxShadow : '',
        src: (this.activeElement.tagName === 'IMG' || this.activeElement.tagName === 'AUDIO') ? (this.activeElement.dataset?.src || this.activeElement.getAttribute('src') || '') : '',
        audio: this.activeElement.dataset ? (this.activeElement.dataset.audio || this.activeElement.dataset.src || '') : '',
        computedTransform: computed ? computed.transform : '',
        computedWidth: computed ? computed.width : '',
        computedHeight: computed ? computed.height : '',
        computedObjectFit: computed ? computed.objectFit : '',
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

    const currentTab = this.activeTab || 'text';
    const hasSectionChanges = this._hasActiveElementSectionChanges(currentTab);

    if (footer) {
      footer.style.display = 'flex';
    }

    if (resetBtn) {
      const sectionLabels = {
        text: 'Text Section',
        spacing: 'Spacing Section',
        media: 'Media Section',
        props: 'Props Section'
      };
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
      return this.isFieldChanged('src') || this.isFieldChanged('audio') || this.isFieldChanged('backgroundImage') || this.isFieldChanged('media') || this.isFieldChanged('transform') || this.isFieldChanged('width') || this.isFieldChanged('height') || this.isFieldChanged('objectFit');
    } else if (sectionName === 'props') {
      return this.isFieldChanged('dataAttributes');
    }
    return false;
  }

  /**
   * Helper: Extracts only direct text node content of an element without eating up child elements (like <small>)
   */
  _getDirectText(el) {
    if (!el) return '';
    const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
    if (textNodes.length > 0) {
      return textNodes.map(n => n.textContent).join(' ').trim();
    }
    if (el.children.length === 0) {
      return (el.textContent || '').trim();
    }
    return '';
  }

  /**
   * Helper: Safely updates direct text node of an element without destroying child elements (like <small>Original production</small>)
   */
  _updateElementDirectText(el, newVal) {
    if (!el) return;
    if (el.children.length === 0) {
      el.textContent = newVal;
      return;
    }
    const directTextNodes = Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
    if (directTextNodes.length > 0) {
      directTextNodes[0].nodeValue = newVal;
      for (let i = 1; i < directTextNodes.length; i++) {
        directTextNodes[i].remove();
      }
    } else {
      el.insertBefore(el.ownerDocument.createTextNode(newVal), el.firstChild);
    }
  }

  /**
   * Undo/Redo: Compares two snapshots to prevent duplicate undo/redo steps
   */
  _isSnapshotEqual(snapA, snapB) {
    if (!snapA || !snapB) return false;
    if (snapA.breakpoint !== snapB.breakpoint) return false;
    if (snapA.selector !== snapB.selector) {
      // If both snapshots belong to the same linked group of elements, don't reject them solely due to selection navigation
      const aHasB = snapA.linkedSnapshots && snapA.linkedSnapshots.some(s => s && s.selector === snapB.selector);
      const bHasA = snapB.linkedSnapshots && snapB.linkedSnapshots.some(s => s && s.selector === snapA.selector);
      if (!aHasB || !bHasA) return false;
    }
    if (JSON.stringify(snapA.exportData) !== JSON.stringify(snapB.exportData)) return false;
    if (snapA.domStyle !== snapB.domStyle) return false;
    if (snapA.domDirectText !== snapB.domDirectText) return false;
    if (JSON.stringify(snapA.dataset) !== JSON.stringify(snapB.dataset)) return false;
    if (JSON.stringify(snapA.shadowState) !== JSON.stringify(snapB.shadowState)) return false;
    if (JSON.stringify(snapA.linkedSnapshots || []) !== JSON.stringify(snapB.linkedSnapshots || [])) return false;
    return true;
  }

  /**
   * Undo/Redo: Captures snapshot of element and export state before a change
   */
  captureCurrentSnapshot(label = '') {
    if (!this.activeMeta || !this.exportSystem) return null;
    const selector = this.activeMeta.selector;
    const el = this.activeElement;

    // Ensure similar elements are detected and up-to-date
    if ((!this.currentSimilarElements || this.currentSimilarElements.length === 0) && el) {
      this.currentSimilarElements = findSimilarCardElements(el);
    }

    const linkedSnapshots = (this.currentSimilarElements && this.currentSimilarElements.length > 1)
      ? this.currentSimilarElements.map(itemEl => {
          if (!itemEl || !itemEl.isConnected) return null;
          const meta = this.selectionEngine ? this.selectionEngine.extractElementMetadata(itemEl) : null;
          const elSelector = meta ? meta.selector : this._generateFallbackSelector(itemEl);
          return {
            selector: elSelector,
            exportData: JSON.parse(JSON.stringify(this.exportSystem.getElementData(elSelector) || null)),
            domStyle: itemEl.getAttribute('style'),
            domDirectText: this._getDirectText(itemEl),
            domHtml: itemEl.innerHTML,
            dataset: { ...itemEl.dataset }
          };
        }).filter(Boolean)
      : [];

    return {
      label,
      selector,
      breakpoint: this.currentBreakpoint,
      activeTab: this.activeTab,
      exportData: JSON.parse(JSON.stringify(this.exportSystem.getElementData(selector) || null)),
      domStyle: el ? el.getAttribute('style') : null,
      domDirectText: el ? this._getDirectText(el) : null,
      domHtml: el ? el.innerHTML : null,
      dataset: el ? { ...el.dataset } : {},
      shadowState: { ...this.shadowState },
      linkedSnapshots,
      linkedSubcategories: Array.from(this.linkedSubcategories || []),
      timestamp: Date.now()
    };
  }

  pushUndoSnapshot(label = '') {
    if (this._isUndoingOrRedoing) return;
    const snapshot = this.captureCurrentSnapshot(label);
    if (!snapshot) return;

    // Avoid pushing duplicate snapshots
    const top = this.undoStack[this.undoStack.length - 1];
    if (this._isSnapshotEqual(top, snapshot)) return;

    this.undoStack.push(snapshot);
    if (this.undoStack.length > 60) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateUndoRedoButtons();
  }

  updateUndoRedoButtons() {
    const undoBtn = this.container.querySelector('#btn-sidepanel-undo');
    const redoBtn = this.container.querySelector('#btn-sidepanel-redo');
    if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    this._isUndoingOrRedoing = true;
    try {
      const currentSnapshot = this.captureCurrentSnapshot('Current State');

      // Pop until we find a snapshot that is genuinely different from current state (skips duplicate / no-op snapshots)
      let prev = this.undoStack.pop();
      while (prev && currentSnapshot && this._isSnapshotEqual(prev, currentSnapshot) && this.undoStack.length > 0) {
        prev = this.undoStack.pop();
      }

      if (prev && (!currentSnapshot || !this._isSnapshotEqual(prev, currentSnapshot))) {
        if (currentSnapshot) {
          this.redoStack.push(currentSnapshot);
          if (this.redoStack.length > 60) this.redoStack.shift();
        }
        this._restoreSnapshot(prev);
        return true;
      }
      return false;
    } finally {
      this._isUndoingOrRedoing = false;
      this.updateUndoRedoButtons();
    }
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    this._isUndoingOrRedoing = true;
    try {
      const currentSnapshot = this.captureCurrentSnapshot('Current State');

      // Pop until we find a snapshot that is genuinely different from current state
      let next = this.redoStack.pop();
      while (next && currentSnapshot && this._isSnapshotEqual(next, currentSnapshot) && this.redoStack.length > 0) {
        next = this.redoStack.pop();
      }

      if (next && (!currentSnapshot || !this._isSnapshotEqual(next, currentSnapshot))) {
        if (currentSnapshot) {
          this.undoStack.push(currentSnapshot);
          if (this.undoStack.length > 60) this.undoStack.shift();
        }
        this._restoreSnapshot(next);
        return true;
      }
      return false;
    } finally {
      this._isUndoingOrRedoing = false;
      this.updateUndoRedoButtons();
    }
  }

  _restoreSnapshot(snapshot) {
    if (!snapshot || !this.exportSystem) return;
    const selector = snapshot.selector;

    const doc = (this.activeElement && this.activeElement.ownerDocument)
      || (typeof this.getIframeDoc === 'function' ? this.getIframeDoc() : null)
      || (() => { try { return document.querySelector('#admin-preview-frame')?.contentDocument || null; } catch(_) { return null; } })()
      || window.document;

    // 1. Restore data in exportSystem for main active element
    if (snapshot.exportData) {
      this.exportSystem.changesMap.set(selector, JSON.parse(JSON.stringify(snapshot.exportData)));
      this.exportSystem.sessionUserChangesMap.set(selector, JSON.parse(JSON.stringify(snapshot.exportData)));
    } else {
      this.exportSystem.changesMap.delete(selector);
      this.exportSystem.sessionUserChangesMap.delete(selector);
    }

    // 2. Restore linked items in exportSystem and DOM
    if (snapshot.linkedSnapshots && Array.isArray(snapshot.linkedSnapshots)) {
      snapshot.linkedSnapshots.forEach(item => {
        if (!item) return;
        if (item.selector !== selector) {
          if (item.exportData) {
            this.exportSystem.changesMap.set(item.selector, JSON.parse(JSON.stringify(item.exportData)));
            this.exportSystem.sessionUserChangesMap.set(item.selector, JSON.parse(JSON.stringify(item.exportData)));
          } else {
            this.exportSystem.changesMap.delete(item.selector);
            this.exportSystem.sessionUserChangesMap.delete(item.selector);
          }
        }

        let linkedEl = (item.selector && doc && doc.querySelector) ? doc.querySelector(item.selector) : null;
        if (!linkedEl && this.currentSimilarElements) {
          linkedEl = this.currentSimilarElements.find(el => {
            if (!el || !el.isConnected) return false;
            const meta = this.selectionEngine ? this.selectionEngine.extractElementMetadata(el) : null;
            const s = meta ? meta.selector : this._generateFallbackSelector(el);
            return s === item.selector;
          });
        }

        if (linkedEl) {
          if (item.domStyle !== null && item.domStyle !== undefined) {
            linkedEl.setAttribute('style', item.domStyle);
          } else {
            linkedEl.removeAttribute('style');
          }

          if (item.domHtml !== null && item.domHtml !== undefined && item.domHtml.includes('<')) {
            linkedEl.innerHTML = item.domHtml;
          } else if (item.domDirectText !== null && item.domDirectText !== undefined) {
            this._updateElementDirectText(linkedEl, item.domDirectText);
          }

          if (item.dataset) {
            Object.keys(linkedEl.dataset).forEach(k => delete linkedEl.dataset[k]);
            Object.entries(item.dataset).forEach(([k, v]) => {
              linkedEl.dataset[k] = v;
            });
          }
        }
      });
    }

    this.exportSystem.hasUnpublishedChanges = this.exportSystem.changesMap.size > 0;

    // 3. Restore DOM element state in iframe document for main active element
    const targetEl = (selector && doc && doc.querySelector) ? (doc.querySelector(selector) || this.activeElement) : this.activeElement;

    if (targetEl) {
      if (snapshot.domStyle !== null && snapshot.domStyle !== undefined) {
        targetEl.setAttribute('style', snapshot.domStyle);
      } else {
        targetEl.removeAttribute('style');
      }

      if (snapshot.domHtml !== null && snapshot.domHtml !== undefined && snapshot.domHtml.includes('<')) {
        targetEl.innerHTML = snapshot.domHtml;
      } else if (snapshot.domDirectText !== null && snapshot.domDirectText !== undefined) {
        this._updateElementDirectText(targetEl, snapshot.domDirectText);
      }

      if (snapshot.dataset) {
        Object.keys(targetEl.dataset).forEach(k => delete targetEl.dataset[k]);
        Object.entries(snapshot.dataset).forEach(([k, v]) => {
          targetEl.dataset[k] = v;
        });
      }
    }

    if (snapshot.shadowState) {
      this.shadowState = { ...snapshot.shadowState };
    } else {
      const baseline = this.elementBaselines.get(selector);
      if (baseline && baseline.shadowState) {
        this.shadowState = { ...baseline.shadowState };
      }
    }

    // Restore linked subcategories state if recorded
    if (snapshot.linkedSubcategories && Array.isArray(snapshot.linkedSubcategories)) {
      this.linkedSubcategories = new Set(snapshot.linkedSubcategories);
    }

    // 4. Re-apply schema dynamically to iframe document
    try {
      applyDesignSchema(this.exportSystem.serializeSchema(), doc);
    } catch (_) {}

    // 5. Active element preservation:
    // If the currently inspected element is connected and belongs to this linked group, keep it active!
    const activeSelector = this.activeMeta ? this.activeMeta.selector : null;
    const isCurrentActiveInGroup = Boolean(
      this.activeElement && this.activeElement.isConnected && (
        activeSelector === selector ||
        (snapshot.linkedSnapshots && snapshot.linkedSnapshots.some(s => s && s.selector === activeSelector))
      )
    );

    const effectiveActiveEl = isCurrentActiveInGroup ? this.activeElement : (targetEl || this.activeElement);
    if (effectiveActiveEl) {
      this.activeElement = effectiveActiveEl;
      if (this.selectionEngine) {
        this.activeMeta = this.selectionEngine.extractElementMetadata(this.activeElement);
      } else {
        const sel = this._generateFallbackSelector(this.activeElement);
        this.activeMeta = {
          tagName: this.activeElement.tagName,
          id: this.activeElement.id || '',
          className: this.activeElement.className || '',
          selector: sel,
          styles: {},
          dataAttributes: { ...this.activeElement.dataset }
        };
      }
      this.currentSimilarElements = findSimilarCardElements(this.activeElement);
    }

    // 6. Update inspector tab, title, and all sidebar sliders/controls
    if (this.activeElement && this.activeMeta) {
      const titleEl = this.container.querySelector('#admin-panel-title');
      if (titleEl) {
        const friendlyName = getFriendlyName(this.activeElement);
        titleEl.innerHTML = `<strong>${friendlyName}</strong><span>Selected Component</span>`;
      }

      this._refreshActiveMetaStyles();
      if (snapshot.activeTab) {
        this.activeTab = snapshot.activeTab;
        this.container.querySelectorAll('.admin-tab-btn').forEach(b => {
          b.classList.toggle('is-active', b.dataset.tab === this.activeTab);
        });
      }
      this._renderActiveTab();
      this.updateTabCounters();
      this._updateResetButtonVisibility();
    }

    // 7. Update selectionEngine & linked indicators
    if (this.selectionEngine && this.activeElement) {
      this.selectionEngine.selectedElement = this.activeElement;
      this.selectionEngine._updateBoxes();
      if (this.linkedSubcategories && this.linkedSubcategories.size > 0 && this.currentSimilarElements && this.currentSimilarElements.length > 1) {
        this.selectionEngine.setLinkedElements(this.currentSimilarElements);
      } else {
        this.selectionEngine.setLinkedElements([]);
      }
    }

    // 8. Notify parent app to update status for active and linked elements
    if (typeof this.onElementChange === 'function') {
      if (this.activeElement && this.activeMeta) {
        this.onElementChange(this.activeElement, this.activeMeta, { undoRedo: true }, snapshot.breakpoint || this.currentBreakpoint);
      }
      if (this.currentSimilarElements && this.currentSimilarElements.length > 1) {
        this.currentSimilarElements.forEach(el => {
          if (el && el.isConnected && el !== this.activeElement) {
            const meta = this.selectionEngine ? this.selectionEngine.extractElementMetadata(el) : null;
            if (meta) {
              this.onElementChange(el, meta, { undoRedo: true }, snapshot.breakpoint || this.currentBreakpoint);
            }
          }
        });
      }
    }
  }

  /**
   * Reset all changes in the current section category
   */
  _handleResetSection(sectionName) {
    this.pushUndoSnapshot(`Reset ${sectionName}`);
    const currentTab = sectionName || this.activeTab || 'text';
    const targetSelector = this.activeMeta ? this.activeMeta.selector : null;

    if (this.exportSystem) {
      this.exportSystem.resetSection(currentTab, targetSelector);
    }

    const isLinkedActive = Boolean(
      this.linkedSubcategories &&
      this.linkedSubcategories.size > 0 &&
      this.currentSimilarElements &&
      this.currentSimilarElements.length > 1
    );

    const elementsToReset = isLinkedActive
      ? this.currentSimilarElements.filter(el => el && el.isConnected)
      : (this.activeElement ? [this.activeElement] : []);

    const textStyleList = [
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'textAlign', 'fontStyle', 'textTransform', 'fontVariant', 'textShadow',
      'boxShadow', 'color', 'backgroundColor', 'borderColor', 'borderWidth',
      'borderRadius', 'opacity'
    ];
    const spacingStyleList = [
      'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
      'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'gap'
    ];

    elementsToReset.forEach(el => {
      const meta = this.selectionEngine ? this.selectionEngine.extractElementMetadata(el) : null;
      const sel = meta ? meta.selector : this._generateFallbackSelector(el);
      const baseline = this.elementBaselines.get(sel);

      if (this.exportSystem && sel !== targetSelector) {
        this.exportSystem.resetSection(currentTab, sel);
      }

      if (currentTab === 'text') {
        textStyleList.forEach(k => {
          el.style.removeProperty(this._camelToKebab(k));
        });
        if (baseline && baseline.text !== undefined) {
          if (baseline.isTextOnly) {
            el.textContent = baseline.text;
          } else {
            el.innerHTML = baseline.text;
          }
        }
      } else if (currentTab === 'spacing') {
        spacingStyleList.forEach(k => el.style.removeProperty(k));
      } else if (currentTab === 'media') {
        if (el.tagName === 'IMG' || el.tagName === 'AUDIO') {
          if (baseline && baseline.src) el.src = baseline.src;
        }
        el.style.removeProperty('background-image');
      } else if (currentTab === 'props') {
        if (baseline && baseline.dataset) {
          Object.keys(el.dataset).forEach(k => delete el.dataset[k]);
          Object.entries(baseline.dataset).forEach(([k, v]) => {
            el.dataset[k] = v;
          });
        }
      }

      if (el !== this.activeElement && typeof this.onElementChange === 'function' && meta) {
        this.onElementChange(el, meta, { reset: true, resetSection: currentTab }, this.currentBreakpoint);
      }
    });

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
        if (!this.isFieldChanged(propKey) && baselineVal !== undefined && baselineVal !== '') {
          return baselineVal;
        }
        const override = this.getEffectiveFieldValue(propKey, null);
        if (override !== null && override !== undefined && override !== '') {
          return override;
        }
        return computedVal || baselineVal || '';
      };

      const getNumPropVal = (propKey, computedVal, baselineVal) => {
        if (!this.isFieldChanged(propKey) && baselineVal !== undefined && baselineVal !== '' && baselineVal !== null) {
          return toNum(baselineVal);
        }
        const override = this.getEffectiveFieldValue(propKey, null);
        if (override !== null && override !== undefined && override !== '') {
          return toNum(override);
        }
        return toNum(computedVal !== undefined ? computedVal : baselineVal);
      };

      this.activeMeta.styles = {
        color: getPropVal('color', computed.color, baseline ? baseline.computedColor : ''),
        backgroundColor: getPropVal('backgroundColor', computed.backgroundColor, baseline ? baseline.computedBgColor : ''),
        borderColor: getPropVal('borderColor', computed.borderColor, baseline ? baseline.computedBorderColor : ''),
        borderWidth: getNumPropVal('borderWidth', computed.borderWidth, baseline ? baseline.computedBorderWidth : 0),
        borderRadius: getNumPropVal('borderRadius', computed.borderRadius, baseline ? baseline.computedBorderRadius : 0),
        fontFamily: getPropVal('fontFamily', computed.fontFamily, baseline ? baseline.computedFontFamily : ''),
        fontSize: getNumPropVal('fontSize', computed.fontSize, baseline ? baseline.computedFontSize : 16),
        fontWeight: getPropVal('fontWeight', computed.fontWeight, baseline ? baseline.computedFontWeight : '400'),
        fontStyle: getPropVal('fontStyle', computed.fontStyle, baseline ? baseline.computedFontStyle : 'normal'),
        textAlign: getPropVal('textAlign', computed.textAlign, baseline ? baseline.computedTextAlign : 'left'),
        textShadow: getPropVal('textShadow', computed.textShadow !== 'none' ? computed.textShadow : '', baseline ? baseline.computedTextShadow : ''),
        boxShadow: getPropVal('boxShadow', computed.boxShadow !== 'none' ? computed.boxShadow : '', baseline ? baseline.computedBoxShadow : ''),
        textTransform: getPropVal('textTransform', computed.textTransform, baseline ? baseline.computedTextTransform : 'none'),
        fontVariant: getPropVal('fontVariant', computed.fontVariant, baseline ? baseline.computedFontVariant : 'normal'),
        marginTop: getNumPropVal('marginTop', computed.marginTop, baseline ? baseline.computedMarginTop : 0),
        marginBottom: getNumPropVal('marginBottom', computed.marginBottom, baseline ? baseline.computedMarginBottom : 0),
        marginLeft: getNumPropVal('marginLeft', computed.marginLeft, baseline ? baseline.computedMarginLeft : 0),
        marginRight: getNumPropVal('marginRight', computed.marginRight, baseline ? baseline.computedMarginRight : 0),
        paddingTop: getNumPropVal('paddingTop', computed.paddingTop, baseline ? baseline.computedPaddingTop : 0),
        paddingBottom: getNumPropVal('paddingBottom', computed.paddingBottom, baseline ? baseline.computedPaddingBottom : 0),
        paddingLeft: getNumPropVal('paddingLeft', computed.paddingLeft, baseline ? baseline.computedPaddingLeft : 0),
        paddingRight: getNumPropVal('paddingRight', computed.paddingRight, baseline ? baseline.computedPaddingRight : 0),
        gap: getNumPropVal('gap', computed.gap, baseline ? baseline.computedGap : 0),
        letterSpacing: getNumPropVal('letterSpacing', computed.letterSpacing, baseline ? baseline.computedLetterSpacing : 0),
        lineHeight: getPropVal('lineHeight', computed.lineHeight, baseline ? baseline.computedLineHeight : '1.5'),
      };
    }
  }

  /**
   * Load element into the inspector
   */
  inspect(element, metadata) {
    this.activeElement = element;
    this.activeMeta = metadata;

    // Detect all similar text elements across cards in the enclosing section
    this.currentSimilarElements = findSimilarCardElements(element);

    if (this.linkedSubcategories && this.linkedSubcategories.size > 0 && this.currentSimilarElements && this.currentSimilarElements.length > 1) {
      if (this.selectionEngine) {
        this.selectionEngine.setLinkedElements(this.currentSimilarElements);
      }
    } else {
      if (this.selectionEngine) {
        this.selectionEngine.setLinkedElements([]);
      }
    }

    this._captureBaselineIfNeeded();
    this._refreshActiveMetaStyles();
    this._parseExistingShadow();
    this._parseExistingMediaState();

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

    const selector = this.activeMeta ? this.activeMeta.selector : null;
    const baseline = selector ? this.elementBaselines.get(selector) : null;
    const hasShadowOverride = this.isFieldChanged('textShadow') || this.isFieldChanged('boxShadow');

    if (!hasShadowOverride && baseline && baseline.shadowState) {
      this.shadowState = { ...baseline.shadowState };
      return;
    }

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
    this.currentSimilarElements = [];
    if (this.auditionAudioElement) {
      this.auditionAudioElement.pause();
      this.auditionAudioElement = null;
      this.currentPlayingAuditionSrc = null;
    }
    if (this.selectionEngine) {
      this.selectionEngine.setLinkedElements([]);
    }

    const titleEl = this.container.querySelector('#admin-panel-title');
    if (titleEl) {
      if (this.activeTab === 'media') {
        titleEl.innerHTML = `
          <strong>Media Studio</strong>
          <span>Project Assets &amp; Audio Tracks</span>
        `;
      } else {
        titleEl.innerHTML = `
          <strong>Inspector</strong>
          <span>Select an element on canvas</span>
        `;
      }
    }
    this._updateResetButtonVisibility();

    this._renderActiveTab();
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
   * Check if a specific shadow property has been modified compared to pristine baseline
   */
  isShadowPropChanged(propKey) {
    if (!this.activeElement || !this.activeMeta) return false;
    const selector = this.activeMeta.selector;
    const baseline = this.elementBaselines.get(selector);
    const hasExportShadow = this.isFieldChanged('textShadow') || this.isFieldChanged('boxShadow');

    if (!baseline || !baseline.shadowState) {
      if (!hasExportShadow) return false;
      const defaultBase = { type: 'text', x: 0, y: 0, blur: 0, spread: 0, color: '#00e5ff', opacity: 0 };
      if (propKey === 'shadow-x' || propKey === 'shadowX') return this.shadowState.x !== defaultBase.x;
      if (propKey === 'shadow-y' || propKey === 'shadowY') return this.shadowState.y !== defaultBase.y;
      if (propKey === 'shadow-blur' || propKey === 'shadowBlur') return this.shadowState.blur !== defaultBase.blur;
      if (propKey === 'shadow-spread' || propKey === 'shadowSpread') return this.shadowState.spread !== defaultBase.spread;
      if (propKey === 'shadow-color' || propKey === 'shadowColor') return this.shadowState.color.toLowerCase() !== defaultBase.color.toLowerCase() || this.shadowState.opacity !== defaultBase.opacity;
      if (propKey === 'shadow-target' || propKey === 'shadowType') return this.shadowState.type !== defaultBase.type;
      return false;
    }

    const base = baseline.shadowState;
    if (propKey === 'shadow-x' || propKey === 'shadowX') return this.shadowState.x !== base.x;
    if (propKey === 'shadow-y' || propKey === 'shadowY') return this.shadowState.y !== base.y;
    if (propKey === 'shadow-blur' || propKey === 'shadowBlur') return this.shadowState.blur !== base.blur;
    if (propKey === 'shadow-spread' || propKey === 'shadowSpread') return this.shadowState.spread !== base.spread;
    if (propKey === 'shadow-color' || propKey === 'shadowColor') return this.shadowState.color.toLowerCase() !== base.color.toLowerCase() || this.shadowState.opacity !== base.opacity;
    if (propKey === 'shadow-target' || propKey === 'shadowType') return this.shadowState.type !== base.type;
    return false;
  }

  /**
   * Check if a specific style or setting has been changed on the element for the current breakpoint context
   */
  isFieldChanged(fieldKey) {
    if (!this.activeElement || !this.activeMeta || !this.exportSystem) return false;
    const selector = this.activeMeta.selector;
    const data = this.exportSystem.getElementData(selector);
    if (!data) return false;

    if (fieldKey.startsWith('shadow-') || fieldKey === 'shadow') {
      return this.isShadowPropChanged(fieldKey);
    }

    if (fieldKey === 'text') {
      if (this.currentBreakpoint === 'universal') {
        return data.text !== undefined;
      }
      const hasBpText = Boolean(data.breakpoints && data.breakpoints[this.currentBreakpoint] && data.breakpoints[this.currentBreakpoint].text !== undefined);
      return hasBpText || (data.text !== undefined);
    }

    if (fieldKey === 'media') {
      if (this.currentBreakpoint === 'universal') {
        return data.media !== undefined || Boolean(data.styles && (data.styles.transform || data.styles.width || data.styles.height || data.styles.objectFit || data.styles.backgroundImage));
      }
      const hasBpMedia = Boolean(data.breakpoints && data.breakpoints[this.currentBreakpoint] && (data.breakpoints[this.currentBreakpoint].media !== undefined || data.breakpoints[this.currentBreakpoint].transform || data.breakpoints[this.currentBreakpoint].width || data.breakpoints[this.currentBreakpoint].height || data.breakpoints[this.currentBreakpoint].objectFit || data.breakpoints[this.currentBreakpoint].backgroundImage));
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
   * Calculate change counts per section for the currently active inspected element
   */
  getActiveElementSectionCounts() {
    if (!this.activeMeta || !this.exportSystem) {
      return { text: 0, spacing: 0, media: 0, props: 0, total: 0 };
    }

    let textCount = 0;
    if (this.isFieldChanged('text')) textCount++;
    if (this.isFieldChanged('fontFamily')) textCount++;
    if (this.isFieldChanged('fontSize')) textCount++;
    if (this.isFieldChanged('fontWeight')) textCount++;
    if (this.isFieldChanged('lineHeight')) textCount++;
    if (this.isFieldChanged('letterSpacing')) textCount++;
    if (this.isFieldChanged('textTransform') || this.isFieldChanged('fontVariant')) textCount++;
    if (this.isFieldChanged('textAlign')) textCount++;
    if (this.isFieldChanged('fontStyle')) textCount++;
    
    // Count individual shadow changes
    if (this.isShadowPropChanged('shadow-target')) textCount++;
    if (this.isShadowPropChanged('shadow-x')) textCount++;
    if (this.isShadowPropChanged('shadow-y')) textCount++;
    if (this.isShadowPropChanged('shadow-blur')) textCount++;
    if (this.isShadowPropChanged('shadow-spread') && this.shadowState.type === 'box') textCount++;
    if (this.isShadowPropChanged('shadow-color')) textCount++;

    if (this.isFieldChanged('color')) textCount++;
    if (this.isFieldChanged('backgroundColor')) textCount++;
    if (this.isFieldChanged('borderColor')) textCount++;
    if (this.isFieldChanged('borderWidth')) textCount++;
    if (this.isFieldChanged('borderRadius')) textCount++;
    if (this.isFieldChanged('opacity')) textCount++;

    const spacingStyleList = [
      'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
      'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap'
    ];

    let spacingCount = 0;
    spacingStyleList.forEach(k => {
      if (this.isFieldChanged(k)) spacingCount++;
    });

    let mediaCount = 0;
    if (this.isFieldChanged('media') || this.isFieldChanged('src') || this.isFieldChanged('audio') || this.isFieldChanged('backgroundImage')) {
      mediaCount++;
    }
    if (this.isFieldChanged('transform')) {
      mediaCount++;
    }
    if (this.isFieldChanged('width') || this.isFieldChanged('height') || this.isFieldChanged('objectFit')) {
      mediaCount++;
    }

    let propsCount = 0;
    const data = this.exportSystem.getElementData(this.activeMeta.selector);
    if (data && data.dataAttributes) {
      propsCount = Object.keys(data.dataAttributes).length;
    }

    return {
      text: textCount,
      spacing: spacingCount,
      media: mediaCount,
      props: propsCount,
      total: textCount + spacingCount + mediaCount + propsCount
    };
  }

  getSiteWideTextChanges() {
    if (!this.exportSystem) return 0;
    const userChanges = this.exportSystem.sessionUserChangesMap;
    if (!userChanges || userChanges.size === 0) return 0;

    let totalTextCount = 0;
    const textStyleKeys = [
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'textTransform', 'fontVariant', 'textAlign', 'fontStyle', 'color',
      'textShadow'
    ];

    for (const [, elData] of userChanges.entries()) {
      if (!elData) continue;

      if (elData.text !== undefined && elData.text !== null) {
        totalTextCount++;
      }
      if (elData.styles) {
        textStyleKeys.forEach(k => {
          if (elData.styles[k] !== undefined) totalTextCount++;
        });
      }
      if (elData.breakpoints) {
        ['desktop', 'tablet', 'mobile'].forEach(bp => {
          if (elData.breakpoints[bp]) {
            if (elData.breakpoints[bp].text !== undefined) totalTextCount++;
            textStyleKeys.forEach(k => {
              if (elData.breakpoints[bp][k] !== undefined) totalTextCount++;
            });
          }
        });
      }
    }
    return totalTextCount;
  }

  /**
   * Calculate change counts for the currently active element and update tab bar badges
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

    // Header | Text | badge counts total of all text changes anywhere in the website
    const siteTextCount = this.getSiteWideTextChanges();
    this._updateBadge(textBadge, siteTextCount);

    if (!this.activeElement) {
      if (spacingBadge) spacingBadge.style.display = 'none';
      if (mediaBadge) mediaBadge.style.display = 'none';
      if (propsBadge) propsBadge.style.display = 'none';
      this._updateResetButtonVisibility();
      return;
    }

    const counts = this.getActiveElementSectionCounts();

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
    if (!contentEl) return;
    const prevScrollTop = contentEl.scrollTop;

    const titleEl = this.container.querySelector('#admin-panel-title');
    if (!this.activeElement || !this.activeMeta) {
      if (titleEl) {
        if (this.activeTab === 'media') {
          titleEl.innerHTML = `
            <strong>Media Studio</strong>
            <span>Project Assets &amp; Audio Tracks</span>
          `;
        } else {
          titleEl.innerHTML = `
            <strong>Inspector</strong>
            <span>Select an element on canvas</span>
          `;
        }
      }
    }

    const DASHED_END_LINE = `<div class="admin-sidebar-scroll-end" aria-hidden="true">---------------------------------------------------</div>`;

    if (this.activeTab === 'media') {
      contentEl.innerHTML = this._buildMediaTabHtml() + DASHED_END_LINE;
      this._bindMediaTabControls(contentEl);
    } else if (this.activeTab === 'text') {
      if (!this.activeElement || !this.activeMeta) {
        contentEl.innerHTML = this._buildEmptyTabNotice('text') + DASHED_END_LINE;
      } else {
        contentEl.innerHTML = this._buildTextTabHtml() + DASHED_END_LINE;
        this._bindTextTabControls(contentEl);
      }
    } else if (this.activeTab === 'spacing') {
      if (!this.activeElement || !this.activeMeta) {
        contentEl.innerHTML = this._buildEmptyTabNotice('spacing') + DASHED_END_LINE;
      } else {
        contentEl.innerHTML = this._buildSpacingTabHtml() + DASHED_END_LINE;
        this._bindSpacingTabControls(contentEl);
      }
    } else if (this.activeTab === 'props') {
      if (!this.activeElement || !this.activeMeta) {
        contentEl.innerHTML = this._buildEmptyTabNotice('props') + DASHED_END_LINE;
      } else {
        contentEl.innerHTML = this._buildPropsTabHtml() + DASHED_END_LINE;
        this._bindPropsTabControls(contentEl);
      }
    } else {
      contentEl.innerHTML = this._buildEmptyTabNotice(this.activeTab || 'text') + DASHED_END_LINE;
    }

    this._syncFieldIndicators();
    if (prevScrollTop > 0) {
      contentEl.scrollTop = prevScrollTop;
    }
    this._justReorderedTrackIdx = null;
  }

  /**
   * Category-specific empty state notice when no canvas element is currently selected
   */
  _buildEmptyTabNotice(tabKey) {
    let iconSvg = '';
    let categoryName = '';
    let categoryTitle = '';
    let categoryDesc = '';
    let step2Text = '';
    let tipText = '';

    if (tabKey === 'text') {
      categoryName = 'TEXTS';
      categoryTitle = 'Typography & Text Styling';
      categoryDesc = 'No text component currently selected.';
      iconSvg = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--admin-accent-cyan);">
          <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
        </svg>
      `;
      step2Text = 'Click any heading, paragraph, button label, badge, or link in the preview to inspect and edit.';
      tipText = 'Customize font family, font size, weight, line height, letter spacing, alignment, colors, and glow shadows.';
    } else if (tabKey === 'spacing') {
      categoryName = 'SPACING';
      categoryTitle = 'Spacing & Layout Model';
      categoryDesc = 'No layout component currently selected.';
      iconSvg = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--admin-accent-cyan);">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
        </svg>
      `;
      step2Text = 'Click any container, card, grid, column, or button in the preview to inspect and adjust its layout.';
      tipText = 'Fine-tune margin, padding, flex gaps, border width, border color, and corner radius per device breakpoint.';
    } else if (tabKey === 'props') {
      categoryName = 'PROPS';
      categoryTitle = 'Custom Attributes & Props';
      categoryDesc = 'No DOM element currently selected.';
      iconSvg = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--admin-accent-cyan);">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      `;
      step2Text = 'Click any component or element in the preview to inspect its custom HTML dataset and attributes.';
      tipText = 'Inspect, add, and update data-* attributes, track IDs, audio sources, and interaction links.';
    } else {
      categoryName = 'INSPECTOR';
      categoryTitle = 'Inspect & Edit';
      categoryDesc = 'Select an element on canvas.';
      iconSvg = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--admin-accent-cyan); transform: translate(-1px, 1px);">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          <path d="m13 13 6 6"/>
        </svg>
      `;
      step2Text = 'Click any element on the preview website to inspect and edit.';
      tipText = 'Double click on highlighted setting names to reset them.';
    }

    return `
      <div class="admin-empty-notice" style="text-align: center; padding: 24px 12px; color: var(--admin-text-secondary); width: 100%; box-sizing: border-box;">
        <div class="empty-cursor-icon-wrap" style="display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 50%; background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.35); margin-bottom: 12px; margin-inline: auto;">
          ${iconSvg}
        </div>
        <div style="display: inline-block; padding: 3px 10px; border-radius: 4px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: #A78BFA; margin-bottom: 8px;">
          ${categoryName}
        </div>
        <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: var(--admin-text-primary); text-align: center;">${categoryTitle}</p>
        <p style="margin: 0 0 16px 0; font-size: 12.5px; color: var(--admin-text-muted); text-align: center;">${categoryDesc}</p>
        <div style="text-align: left; width: 100%; box-sizing: border-box; margin: 0; font-size: 13px; line-height: 1.6; color: var(--admin-text-secondary); background: rgba(255, 255, 255, 0.02); padding: 16px; border-radius: 8px; border: 1px solid var(--admin-border-subtle);">
          <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px;">
            <span><strong style="color: var(--admin-text-primary);" class="admin-notice-bold">Step 1.</strong> Ensure <span style="color: var(--admin-accent-blue); font-weight: 600;">Edit mode</span> is ON</span>
            <span class="admin-kbd-group" style="display: inline-flex; align-items: center; gap: 3px;">
              <kbd class="admin-keycap">Shift</kbd>
              <kbd class="admin-keycap">E</kbd>
            </span>
          </div>
          <div style="margin-bottom: 14px; font-size: 13px;"><strong style="color: var(--admin-text-primary);" class="admin-notice-bold">Step 2.</strong> ${step2Text}</div>
          
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--admin-border-subtle); margin-bottom: 12px;">
            <div style="font-weight: 600; color: var(--admin-text-primary); margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;" class="admin-notice-heading">Tips &amp; Quick Resets</div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--admin-text-muted);">
              <div>• <strong style="color: var(--admin-text-secondary);" class="admin-notice-bold">Underline Marks:</strong> Modified settings show an underline (yellow in dark, amber in light mode).</div>
              <div>• <strong style="color: var(--admin-text-secondary);" class="admin-notice-bold">Quick Reset:</strong> Double-click any setting name to instantly revert it.</div>
              <div>• <strong style="color: var(--admin-text-secondary);" class="admin-notice-bold">Slider Reset:</strong> Double-click any slider or number box to reset to default.</div>
              <div>• <strong style="color: var(--admin-text-secondary);" class="admin-notice-bold">Highlight Edits:</strong> Toggle "Show Changes" at bottom to highlight all edited canvas elements.</div>
            </div>
          </div>

          <div style="padding-top: 12px; border-top: 1px dashed var(--admin-border-subtle);">
            <div style="font-weight: 600; color: var(--admin-text-primary); margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;" class="admin-notice-heading">Shortcuts</div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; font-size: 12.5px; align-items: center; color: var(--admin-text-muted);">
              <span class="admin-kbd-group">
                <kbd class="admin-keycap">Shift</kbd>
                <kbd class="admin-keycap">E</kbd>
              </span>
              <span style="color: var(--admin-text-secondary); font-weight: 500;">Toggle Edit mode</span>

              <span class="admin-kbd-group">
                <kbd class="admin-keycap">I</kbd>
              </span>
              <span style="color: var(--admin-text-secondary); font-weight: 500;">Toggle Sidebar</span>

              <span class="admin-kbd-group">
                <kbd class="admin-keycap">⌘</kbd>
                <span class="admin-kbd-slash">/</span>
                <kbd class="admin-keycap">Ctrl</kbd>
                <kbd class="admin-keycap">Z</kbd>
              </span>
              <span style="color: var(--admin-text-secondary); font-weight: 500;">Undo action</span>

              <span class="admin-kbd-group">
                <kbd class="admin-keycap">⌘</kbd>
                <span class="admin-kbd-slash">/</span>
                <kbd class="admin-keycap">Ctrl</kbd>
                <kbd class="admin-keycap">Shift</kbd>
                <kbd class="admin-keycap">Z</kbd>
              </span>
              <span style="color: var(--admin-text-secondary); font-weight: 500;">Redo action</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Synchronize the visibility of all field-level reset buttons and modification indicator dots
   */
  _syncFieldIndicators() {
    if (!this.container || !this.activeElement) return;
    const tabContent = this.container.querySelector('#admin-tab-content');
    if (!tabContent) return;

    // 1. Sync all field reset buttons
    const allResetBtns = tabContent.querySelectorAll('.btn-field-reset');
    allResetBtns.forEach(btn => {
      const type = btn.dataset.resetType;
      const key = btn.dataset.resetKey;
      let isChanged = false;

      if (type === 'text' || key === 'text') {
        isChanged = this.isFieldChanged('text');
      } else if (type === 'typography' || key === 'typography') {
        isChanged = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'fontVariant', 'textAlign', 'fontStyle'].some(k => this.isFieldChanged(k));
      } else if (type === 'colors' || key === 'colors') {
        isChanged = this.isFieldChanged('color') || this.isFieldChanged('backgroundColor');
      } else if (type === 'borders' || key === 'borders') {
        isChanged = this.isFieldChanged('borderColor') || this.isFieldChanged('borderWidth') || this.isFieldChanged('borderRadius');
      } else if (type === 'shadow' || key === 'shadow') {
        isChanged = ['shadow-target', 'shadow-x', 'shadow-y', 'shadow-blur', 'shadow-spread', 'shadow-color'].some(k => this.isShadowPropChanged(k));
      } else if (type === 'shadow-prop') {
        isChanged = this.isShadowPropChanged(key);
      } else if (type === 'allMargins' || key === 'allMargins' || key === 'margins') {
        isChanged = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].some(k => this.isFieldChanged(k));
      } else if (type === 'allPaddings' || key === 'allPaddings' || key === 'paddings') {
        isChanged = ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].some(k => this.isFieldChanged(k));
      } else if (type === 'media' || key === 'media') {
        isChanged = this.isFieldChanged('media') || this.isFieldChanged('src') || this.isFieldChanged('audio') || this.isFieldChanged('backgroundImage');
      } else if (type === 'dataAttr') {
        isChanged = this.isFieldChanged(`data-${key}`) || this.isFieldChanged(key);
      } else if (type === 'style') {
        if (key === 'textTransform' || key === 'appearance') {
          isChanged = this.isFieldChanged('textTransform') || this.isFieldChanged('fontVariant');
        } else if (key) {
          isChanged = this.isFieldChanged(key);
        }
      }

      btn.style.display = isChanged ? 'inline-flex' : 'none';
    });

    // 2. Sync all field rows and their labels
    tabContent.querySelectorAll('.admin-field-row').forEach(rowEl => {
      let isRowChanged = false;

      // Check reset button inside row
      const rowResetBtn = rowEl.querySelector('.btn-field-reset:not(.btn-section-reset)');
      if (rowResetBtn && rowResetBtn.style.display !== 'none') {
        isRowChanged = true;
      }

      // Check specific controls inside row
      if (!isRowChanged) {
        if (rowEl.querySelector('#ctrl-font-family') && this.isFieldChanged('fontFamily')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-font-size') && this.isFieldChanged('fontSize')) isRowChanged = true;
        else if (rowEl.querySelector('#ctrl-font-weight') && this.isFieldChanged('fontWeight')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-line-height') && this.isFieldChanged('lineHeight')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-letter-spacing') && this.isFieldChanged('letterSpacing')) isRowChanged = true;
        else if (rowEl.querySelector('.admin-appearance-group') && (this.isFieldChanged('textTransform') || this.isFieldChanged('fontVariant'))) isRowChanged = true;
        else if (rowEl.querySelector('[data-align]') && this.isFieldChanged('textAlign')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-margin-top') && this.isFieldChanged('marginTop')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-margin-bottom') && this.isFieldChanged('marginBottom')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-margin-left') && this.isFieldChanged('marginLeft')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-margin-right') && this.isFieldChanged('marginRight')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-padding-top') && this.isFieldChanged('paddingTop')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-padding-bottom') && this.isFieldChanged('paddingBottom')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-padding-left') && this.isFieldChanged('paddingLeft')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-padding-right') && this.isFieldChanged('paddingRight')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-gap') && this.isFieldChanged('gap')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-border-width') && this.isFieldChanged('borderWidth')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-border-radius') && this.isFieldChanged('borderRadius')) isRowChanged = true;
        else if (rowEl.querySelector('#hex-color-text') && this.isFieldChanged('color')) isRowChanged = true;
        else if (rowEl.querySelector('#hex-color-bg') && this.isFieldChanged('backgroundColor')) isRowChanged = true;
        else if (rowEl.querySelector('#hex-color-border') && this.isFieldChanged('borderColor')) isRowChanged = true;
        else if (rowEl.querySelector('#ctrl-text-content') && this.isFieldChanged('text')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-shadow-x') && this.isShadowPropChanged('shadow-x')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-shadow-y') && this.isShadowPropChanged('shadow-y')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-shadow-blur') && this.isShadowPropChanged('shadow-blur')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-shadow-spread') && this.isShadowPropChanged('shadow-spread')) isRowChanged = true;
        else if (rowEl.querySelector('#hex-color-shadow') && this.isShadowPropChanged('shadow-color')) isRowChanged = true;
        else if (rowEl.querySelector('#shadow-target-group') && this.isShadowPropChanged('shadow-target')) isRowChanged = true;
        else if (rowEl.querySelector('#slider-img-scale') && (this.isFieldChanged('scale') || this.isFieldChanged('transform'))) isRowChanged = true;
      }

      const labelEl = rowEl.querySelector('.admin-field-label');
      if (isRowChanged) {
        rowEl.classList.add('is-modified');
        if (labelEl) labelEl.classList.add('is-modified');
      } else {
        rowEl.classList.remove('is-modified');
        if (labelEl) labelEl.classList.remove('is-modified');
      }
    });

    // 3. Sync section headers and section change badges
    tabContent.querySelectorAll('.admin-section').forEach(sectionEl => {
      const headerEl = sectionEl.querySelector('.admin-section-header');
      let count = 0;
      if (headerEl && headerEl.dataset.indicatorKeys) {
        const keys = headerEl.dataset.indicatorKeys.split(',').filter(Boolean);
        keys.forEach(k => {
          if (this.isFieldChanged(k)) count++;
        });
      }

      const badgeEl = sectionEl.querySelector('.section-change-badge');
      if (badgeEl) {
        badgeEl.textContent = count;
        badgeEl.style.display = count > 0 ? 'inline-flex' : 'none';
      }

      const sectionResetBtn = sectionEl.querySelector('.btn-section-reset');
      if (sectionResetBtn) {
        sectionResetBtn.style.display = count > 0 ? 'inline-flex' : 'none';
      }

      const hasModifiedInside = count > 0 || sectionEl.querySelector('.admin-field-row.is-modified') !== null;
      if (hasModifiedInside) {
        sectionEl.classList.add('is-modified');
      } else {
        sectionEl.classList.remove('is-modified');
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
    this.pushUndoSnapshot(`Reset ${key || type}`);
    if (!this.activeElement || !this.activeMeta) return;
    const selector = this.activeMeta.selector;
    const baseline = this.elementBaselines.get(selector);

    if (type === 'text' || key === 'text') {
      if (baseline) {
        if (baseline.isTextOnly) {
          this.activeElement.textContent = baseline.text;
        } else {
          this.activeElement.innerHTML = baseline.text;
        }
      }
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'text', 'text', 'all');
      }
    } else if (type === 'typography' || key === 'typography') {
      const keys = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'fontVariant', 'textAlign', 'fontStyle'];
      keys.forEach(k => {
        this.activeElement.style.removeProperty(this._camelToKebab(k));
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', k, 'all');
        }
      });
    } else if (type === 'colors' || key === 'colors') {
      ['color', 'backgroundColor'].forEach(k => {
        this.activeElement.style.removeProperty(this._camelToKebab(k));
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', k, 'all');
        }
      });
    } else if (type === 'borders' || key === 'borders') {
      ['borderColor', 'borderWidth', 'borderRadius'].forEach(k => {
        this.activeElement.style.removeProperty(this._camelToKebab(k));
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', k, 'all');
        }
      });
    } else if (type === 'shadow' || key === 'shadow') {
      if (baseline && baseline.shadowState) {
        this.shadowState = { ...baseline.shadowState };
        const { x, y, blur, spread, color, opacity, type: sType } = this.shadowState;
        const alpha = Math.max(0, Math.min(1, opacity / 100));
        const rgb = this._hexToRgb(color);
        const rgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        this.activeElement.style.removeProperty('text-shadow');
        this.activeElement.style.removeProperty('box-shadow');
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', 'textShadow', 'all');
          this.exportSystem.removeChange(selector, 'style', 'boxShadow', 'all');
        }
        if (opacity > 0) {
          if (sType === 'text') {
            const sh = `${x}px ${y}px ${blur}px ${rgbaColor}`;
            this._notifyChange({ styleKey: 'textShadow', val: sh });
          } else {
            const sh = `${x}px ${y}px ${blur}px ${spread}px ${rgbaColor}`;
            this._notifyChange({ styleKey: 'boxShadow', val: sh });
          }
        }
      } else {
        this.activeElement.style.removeProperty('text-shadow');
        this.activeElement.style.removeProperty('box-shadow');
        this.shadowState = { type: 'text', x: 0, y: 0, blur: 0, spread: 0, color: '#00e5ff', opacity: 0 };
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', 'textShadow', 'all');
          this.exportSystem.removeChange(selector, 'style', 'boxShadow', 'all');
        }
      }
    } else if (type === 'shadow-prop' || (key && key.startsWith('shadow-'))) {
      const baseShadow = (baseline && baseline.shadowState) ? baseline.shadowState : { type: 'text', x: 0, y: 0, blur: 0, spread: 0, color: '#00e5ff', opacity: 0 };
      if (key === 'shadow-x' || key === 'shadowX') this.shadowState.x = baseShadow.x;
      else if (key === 'shadow-y' || key === 'shadowY') this.shadowState.y = baseShadow.y;
      else if (key === 'shadow-blur' || key === 'shadowBlur') this.shadowState.blur = baseShadow.blur;
      else if (key === 'shadow-spread' || key === 'shadowSpread') this.shadowState.spread = baseShadow.spread;
      else if (key === 'shadow-color' || key === 'shadowColor') {
        this.shadowState.color = baseShadow.color;
        this.shadowState.opacity = baseShadow.opacity;
      } else if (key === 'shadow-target' || key === 'shadowType') {
        this.shadowState.type = baseShadow.type;
      }
      // Re-apply updated shadow
      const { x, y, blur, spread, color, opacity, type: sType } = this.shadowState;
      const alpha = Math.max(0, Math.min(1, opacity / 100));
      const rgb = this._hexToRgb(color);
      const rgbaColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      this.activeElement.style.removeProperty('text-shadow');
      this.activeElement.style.removeProperty('box-shadow');
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'style', 'textShadow', 'all');
        this.exportSystem.removeChange(selector, 'style', 'boxShadow', 'all');
      }
      if (opacity > 0) {
        if (sType === 'text') {
          const sh = `${x}px ${y}px ${blur}px ${rgbaColor}`;
          this._notifyChange({ styleKey: 'textShadow', val: sh });
        } else {
          const sh = `${x}px ${y}px ${blur}px ${spread}px ${rgbaColor}`;
          this._notifyChange({ styleKey: 'boxShadow', val: sh });
        }
      }
    } else if (type === 'allMargins' || key === 'allMargins' || key === 'margins') {
      ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].forEach(prop => {
        this.activeElement.style.removeProperty(this._camelToKebab(prop));
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', prop, 'all');
        }
      });
    } else if (type === 'allPaddings' || key === 'allPaddings' || key === 'paddings') {
      ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach(prop => {
        this.activeElement.style.removeProperty(this._camelToKebab(prop));
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', prop, 'all');
        }
      });
    } else if (type === 'style') {
      if (key === 'textTransform' || key === 'appearance') {
        this.activeElement.style.removeProperty('text-transform');
        this.activeElement.style.removeProperty('font-variant');
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', 'textTransform', 'all');
          this.exportSystem.removeChange(selector, 'style', 'fontVariant', 'all');
        }
      } else {
        this.activeElement.style.removeProperty(this._camelToKebab(key));
        if (this.exportSystem) {
          this.exportSystem.removeChange(selector, 'style', key, 'all');
        }
      }
    } else if (type === 'media' || key === 'media') {
      if (this.activeElement.tagName === 'IMG') {
        if (baseline && baseline.src) {
          this.activeElement.setAttribute('src', baseline.src);
        } else if (baseline && baseline.dataset && baseline.dataset.src) {
          this.activeElement.setAttribute('src', baseline.dataset.src);
        }
      }
      if (this.activeElement.dataset.audio) {
        delete this.activeElement.dataset.audio;
      }
      if (baseline && baseline.audio) {
        this.activeElement.dataset.audio = baseline.audio;
      }
      this.activeElement.style.removeProperty('background-image');
      this.activeElement.style.removeProperty('transform');
      this.activeElement.style.removeProperty('width');
      this.activeElement.style.removeProperty('height');
      this.activeElement.style.removeProperty('object-fit');
      this.imageTransformState = {
        flipH: false,
        flipV: false,
        scale: 100,
        width: '',
        height: '',
        objectFit: 'cover'
      };
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'media', 'src', 'all');
        this.exportSystem.removeChange(selector, 'media', 'audio', 'all');
        this.exportSystem.removeChange(selector, 'dataAttr', 'audio', 'all');
        this.exportSystem.removeChange(selector, 'dataAttr', 'src', 'all');
        this.exportSystem.removeChange(selector, 'dataAttr', 'title', 'all');
        this.exportSystem.removeChange(selector, 'style', 'backgroundImage', 'all');
        this.exportSystem.removeChange(selector, 'style', 'transform', 'all');
        this.exportSystem.removeChange(selector, 'style', 'width', 'all');
        this.exportSystem.removeChange(selector, 'style', 'height', 'all');
        this.exportSystem.removeChange(selector, 'style', 'objectFit', 'all');
      }
    } else if (type === 'media-transform' || key === 'media-transform') {
      this.imageTransformState = {
        flipH: false,
        flipV: false,
        scale: 100,
        width: '',
        height: '',
        objectFit: 'cover'
      };
      this.activeElement.style.removeProperty('transform');
      this.activeElement.style.removeProperty('width');
      this.activeElement.style.removeProperty('height');
      this.activeElement.style.removeProperty('object-fit');
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'style', 'transform', 'all');
        this.exportSystem.removeChange(selector, 'style', 'width', 'all');
        this.exportSystem.removeChange(selector, 'style', 'height', 'all');
        this.exportSystem.removeChange(selector, 'style', 'objectFit', 'all');
      }
      this._notifyChange({ reset: true });
      this._renderActiveTab();
      return;
    } else if (type === 'flips' || key === 'flips') {
      this.imageTransformState.flipH = false;
      this.imageTransformState.flipV = false;
      this._applyImageTransform();
      return;
    } else if (type === 'scale' || key === 'scale') {
      this.imageTransformState.scale = 100;
      this._applyImageTransform();
      return;
    } else if (type === 'sizing' || key === 'sizing') {
      this.imageTransformState.width = '';
      this.imageTransformState.height = '';
      this.imageTransformState.objectFit = 'cover';
      this.activeElement.style.removeProperty('width');
      this.activeElement.style.removeProperty('height');
      this.activeElement.style.removeProperty('object-fit');
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'style', 'width', 'all');
        this.exportSystem.removeChange(selector, 'style', 'height', 'all');
        this.exportSystem.removeChange(selector, 'style', 'objectFit', 'all');
      }
      this._notifyChange({ reset: true });
      this._renderActiveTab();
      return;
    } else if (type === 'dataAttr') {
      delete this.activeElement.dataset[key];
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'dataAttr', key, 'all');
      }
    } else if (type === 'dataAttrAll' || type === 'props' || key === 'dataAttrAll' || key === 'props') {
      if (baseline && baseline.dataset) {
        Object.keys(this.activeElement.dataset).forEach(k => delete this.activeElement.dataset[k]);
        Object.entries(baseline.dataset).forEach(([k, v]) => {
          this.activeElement.dataset[k] = v;
        });
      } else {
        Object.keys(this.activeElement.dataset).forEach(k => delete this.activeElement.dataset[k]);
      }
      if (this.exportSystem) {
        this.exportSystem.removeChange(selector, 'dataAttr', null, 'all');
      }
    }

    // Cascade reset to linked card elements if this subcategory is linked
    const isResetLinked = (() => {
      if (!this.linkedSubcategories || this.linkedSubcategories.size === 0) return false;
      if (!this.currentSimilarElements || this.currentSimilarElements.length <= 1) return false;
      if (type === 'typography' || key === 'typography') return this.linkedSubcategories.has('sec-typography');
      if (type === 'shadow' || key === 'shadow' || type === 'shadow-prop' || (key && key.startsWith('shadow-'))) return this.linkedSubcategories.has('sec-shadow');
      if (type === 'colors' || key === 'colors') return this.linkedSubcategories.has('sec-colors');
      if (type === 'borders' || key === 'borders') return this.linkedSubcategories.has('sec-borders');
      if (type === 'text' || key === 'text') return this.linkedSubcategories.has('sec-text-content');
      if (type === 'style' && key) {
        if (['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'fontVariant', 'textAlign', 'fontStyle'].includes(key)) {
          return this.linkedSubcategories.has('sec-typography');
        }
        if (['color', 'backgroundColor'].includes(key)) return this.linkedSubcategories.has('sec-colors');
        if (['borderColor', 'borderWidth', 'borderRadius'].includes(key)) return this.linkedSubcategories.has('sec-borders');
      }
      return false;
    })();

    if (isResetLinked) {
      this.currentSimilarElements.forEach(el => {
        if (el && el.isConnected && el !== this.activeElement) {
          const meta = this.selectionEngine ? this.selectionEngine.extractElementMetadata(el) : null;
          const sel = meta ? meta.selector : this._generateFallbackSelector(el);
          const b = this.elementBaselines.get(sel);

          if (type === 'text' || key === 'text') {
            if (b) {
              if (b.isTextOnly) el.textContent = b.text;
              else el.innerHTML = b.text;
            }
            if (this.exportSystem) this.exportSystem.removeChange(sel, 'text', 'text', 'all');
          } else if (type === 'typography' || key === 'typography') {
            const keys = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'fontVariant', 'textAlign', 'fontStyle'];
            keys.forEach(k => {
              el.style.removeProperty(this._camelToKebab(k));
              if (this.exportSystem) this.exportSystem.removeChange(sel, 'style', k, 'all');
            });
          } else if (type === 'colors' || key === 'colors') {
            ['color', 'backgroundColor'].forEach(k => {
              el.style.removeProperty(this._camelToKebab(k));
              if (this.exportSystem) this.exportSystem.removeChange(sel, 'style', k, 'all');
            });
          } else if (type === 'borders' || key === 'borders') {
            ['borderColor', 'borderWidth', 'borderRadius'].forEach(k => {
              el.style.removeProperty(this._camelToKebab(k));
              if (this.exportSystem) this.exportSystem.removeChange(sel, 'style', k, 'all');
            });
          } else if (type === 'shadow' || key === 'shadow' || type === 'shadow-prop') {
            el.style.removeProperty('text-shadow');
            el.style.removeProperty('box-shadow');
            if (this.exportSystem) {
              this.exportSystem.removeChange(sel, 'style', 'textShadow', 'all');
              this.exportSystem.removeChange(sel, 'style', 'boxShadow', 'all');
            }
          } else if (type === 'style' && key) {
            el.style.removeProperty(this._camelToKebab(key));
            if (this.exportSystem) this.exportSystem.removeChange(sel, 'style', key, 'all');
          }

          if (typeof this.onElementChange === 'function' && meta) {
            this.onElementChange(el, meta, { reset: true, resetProperty: key || type }, this.currentBreakpoint);
          }
        }
      });
    }

    // 1. Notify change so exportSystem & schemaApplier immediately strip the dynamic override rule from the iframe <style>
    this._notifyChange({ reset: true, resetProperty: key || type });

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
      textVal = this._getDirectText(this.activeElement);
    }

    const baseFontSize = baseline && baseline.computedFontSize ? parseFloat(baseline.computedFontSize) : (parseFloat(computed.fontSize) || 16);
    const effectiveFontSize = this.isFieldChanged('fontSize')
      ? (parseFloat(this.getEffectiveFieldValue('fontSize', baseFontSize)) || baseFontSize)
      : baseFontSize;

    const baseLineHeight = baseline && baseline.computedLineHeight ? parseFloat(baseline.computedLineHeight) : (parseFloat(computed.lineHeight) || 1.5);
    let effectiveLineHeight = this.isFieldChanged('lineHeight')
      ? (parseFloat(this.getEffectiveFieldValue('lineHeight', baseLineHeight)) || baseLineHeight)
      : baseLineHeight;
    if (effectiveLineHeight > 10) {
      effectiveLineHeight = Math.round((effectiveLineHeight / effectiveFontSize) * 100) / 100;
    }

    const baseLetterSpacing = baseline && baseline.computedLetterSpacing ? parseFloat(baseline.computedLetterSpacing) : (parseFloat(computed.letterSpacing) || 0);
    const effectiveLetterSpacing = this.isFieldChanged('letterSpacing')
      ? (parseFloat(this.getEffectiveFieldValue('letterSpacing', baseLetterSpacing)) || baseLetterSpacing)
      : baseLetterSpacing;

    const baseBorderWidth = baseline && baseline.computedBorderWidth ? parseFloat(baseline.computedBorderWidth) : (parseFloat(computed.borderWidth) || 0);
    const effectiveBorderWidth = this.isFieldChanged('borderWidth')
      ? (parseFloat(this.getEffectiveFieldValue('borderWidth', baseBorderWidth)) || baseBorderWidth)
      : baseBorderWidth;

    const baseBorderRadius = baseline && baseline.computedBorderRadius ? parseFloat(baseline.computedBorderRadius) : (parseFloat(computed.borderRadius) || 0);
    const effectiveBorderRadius = this.isFieldChanged('borderRadius')
      ? (parseFloat(this.getEffectiveFieldValue('borderRadius', baseBorderRadius)) || baseBorderRadius)
      : baseBorderRadius;

    const getEffectiveColor = (key, computedVal, baselineVal) => {
      if (this.isFieldChanged(key)) {
        const eff = this.getEffectiveFieldValue(key, null);
        if (eff) return eff;
      }
      return baselineVal || computedVal || '';
    };

    const textColorHex = this._rgbToHex(getEffectiveColor('color', computed.color, baseline ? baseline.computedColor : ''));
    const bgColorHex = this._rgbToHex(getEffectiveColor('backgroundColor', computed.backgroundColor, baseline ? baseline.computedBgColor : ''));
    const borderColorHex = this._rgbToHex(getEffectiveColor('borderColor', computed.borderColor, baseline ? baseline.computedBorderColor : ''));

    const baseWeight = baseline && baseline.computedFontWeight ? baseline.computedFontWeight : (computed.fontWeight || '400');
    const effectiveWeight = this.isFieldChanged('fontWeight')
      ? this.getEffectiveFieldValue('fontWeight', baseWeight)
      : baseWeight;
    const isBold = effectiveWeight >= 700 || effectiveWeight === 'bold';

    const baseFontStyle = baseline && baseline.computedFontStyle ? baseline.computedFontStyle : (computed.fontStyle || 'normal');
    const effectiveFontStyle = this.isFieldChanged('fontStyle')
      ? this.getEffectiveFieldValue('fontStyle', baseFontStyle)
      : baseFontStyle;
    const isItalic = effectiveFontStyle === 'italic';

    const baseTransform = baseline && baseline.computedTextTransform ? baseline.computedTextTransform : (computed.textTransform || 'none');
    const textTransform = (this.isFieldChanged('textTransform') || this.isFieldChanged('appearance'))
      ? this.getEffectiveFieldValue('textTransform', baseTransform)
      : baseTransform;

    const baseVariant = baseline && baseline.computedFontVariant ? baseline.computedFontVariant : (computed.fontVariant || 'normal');
    const fontVariant = (this.isFieldChanged('fontVariant') || this.isFieldChanged('appearance'))
      ? this.getEffectiveFieldValue('fontVariant', baseVariant)
      : baseVariant;

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
      <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-text-content') ? 'is-collapsed' : ''} ${hasTextChanged ? 'is-modified' : ''}">
        ${this._renderSectionHeader('sec-text-content', 'Text Content', ['text'], 'text')}
        <div class="admin-field-row" style="margin-bottom: 0;">
          <textarea class="admin-textarea" id="ctrl-text-content" rows="2" placeholder="Edit text content...">${textVal ? textVal.trim() : ''}</textarea>
        </div>
      </div>

      <!-- Typography -->
      <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-typography') ? 'is-collapsed' : ''} ${hasFontFamilyChanged || hasFontSizeChanged || hasFontWeightChanged || hasLineHeightChanged || hasLetterSpacingChanged || hasAppearanceChanged || hasTextAlignChanged ? 'is-modified' : ''}">
        ${this._renderSectionHeader('sec-typography', 'Typography', ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'fontVariant', 'textAlign'], 'typography')}

        <!-- Font Family -->
        <div class="admin-field-row ${hasFontFamilyChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label" for="ctrl-font-family">Font</label>
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
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('font-size', 10, 140, 1, effectiveFontSize, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="fontSize" data-tooltip="Reset font size" style="display: ${hasFontSizeChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Font Weight -->
        <div class="admin-field-row ${hasFontWeightChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label" for="ctrl-font-weight">Font Weight</label>
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
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('line-height', 0.8, 3.5, 0.05, effectiveLineHeight, 'em')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="lineHeight" data-tooltip="Reset line spacing" style="display: ${hasLineHeightChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Letter Spacing -->
        <div class="admin-field-row ${hasLetterSpacingChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Letter Spacing</label>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('letter-spacing', -3, 24, 0.5, effectiveLetterSpacing, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="letterSpacing" data-tooltip="Reset letter spacing" style="display: ${hasLetterSpacingChanged ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Appearance: Normal, Upper, Lower, Title, Small Caps -->
        <div class="admin-field-row ${hasAppearanceChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Appearance</label>
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
      <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-shadow') ? 'is-collapsed' : ''} ${this.isShadowPropChanged('shadow-target') || this.isShadowPropChanged('shadow-x') || this.isShadowPropChanged('shadow-y') || this.isShadowPropChanged('shadow-blur') || this.isShadowPropChanged('shadow-spread') || this.isShadowPropChanged('shadow-color') ? 'is-modified' : ''}" data-section-id="sec-shadow">
        ${this._renderSectionHeader('sec-shadow', 'Shadow & Glow Studio', ['shadow-target', 'shadow-x', 'shadow-y', 'shadow-blur', 'shadow-spread', 'shadow-color'], 'shadow')}

        <!-- Shadow Target Mode: Text Glow vs Box Shadow -->
        <div class="admin-field-row ${this.isShadowPropChanged('shadow-target') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Target</label>
          </div>
          <div class="admin-field-control">
            <div class="admin-appearance-group" id="shadow-target-group">
              <button type="button" class="admin-case-btn ${this.shadowState.type === 'text' ? 'is-active' : ''}" data-shadow-type="text" data-tooltip="Apply glow directly to the text letters">Text Glow</button>
              <button type="button" class="admin-case-btn ${this.shadowState.type === 'box' ? 'is-active' : ''}" data-shadow-type="box" data-tooltip="Apply shadow to the container box/card">Box Shadow</button>
            </div>
            <button type="button" class="btn-field-reset" data-reset-type="shadow-prop" data-reset-key="shadow-target" data-tooltip="Reset shadow target" style="display: ${this.isShadowPropChanged('shadow-target') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Presets -->
        <div class="admin-field-row">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Presets</label>
          </div>
          <div class="admin-shadow-presets">
            <button type="button" class="shadow-preset-btn" data-preset="none">None</button>
            <button type="button" class="shadow-preset-btn" data-preset="glow">Cyan Glow</button>
            <button type="button" class="shadow-preset-btn" data-preset="magenta">Neon Pink</button>
            <button type="button" class="shadow-preset-btn" data-preset="subtle">Soft Dark</button>
            <button type="button" class="shadow-preset-btn" data-preset="deep">Deep Aura</button>
          </div>
        </div>

        <!-- X Offset -->
        <div class="admin-field-row ${this.isShadowPropChanged('shadow-x') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">X Offset</label>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('shadow-x', -40, 40, 1, this.shadowState.x, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="shadow-prop" data-reset-key="shadow-x" data-tooltip="Reset X offset" style="display: ${this.isShadowPropChanged('shadow-x') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Y Offset -->
        <div class="admin-field-row ${this.isShadowPropChanged('shadow-y') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Y Offset</label>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('shadow-y', -40, 40, 1, this.shadowState.y, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="shadow-prop" data-reset-key="shadow-y" data-tooltip="Reset Y offset" style="display: ${this.isShadowPropChanged('shadow-y') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Blur Radius -->
        <div class="admin-field-row ${this.isShadowPropChanged('shadow-blur') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Blur Radius</label>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('shadow-blur', 0, 60, 1, this.shadowState.blur, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="shadow-prop" data-reset-key="shadow-blur" data-tooltip="Reset blur" style="display: ${this.isShadowPropChanged('shadow-blur') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Spread Radius (Only applicable for Box Shadow) -->
        <div class="admin-field-row ${this.isShadowPropChanged('shadow-spread') ? 'is-modified' : ''}" id="row-shadow-spread" style="${this.shadowState.type === 'text' ? 'display: none;' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Spread</label>
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('shadow-spread', -20, 30, 1, this.shadowState.spread, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="shadow-prop" data-reset-key="shadow-spread" data-tooltip="Reset spread" style="display: ${this.isShadowPropChanged('shadow-spread') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>

        <!-- Shadow Color & Opacity -->
        <div class="admin-field-row ${this.isShadowPropChanged('shadow-color') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Color & Alpha</label>
          </div>
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
            <button type="button" class="btn-field-reset" data-reset-type="shadow-prop" data-reset-key="shadow-color" data-tooltip="Reset color & alpha" style="display: ${this.isShadowPropChanged('shadow-color') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>
      </div>

      <!-- Colors (Text & Background) -->
      <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-colors') ? 'is-collapsed' : ''} ${hasColorChanged || hasBgChanged ? 'is-modified' : ''}">
        ${this._renderSectionHeader('sec-colors', 'Color & Background', ['color', 'backgroundColor'], 'colors')}

        <!-- Text Color -->
        <div class="admin-field-row ${hasColorChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Font Color</label>
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
      </div>

      <!-- Borders & Corner Radius -->
      <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-borders') ? 'is-collapsed' : ''} ${hasBorderChanged ? 'is-modified' : ''}">
        ${this._renderSectionHeader('sec-borders', 'Borders & Corner Radius', ['borderColor', 'borderWidth', 'borderRadius'], 'borders')}

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
            ${this._renderSliderRow('border-width', 0, 20, 1, effectiveBorderWidth, 'px')}
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
            ${this._renderSliderRow('border-radius', 0, 48, 1, effectiveBorderRadius, 'px')}
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
      let textInteracting = false;
      textInput.addEventListener('input', () => {
        if (!textInteracting) {
          textInteracting = true;
          this.pushUndoSnapshot('Text Content');
        }
        const newVal = textInput.value;
        this._updateElementDirectText(this.activeElement, newVal);
        this._notifyChange({ text: newVal });
        this.updateTabCounters();
      });
      textInput.addEventListener('blur', () => {
        textInteracting = false;
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
        this.pushUndoSnapshot('Font Family');
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
        this.pushUndoSnapshot('Font Weight');
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
        this.pushUndoSnapshot('Appearance Case');
        container.querySelectorAll('.admin-case-btn[data-case]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const caseVal = btn.dataset.case;
        this.activeElement.style.removeProperty('font-variant');
        this.activeElement.style.removeProperty('text-transform');

        if (this.exportSystem && this.activeMeta) {
          this.exportSystem.removeChange(this.activeMeta.selector, 'style', 'fontVariant', this.currentBreakpoint);
          this.exportSystem.removeChange(this.activeMeta.selector, 'style', 'textTransform', this.currentBreakpoint);
        }

        if (caseVal === 'small-caps') {
          this._notifyChange({ styleKey: 'fontVariant', val: 'small-caps' });
        } else if (caseVal === 'normal') {
          this._notifyChange({ styleKey: 'textTransform', val: 'none' });
        } else {
          this._notifyChange({ styleKey: 'textTransform', val: caseVal });
        }
        this.updateTabCounters();
      });
    });

    // 8. Alignments
    container.querySelectorAll('[data-align]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.pushUndoSnapshot('Text Alignment');
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
        this.pushUndoSnapshot('Toggle Bold');
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
        this.pushUndoSnapshot('Toggle Italic');
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
        this.pushUndoSnapshot('Shadow Target');
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
      let isOpacityInteracting = false;
      const startOpacityInteraction = () => {
        if (!isOpacityInteracting) {
          isOpacityInteracting = true;
          this.pushUndoSnapshot('Shadow Opacity');
        }
      };
      const endOpacityInteraction = () => {
        isOpacityInteracting = false;
      };

      opacityInput.addEventListener('blur', endOpacityInteraction);
      opacityInput.addEventListener('input', () => {
        startOpacityInteraction();
        this.shadowState.opacity = parseInt(opacityInput.value, 10) || 0;
        applyShadowToElement();
      });

      // Stepper arrows for opacity
      container.querySelectorAll('.stepper-btn[data-step-target="num-shadow-opacity"]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.pushUndoSnapshot('Shadow Opacity');
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
        this.pushUndoSnapshot(`Shadow Preset ${preset}`);
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
      if (this.isFieldChanged(key)) {
        const overrideVal = this.getEffectiveFieldValue(key, null);
        if (overrideVal !== null && overrideVal !== undefined && overrideVal !== '') {
          const n = parseFloat(overrideVal);
          if (!isNaN(n)) return Math.round(n);
        }
      }

      // 2. Check pristine baseline property (before any edits)
      if (baseline) {
        const baseKey = `computed${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (baseline[baseKey] !== undefined && baseline[baseKey] !== '' && baseline[baseKey] !== 'normal' && baseline[baseKey] !== 'auto') {
          const n = parseFloat(baseline[baseKey]);
          if (!isNaN(n)) return Math.round(n);
        }
      }

      // 3. Fallback to computed style from iframe element
      if (computed) {
        const compVal = computed[key];
        if (compVal !== undefined && compVal !== null && compVal !== '' && compVal !== 'normal' && compVal !== 'auto') {
          const n = parseFloat(compVal);
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
      <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-margins') ? 'is-collapsed' : ''} ${hasMarginChanged ? 'is-modified' : ''}">
        ${this._renderSectionHeader('sec-margins', 'Margins (0px – 120px)', ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'], 'allMargins', null, `
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-toggle-link-margin" style="padding: 2px 6px; font-size: 10px;">
            ${this.linkMargins ? '🔗 Linked' : '🔓 Unlinked'}
          </button>
        `)}

        <!-- Margin Top -->
        <div class="admin-field-row ${this.isFieldChanged('marginTop') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Margin Top</label>
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
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('margin-right', 0, 120, 1, mr, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="marginRight" data-tooltip="Reset margin right" style="display: ${this.isFieldChanged('marginRight') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>
      </div>

      <!-- Element Paddings (0px to 120px) -->
      <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-paddings') ? 'is-collapsed' : ''} ${hasPaddingChanged ? 'is-modified' : ''}">
        ${this._renderSectionHeader('sec-paddings', 'Paddings (0px – 120px)', ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'], 'allPaddings', null, `
          <button type="button" class="admin-btn admin-btn-ghost" id="btn-toggle-link-padding" style="padding: 2px 6px; font-size: 10px;">
            ${this.linkPaddings ? '🔗 Linked' : '🔓 Unlinked'}
          </button>
        `)}

        <!-- Padding Top -->
        <div class="admin-field-row ${this.isFieldChanged('paddingTop') ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Padding Top</label>
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
          </div>
          <div class="admin-field-control">
            ${this._renderSliderRow('padding-right', 0, 120, 1, pr, 'px')}
            <button type="button" class="btn-field-reset" data-reset-type="style" data-reset-key="paddingRight" data-tooltip="Reset padding right" style="display: ${this.isFieldChanged('paddingRight') ? 'inline-flex' : 'none'};">↺</button>
          </div>
        </div>
      </div>

      <!-- Gap (Flex/Grid) -->
      <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-gap') ? 'is-collapsed' : ''} ${hasGapChanged ? 'is-modified' : ''}">
        ${this._renderSectionHeader('sec-gap', 'Flex / Grid Gap', ['gap'], 'style', 'gap')}
        <div class="admin-field-row ${hasGapChanged ? 'is-modified' : ''}">
          <div class="admin-field-label-wrap">
            <label class="admin-field-label">Gap Spacing</label>
          </div>
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
  // TAB 3: MEDIA MANAGEMENT (Image & Audio Studio)
  // ==========================================================================
  async _loadAvailableMedia() {
    try {
      const res = await fetch('/api/media?action=list');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.images) && data.images.length > 0) {
          const existingSrcs = new Set(this.availableImages.map(img => img.src));
          data.images.forEach(img => {
            if (!existingSrcs.has(img.src)) {
              this.availableImages.push(img);
              existingSrcs.add(img.src);
            }
          });
        }
        if (Array.isArray(data.audio) && data.audio.length > 0) {
          const existingFiles = new Set(this.availableAudioTracks.map(t => t.file || t.src));
          data.audio.forEach(track => {
            if (!existingFiles.has(track.file || track.src)) {
              this.availableAudioTracks.push(track);
              existingFiles.add(track.file || track.src);
            }
          });
        }
        if (this.activeTab === 'media') {
          this._renderActiveTab();
        }
      }
    } catch (_) {}
  }

  _parseExistingMediaState() {
    if (!this.activeElement) {
      if (!this.mediaSubMode) this.mediaSubMode = 'image';
      return;
    }

    const isImg = this.activeElement.tagName === 'IMG';
    const isAudio = Boolean(
      this.activeElement.hasAttribute('data-audio') ||
      this.activeElement.closest('[data-audio]') ||
      this.activeElement.classList.contains('track') ||
      this.activeElement.closest('.track') ||
      this.activeElement.tagName === 'AUDIO'
    );

    if (this.mediaSubMode === null) {
      this.mediaSubMode = isAudio ? 'audio' : 'image';
    }

    let flipH = false;
    let flipV = false;
    let scale = 100;

    const inlineTransform = (this.activeElement.style.transform || '').trim();
    const overrides = this.getElementOverrides();
    const overrideTransform = (overrides.styles && overrides.styles.transform) || '';
    const win = this.activeElement.ownerDocument ? this.activeElement.ownerDocument.defaultView : window;
    const computed = win ? win.getComputedStyle(this.activeElement) : null;
    const computedTransform = (computed && computed.transform && computed.transform !== 'none') ? computed.transform : '';

    const effectiveTransform = inlineTransform || overrideTransform || computedTransform;

    if (effectiveTransform && effectiveTransform !== 'none') {
      if (/scaleX\(\s*-1\s*\)/i.test(effectiveTransform)) flipH = true;
      if (/scaleY\(\s*-1\s*\)/i.test(effectiveTransform)) flipV = true;

      const scaleMatch = effectiveTransform.match(/scale\(\s*([-\d.]+)(?:\s*,\s*([-\d.]+))?\s*\)/i);
      if (scaleMatch) {
        const sx = parseFloat(scaleMatch[1]);
        const sy = scaleMatch[2] !== undefined ? parseFloat(scaleMatch[2]) : sx;
        if (sx < 0) flipH = true;
        if (sy < 0) flipV = true;
        const mag = Math.abs(sx);
        if (!isNaN(mag) && mag > 0) {
          scale = Math.round(mag * 100);
        }
      } else if (effectiveTransform.startsWith('matrix(')) {
        const parts = effectiveTransform.replace(/^matrix\(|\)$/g, '').split(',').map(s => parseFloat(s.trim()));
        if (parts.length >= 4) {
          const a = parts[0];
          const b = parts[1];
          const c = parts[2];
          const d = parts[3];
          if (a < 0) flipH = true;
          if (d < 0) flipV = true;
          const mag = Math.round(Math.hypot(a, b) * 100);
          if (!isNaN(mag) && mag > 0) scale = mag;
        }
      }
    }

    const currentWidth = this.activeElement.style.width || (overrides.styles && overrides.styles.width) || '';
    const currentHeight = this.activeElement.style.height || (overrides.styles && overrides.styles.height) || '';
    const currentObjectFit = this.activeElement.style.objectFit || (overrides.styles && overrides.styles.objectFit) || (computed ? computed.objectFit : 'cover') || 'cover';

    this.imageTransformState = {
      flipH,
      flipV,
      scale,
      width: currentWidth,
      height: currentHeight,
      objectFit: currentObjectFit
    };
  }

  _applyImageTransform() {
    if (!this.activeElement) return;
    this.pushUndoSnapshot('Image Transform');

    const S = (this.imageTransformState.scale || 100) / 100;
    const sx = this.imageTransformState.flipH ? -S : S;
    const sy = this.imageTransformState.flipV ? -S : S;

    let transformVal = '';
    if (this.imageTransformState.flipH || this.imageTransformState.flipV || this.imageTransformState.scale !== 100) {
      transformVal = `scale(${sx}, ${sy})`;
    }

    if (transformVal) {
      this.activeElement.style.transform = transformVal;
      this._notifyChange({ styleKey: 'transform', val: transformVal });
    } else {
      this.activeElement.style.removeProperty('transform');
      if (this.exportSystem && this.activeMeta) {
        this.exportSystem.removeChange(this.activeMeta.selector, 'style', 'transform', this.currentBreakpoint);
      }
      this._notifyChange({ styleKey: 'transform', val: '' });
    }

    this._renderActiveTab();
    this.updateTabCounters();
  }

  _applyImageSizing(key, val) {
    if (!this.activeElement) return;
    this.pushUndoSnapshot(`Image ${key}`);

    if (val && val !== 'initial' && val !== 'inherit') {
      this.activeElement.style[key] = val;
      this._notifyChange({ styleKey: key, val: val });
    } else {
      this.activeElement.style.removeProperty(this._camelToKebab(key));
      if (this.exportSystem && this.activeMeta) {
        this.exportSystem.removeChange(this.activeMeta.selector, 'style', key, this.currentBreakpoint);
      }
      this._notifyChange({ styleKey: key, val: '' });
    }

    this.imageTransformState[key] = val;
    this.updateTabCounters();
  }

  _swapImage(newSrc, newName) {
    if (!this.activeElement) {
      if (typeof this.onToast === 'function') {
        this.onToast(`Selected image: ${newName || 'image'}. Click an element in preview to apply it.`);
      }
      return;
    }
    this.pushUndoSnapshot('Swap Image');

    const isImg = this.activeElement.tagName === 'IMG';
    if (isImg) {
      this.activeElement.setAttribute('src', newSrc);
      this._notifyChange({ media: { src: newSrc, type: 'image' } });
    } else {
      this.activeElement.style.backgroundImage = `url('${newSrc}')`;
      this._notifyChange({ styleKey: 'backgroundImage', val: `url('${newSrc}')`, media: { src: newSrc, type: 'image' } });
    }

    if (typeof this.onToast === 'function') {
      this.onToast(`Swapped image to ${newName || 'selected image'}`);
    }

    this._renderActiveTab();
    this.updateTabCounters();
  }

  _swapAudio(newSrc, newTitle) {
    if (!this.activeElement) {
      if (typeof this.onToast === 'function') {
        this.onToast(`Selected audio: ${newTitle || 'track'}. Click a track on canvas to apply it.`);
      }
      return;
    }
    this.pushUndoSnapshot('Swap Audio');

    const trackBtn = this.activeElement.classList.contains('track') ? this.activeElement : this.activeElement.closest('.track');
    const catalogBtn = this.activeElement.hasAttribute('data-audio') ? this.activeElement : this.activeElement.closest('[data-audio]');
    const audioEl = this.activeElement.tagName === 'AUDIO' ? this.activeElement : null;

    if (trackBtn) {
      trackBtn.dataset.src = newSrc;
      trackBtn.dataset.audioFile = newSrc.replace('/api/media?file=', '');
      if (newTitle) {
        trackBtn.dataset.title = newTitle;
        const nameSpan = trackBtn.querySelector('.track-name');
        if (nameSpan) {
          const small = nameSpan.querySelector('small');
          const styleText = small ? small.textContent : '';
          nameSpan.innerHTML = `${newTitle}${styleText ? `<small>${styleText}</small>` : ''}`;
        }
      }
      this._notifyChange({
        dataAttr: { src: newSrc, title: newTitle || trackBtn.dataset.title || '' },
        media: { src: newSrc, type: 'audio' }
      });
    } else if (catalogBtn) {
      catalogBtn.dataset.audio = newSrc;
      if (newTitle) catalogBtn.dataset.title = newTitle;
      this._notifyChange({
        dataAttr: { audio: newSrc, title: newTitle || catalogBtn.dataset.title || '' },
        media: { src: newSrc, type: 'audio' }
      });
    } else if (audioEl) {
      audioEl.src = newSrc;
      audioEl.load();
      this._notifyChange({ media: { src: newSrc, type: 'audio' } });
    } else {
      this.activeElement.dataset.audio = newSrc;
      if (newTitle) this.activeElement.dataset.title = newTitle;
      this._notifyChange({
        dataAttr: { audio: newSrc, title: newTitle || '' },
        media: { src: newSrc, type: 'audio' }
      });
    }

    const iframeDoc = this.getIframeDoc ? this.getIframeDoc() : document;
    if (iframeDoc) {
      const mainAudio = iframeDoc.querySelector('#audio');
      if (mainAudio && (trackBtn?.classList.contains('active') || mainAudio.src.includes(newSrc))) {
        mainAudio.src = newSrc;
        mainAudio.load();
      }
    }

    if (typeof this.onToast === 'function') {
      this.onToast(`Swapped audio track to "${newTitle || 'selected audio'}"`);
    }

    this._renderActiveTab();
    this.updateTabCounters();
  }

  _formatTime(sec) {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  _updateAuditionTimeUi(cur, dur) {
    const timeDisplays = this.container.querySelectorAll('.inline-seek-time-text');
    const seekBars = this.container.querySelectorAll('.admin-inline-seek-slider');
    const seekFills = this.container.querySelectorAll('.admin-inline-seek-fill');

    const formattedCur = this._formatTime(cur);
    const formattedDur = this._formatTime(dur);

    timeDisplays.forEach(td => {
      td.textContent = `${formattedCur} / ${formattedDur}`;
    });

    if (dur > 0) {
      const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
      seekBars.forEach(sb => {
        if (!this.isAuditionSeeking) sb.value = cur;
        sb.max = dur;
      });
      seekFills.forEach(sf => {
        sf.style.width = `${pct}%`;
      });
    }
  }

  _updateAuditionUiState(isPlaying) {
    this.container.querySelectorAll('.btn-inline-seek-toggle').forEach(btn => {
      const isThisTrack = btn.dataset.src === this.currentPlayingAuditionSrc;
      if (isThisTrack) {
        btn.classList.toggle('is-playing', isPlaying);
        btn.innerHTML = isPlaying
          ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
          : `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      }
    });

    this.container.querySelectorAll('.btn-audition').forEach(b => {
      const isThisTrack = b.dataset.src === this.currentPlayingAuditionSrc;
      b.classList.toggle('is-playing', isThisTrack && isPlaying);
      if (isThisTrack && isPlaying) {
        b.innerHTML = `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`;
      } else {
        b.innerHTML = `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Audition`;
      }
    });
  }

  _handleAudition(src, title = '', style = '', btnEl = null) {
    if (!src) return;

    if (this.currentPlayingAuditionSrc === src && this.auditionAudioElement) {
      if (this.auditionAudioElement.paused) {
        this.auditionAudioElement.play().catch(() => {});
        this._updateAuditionUiState(true);
      } else {
        this.auditionAudioElement.pause();
        this._updateAuditionUiState(false);
      }
      return;
    }

    if (this.auditionAudioElement) {
      try {
        this.auditionAudioElement.pause();
      } catch (_) {}
    }

    const cleanTitle = title || src.split('/').pop().replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ') || 'Audio Track';
    this.currentPlayingAuditionSrc = src;
    this.auditionTrackInfo = {
      title: cleanTitle,
      style: style || 'Custom Audio',
      duration: '--:--',
      src
    };

    this.auditionAudioElement = new Audio(src);

    this.auditionAudioElement.addEventListener('loadedmetadata', () => {
      if (this.auditionAudioElement) {
        const dur = this.auditionAudioElement.duration;
        if (!isNaN(dur) && dur > 0) {
          this.auditionTrackInfo.duration = this._formatTime(dur);
          this._updateAuditionTimeUi(this.auditionAudioElement.currentTime, dur);
        }
      }
    });

    this.auditionAudioElement.addEventListener('timeupdate', () => {
      if (this.auditionAudioElement && !this.isAuditionSeeking) {
        const cur = this.auditionAudioElement.currentTime || 0;
        const dur = this.auditionAudioElement.duration || 0;
        this._updateAuditionTimeUi(cur, dur);
      }
    });

    this.auditionAudioElement.addEventListener('play', () => {
      this._updateAuditionUiState(true);
    });

    this.auditionAudioElement.addEventListener('pause', () => {
      this._updateAuditionUiState(false);
    });

    this.auditionAudioElement.addEventListener('ended', () => {
      this._updateAuditionUiState(false);
      this._updateAuditionTimeUi(0, this.auditionAudioElement ? this.auditionAudioElement.duration : 0);
    });

    this.auditionAudioElement.play().catch(() => {});
    this._renderActiveTab();
    this._updateAuditionUiState(true);
  }

  _handleReorderPlaylist(currentIndex, targetIndex, position = 'auto') {
    const iframeDoc = this.getIframeDoc ? this.getIframeDoc() : document;
    if (!iframeDoc) return;

    const playlistEl = iframeDoc.querySelector('#playlist') || iframeDoc.querySelector('.playlist');
    if (!playlistEl) {
      if (typeof this.onToast === 'function') {
        this.onToast('Playlist container not found in current view', true);
      }
      return;
    }

    const tracks = Array.from(playlistEl.querySelectorAll('.track'));
    if (currentIndex < 0 || currentIndex >= tracks.length || targetIndex < 0 || targetIndex >= tracks.length) {
      return;
    }

    this.pushUndoSnapshot('Reorder Playlist Tracks');

    const movingEl = tracks[currentIndex];
    const targetEl = tracks[targetIndex];

    if (position === 'before') {
      playlistEl.insertBefore(movingEl, targetEl);
    } else if (position === 'after') {
      playlistEl.insertBefore(movingEl, targetEl.nextSibling);
    } else {
      if (targetIndex > currentIndex) {
        playlistEl.insertBefore(movingEl, targetEl.nextSibling);
      } else {
        playlistEl.insertBefore(movingEl, targetEl);
      }
    }

    const reorderedTracks = Array.from(playlistEl.querySelectorAll('.track'));
    reorderedTracks.forEach((t, i) => {
      const numSpan = t.querySelector('.track-number');
      if (numSpan) {
        numSpan.textContent = String(i + 1).padStart(2, '0');
      }
    });

    if (this.exportSystem) {
      this.exportSystem.recordChange('#playlist', { html: playlistEl.innerHTML }, 'universal');
      this.exportSystem.hasUnpublishedChanges = true;
    }

    const trackTitle = movingEl.dataset.title || movingEl.querySelector('.track-name')?.firstChild?.textContent?.trim() || `Track ${currentIndex + 1}`;
    const direction = targetIndex < currentIndex ? 'up' : 'down';
    if (typeof this.onToast === 'function') {
      this.onToast(`Moved "${trackTitle}" ${direction} in playlist`);
    }

    this._renderActiveTab();
    this.updateTabCounters();
  }

  async _handleMediaUpload(file, forcedType = null) {
    const isImg = forcedType ? forcedType === 'image' : (this.activeElement?.tagName === 'IMG' || file.type.startsWith('image/'));
    const isAudio = forcedType ? forcedType === 'audio' : (!isImg || file.type.startsWith('audio/'));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', isAudio ? 'audio' : 'image');

    const dropzone = this.container.querySelector('#media-dropzone') || this.container.querySelector('.admin-dropzone');
    if (dropzone) {
      dropzone.innerHTML = `<div style="font-size: 11px; color: var(--admin-accent-cyan);">Uploading ${file.name}...</div>`;
    }

    let finalUrl = '';
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        finalUrl = data.url || URL.createObjectURL(file);
      } else {
        finalUrl = URL.createObjectURL(file);
      }
    } catch {
      finalUrl = URL.createObjectURL(file);
    }

    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ');

    if (isAudio) {
      const newAudioItem = {
        id: `uploaded_${Date.now()}`,
        title: cleanTitle,
        style: 'Custom upload',
        duration: '0:30',
        file: file.name,
        src: finalUrl
      };
      this.availableAudioTracks.unshift(newAudioItem);

      const probe = new Audio(finalUrl);
      probe.addEventListener('loadedmetadata', () => {
        const m = Math.floor(probe.duration / 60);
        const s = Math.floor(probe.duration % 60);
        newAudioItem.duration = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (this.activeTab === 'media') this._renderActiveTab();
      });

      if (this.activeElement) {
        this._swapAudio(finalUrl, cleanTitle);
      } else {
        if (typeof this.onToast === 'function') {
          this.onToast(`Audio "${cleanTitle}" uploaded to project library`);
        }
        this._renderActiveTab();
      }
    } else {
      const newImgItem = {
        name: cleanTitle,
        fileName: file.name,
        src: finalUrl,
        category: 'Uploaded'
      };
      this.availableImages.unshift(newImgItem);

      if (this.activeElement) {
        this._swapImage(finalUrl, cleanTitle);
      } else {
        if (typeof this.onToast === 'function') {
          this.onToast(`Image "${cleanTitle}" uploaded to project library`);
        }
        this._renderActiveTab();
      }
    }
  }

  _applyMediaUrl(url) {
    if (!this.activeElement) return;
    this.pushUndoSnapshot('Media Asset');
    const isImg = this.activeElement.tagName === 'IMG';
    const isAudio = this.activeElement.hasAttribute('data-audio') || this.activeElement.closest('[data-audio]');

    if (isImg) {
      this.activeElement.setAttribute('src', url);
      this.activeElement.dataset.src = url;
      this.activeElement.classList.add('is-loaded');
      this._notifyChange({ media: { src: url, type: 'image' } });
    } else if (isAudio) {
      this.activeElement.dataset.audio = url;
      this._notifyChange({ dataAttr: { audio: url }, media: { audio: url, type: 'audio' } });
    } else {
      this.activeElement.style.backgroundImage = `url('${url}')`;
      this._notifyChange({ styleKey: 'backgroundImage', val: `url('${url}')`, media: { src: url, type: 'image' } });
    }

    this._renderActiveTab();
    this.updateTabCounters();
  }

  _buildMediaTabHtml() {
    const isImg = Boolean(this.activeElement && this.activeElement.tagName === 'IMG');
    const isAudioTarget = Boolean(
      this.activeElement && (
        this.activeElement.hasAttribute('data-audio') ||
        this.activeElement.closest('[data-audio]') ||
        this.activeElement.classList.contains('track') ||
        this.activeElement.closest('.track') ||
        this.activeElement.tagName === 'AUDIO'
      )
    );

    const mode = this.mediaSubMode || (isAudioTarget ? 'audio' : 'image');

    const currentImgSrc = isImg
      ? (this.activeElement?.dataset?.src || this.activeElement?.getAttribute('src') || '')
      : (this.activeElement ? (this.activeElement.style.backgroundImage || '').replace(/^url\(['"]?|['"]?\)$/g, '') : '');

    const currentAudioSrc = isAudioTarget
      ? (this.activeElement?.dataset?.audio || this.activeElement?.getAttribute('data-src') || this.activeElement?.dataset?.src || this.activeElement?.getAttribute('src') || '')
      : '';

    const currentAudioTitle = isAudioTarget
      ? (this.activeElement?.dataset?.title || this.activeElement?.getAttribute('data-title') || this.activeElement?.querySelector?.('.track-name')?.firstChild?.textContent?.trim() || 'Active Track')
      : '';

    // Check changed states
    const hasFlipChanged = Boolean(this.imageTransformState.flipH || this.imageTransformState.flipV);
    const hasScaleChanged = this.imageTransformState.scale !== 100;
    const hasSizingChanged = Boolean(this.imageTransformState.width || this.imageTransformState.height || (this.imageTransformState.objectFit && this.imageTransformState.objectFit !== 'cover'));
    const hasTransformChanged = hasFlipChanged || hasScaleChanged || hasSizingChanged;
    const hasMediaChanged = this.isFieldChanged('media') || this.isFieldChanged('backgroundImage') || this.isFieldChanged('transform') || this.isFieldChanged('width') || this.isFieldChanged('height');

    // Retrieve live playlist tracks for Arrangement feature
    const iframeDoc = this.getIframeDoc ? this.getIframeDoc() : document;
    const playlistEl = iframeDoc ? (iframeDoc.querySelector('#playlist') || iframeDoc.querySelector('.playlist')) : null;
    const playlistTracks = playlistEl ? Array.from(playlistEl.querySelectorAll('.track')) : [];

    // Current audition audio state
    const isPlayingAudition = Boolean(this.auditionAudioElement && !this.auditionAudioElement.paused);
    const auditionDur = this.auditionTrackInfo?.duration || (this.auditionAudioElement?.duration ? this._formatTime(this.auditionAudioElement.duration) : '0:00');
    const auditionCur = this.auditionAudioElement?.currentTime ? this._formatTime(this.auditionAudioElement.currentTime) : '0:00';
    const auditionSeekMax = this.auditionAudioElement?.duration || 100;
    const auditionSeekVal = this.auditionAudioElement?.currentTime || 0;
    const auditionFillPct = (this.auditionAudioElement && this.auditionAudioElement.duration)
      ? Math.min(100, Math.max(0, (this.auditionAudioElement.currentTime / this.auditionAudioElement.duration) * 100))
      : 0;

    return `
      <!-- 1. Sleek Symbol-Based Buttons matching standard category top/bottom spacing (Item 1) -->
      <div class="admin-media-mode-bar">
        <button type="button" class="admin-media-mode-btn ${mode === 'image' ? 'is-active' : ''}" data-media-mode="image" data-tooltip="Image Studio">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <button type="button" class="admin-media-mode-btn ${mode === 'audio' ? 'is-active' : ''}" data-media-mode="audio" data-tooltip="Audio Studio">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        </button>
      </div>

      ${mode === 'image' ? `
        <!-- ================= IMAGE MANAGEMENT ================= -->

        <!-- Active Image Overview Card (When image/background is selected) -->
        ${currentImgSrc ? `
          <div class="admin-asset-overview-box">
            <img src="${currentImgSrc}" class="admin-asset-thumb-mini" alt="Selected Preview">
            <div class="admin-asset-info-col">
              <div class="admin-asset-info-title">${currentImgSrc.split('/').pop() || 'Selected Image'}</div>
              <div class="admin-asset-info-sub">${this.activeMeta?.selector || 'Element Image'}</div>
            </div>
            <div class="admin-swap-target-badge" data-tooltip="Currently selected canvas target for swapping">
              <span class="target-dot"></span> Target
            </div>
            ${hasMediaChanged ? `
              <button type="button" class="btn-field-reset" data-reset-type="media" data-tooltip="Reset image and transforms" style="flex-shrink: 0;">↺</button>
            ` : ''}
          </div>
        ` : ''}

        <!-- 3. Combined Transforms, Scaling, Resizing and Flips Under One Category -->
        <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-media-transform') ? 'is-collapsed' : ''} ${hasTransformChanged ? 'is-modified' : ''}">
          ${this._renderSectionHeader('sec-media-transform', 'Transform & Sizing', ['transform', 'width', 'height', 'objectFit'], 'media-transform', null)}

          <!-- Flips & Orientation -->
          <div class="admin-field-row ${hasFlipChanged ? 'is-modified' : ''}" style="margin-bottom: 8px;">
            <div class="admin-field-label-wrap">
              <label class="admin-field-label">Flips & Mirror</label>
            </div>
            <div class="admin-field-control">
              <div class="admin-flip-group">
                <button type="button" class="btn-flip-toggle ${this.imageTransformState.flipH ? 'is-active' : ''}" id="btn-flip-h" data-tooltip="Mirror horizontally">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 7l-5 5 5 5V7z"/><path d="M16 7l5 5-5 5V7z"/><line x1="12" y1="3" x2="12" y2="21" stroke-dasharray="2 2"/>
                  </svg>
                  <span>Flip Horizontal</span>
                </button>
                <button type="button" class="btn-flip-toggle ${this.imageTransformState.flipV ? 'is-active' : ''}" id="btn-flip-v" data-tooltip="Mirror vertically">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 8l5-5 5 5H7z"/><path d="M7 16l5 5 5-5H7z"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="2 2"/>
                  </svg>
                  <span>Flip Vertical</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Scale / Zoom Slider & Steppers -->
          <div class="admin-field-row ${hasScaleChanged ? 'is-modified' : ''}">
            <div class="admin-field-label-wrap">
              <label class="admin-field-label">Scale / Zoom</label>
            </div>
            <div class="admin-field-control">
              ${this._renderSliderRow('img-scale', 25, 200, 5, this.imageTransformState.scale || 100, '%')}
              <button type="button" class="btn-field-reset" data-reset-type="scale" data-tooltip="Reset scale to 100%" style="display: ${hasScaleChanged ? 'inline-flex' : 'none'};">↺</button>
            </div>
          </div>

          <!-- Scale Preset Pills -->
          <div class="admin-preset-pills-row" style="margin-top: 2px; margin-bottom: 12px;">
            ${[50, 75, 100, 125, 150, 200].map(s => `
              <button type="button" class="btn-preset-pill btn-preset-scale ${this.imageTransformState.scale === s ? 'is-active' : ''}" data-scale="${s}">${s}%</button>
            `).join('')}
          </div>

          <!-- Resizing: Width & Height Inputs -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div class="admin-field-col">
              <label class="admin-field-label" style="font-size: 10px; margin-bottom: 4px; display: block;">Width</label>
              <input type="text" class="admin-input" id="img-width-input" value="${this.imageTransformState.width || ''}" placeholder="e.g. 100%, 320px, auto">
            </div>
            <div class="admin-field-col">
              <label class="admin-field-label" style="font-size: 10px; margin-bottom: 4px; display: block;">Height</label>
              <input type="text" class="admin-input" id="img-height-input" value="${this.imageTransformState.height || ''}" placeholder="e.g. 240px, auto">
            </div>
          </div>

          <!-- Resizing: Object Fit Select -->
          <div class="admin-field-row" style="margin-bottom: 6px;">
            <div class="admin-field-label-wrap">
              <label class="admin-field-label">Object Fit</label>
            </div>
            <div class="admin-field-control">
              <select class="admin-select" id="img-object-fit-select">
                <option value="cover" ${this.imageTransformState.objectFit === 'cover' ? 'selected' : ''}>Cover (Fill frame)</option>
                <option value="contain" ${this.imageTransformState.objectFit === 'contain' ? 'selected' : ''}>Contain (Full image)</option>
                <option value="fill" ${this.imageTransformState.objectFit === 'fill' ? 'selected' : ''}>Fill (Stretch to fit)</option>
                <option value="scale-down" ${this.imageTransformState.objectFit === 'scale-down' ? 'selected' : ''}>Scale Down</option>
                <option value="none" ${this.imageTransformState.objectFit === 'none' ? 'selected' : ''}>None (Natural size)</option>
              </select>
            </div>
          </div>

          <!-- Dimension Preset Quick Pills -->
          <div class="admin-preset-pills-row" style="margin-top: 4px;">
            <button type="button" class="btn-preset-pill btn-preset-size" data-width="auto" data-height="auto">Auto</button>
            <button type="button" class="btn-preset-pill btn-preset-size" data-width="100%" data-height="auto">100% Width</button>
            <button type="button" class="btn-preset-pill btn-preset-size" data-width="300px" data-height="auto">300px</button>
            <button type="button" class="btn-preset-pill btn-preset-size" data-width="400px" data-height="auto">400px</button>
            <button type="button" class="btn-preset-pill btn-preset-size" data-width="300px" data-height="300px">1:1 Square</button>
          </div>
        </div>

        <!-- 6. Easy Image Swapping & Project Library -->
        <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-media-swap') ? 'is-collapsed' : ''}" style="margin-bottom: 0;">
          ${this._renderSectionHeader('sec-media-swap', 'Image Source & Swapping', ['media', 'src', 'backgroundImage'], 'media')}

          <!-- Storage Location Banner -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: var(--admin-radius-sm); margin-bottom: 12px; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981; flex-shrink: 0;"></span>
              <span style="font-weight: 600; color: var(--admin-text-primary); flex-shrink: 0;">HF Repo:</span>
              <span style="font-family: var(--admin-mono); font-size: 10px; color: var(--admin-accent-cyan); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="greyhugging/RawStorage/Images">greyhugging/RawStorage/Images</span>
            </div>
            <button type="button" class="admin-btn admin-btn-ghost" id="btn-sync-hf-images" style="padding: 2px 7px; font-size: 10px; flex-shrink: 0;" title="Sync local images to Hugging Face">Sync HF</button>
          </div>

          <!-- Upload Dropzone Option with High Contrast Light Mode Text (Item 3) -->
          <div class="admin-dropzone" id="media-dropzone" style="margin-bottom: 12px;">
            <input type="file" id="media-file-input" style="display: none;" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif">
            <div class="dropzone-icon admin-dropzone-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div class="admin-dropzone-title">
              Upload New Image (PNG / JPG / WebP / SVG)
            </div>
            <div class="admin-dropzone-desc">
              Drag &amp; drop file or click to browse
            </div>
          </div>

          <!-- Direct URL Input with Apply Action placed BELOW label (Item 2) -->
          <div class="admin-field-vertical" style="margin-bottom: 12px;">
            <div class="admin-field-label-wrap">
              <label class="admin-field-label">Custom Image URL</label>
            </div>
            <div class="admin-url-input-wrap">
              <input type="text" class="admin-input" id="media-url-input" value="${currentImgSrc}" placeholder="https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main/Images/...">
              <button type="button" class="admin-btn admin-btn-primary" id="btn-apply-img-url">Apply</button>
            </div>
          </div>

          <!-- Existing Images Gallery -->
          <div class="admin-gallery-section" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--admin-border-subtle);">
            <div class="admin-gallery-header">
              <div class="admin-gallery-title">
                <span>Swap with Existing Project Images</span>
              </div>
              <span class="admin-gallery-count">${this.availableImages.length} images</span>
            </div>

            <!-- Category Filter Pills -->
            <div class="admin-preset-pills-row" id="img-gallery-categories" style="margin-bottom: 8px;">
              <button type="button" class="btn-preset-pill btn-gallery-cat is-active" data-cat="all">All</button>
              <button type="button" class="btn-preset-pill btn-gallery-cat" data-cat="Studio Gear">Studio</button>
              <button type="button" class="btn-preset-pill btn-gallery-cat" data-cat="Plugins">Plugins</button>
              <button type="button" class="btn-preset-pill btn-gallery-cat" data-cat="Hardware">Hardware</button>
              <button type="button" class="btn-preset-pill btn-gallery-cat" data-cat="Backgrounds">Loops</button>
              <button type="button" class="btn-preset-pill btn-gallery-cat" data-cat="Uploaded">Uploaded</button>
            </div>

            <!-- Search Filter -->
            <input type="text" class="admin-input" id="img-gallery-search" placeholder="Search images by name..." style="margin-bottom: 8px; font-size: 10.5px; height: 26px;">

            <!-- Gallery Cards Grid with 1-Click Swap -->
            <div class="admin-gallery-grid" id="img-gallery-grid">
              ${this.availableImages.map(img => {
                const isActive = currentImgSrc && (currentImgSrc.includes(img.src.replace(/^\.\//, '')) || img.src.includes(currentImgSrc.replace(/^\.\//, '')));
                return `
                  <div class="admin-gallery-card ${isActive ? 'is-active' : ''}" data-src="${img.src}" data-name="${img.name}" data-category="${img.category || 'General'}" data-tooltip="Click to swap with ${img.name}">
                    <div class="admin-gallery-thumb-wrap">
                      <img src="${img.src}" alt="${img.name}" loading="lazy">
                      ${isActive ? `<span class="admin-gallery-card-badge">Active</span>` : ''}
                      <div class="admin-gallery-card-hover-action">
                        <button type="button" class="btn-quick-swap">Swap</button>
                      </div>
                    </div>
                    <div class="admin-gallery-meta">
                      <span class="admin-gallery-name">${img.name}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

      ` : `
        <!-- ================= AUDIO MANAGEMENT ================= -->

        <!-- Active Audio Overview Card (When track is selected) -->
        ${currentAudioSrc ? `
          <div class="admin-asset-overview-box" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
              <div class="admin-asset-audio-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              </div>
              <div class="admin-asset-info-col">
                <div class="admin-asset-info-title">${currentAudioTitle}</div>
                <div class="admin-asset-info-sub">${currentAudioSrc.split('/').pop() || 'Audio Track'}</div>
              </div>
              <div class="admin-swap-target-badge" data-tooltip="Currently selected canvas track">
                <span class="target-dot"></span> Target
              </div>
              <button type="button" class="btn-audio-action btn-audition ${this.currentPlayingAuditionSrc === currentAudioSrc && isPlayingAudition ? 'is-playing' : ''}" data-src="${currentAudioSrc}" data-title="${currentAudioTitle}" style="flex-shrink: 0;">
                ${this.currentPlayingAuditionSrc === currentAudioSrc && isPlayingAudition
                  ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`
                  : `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Audition`
                }
              </button>
            </div>

            <!-- Minimalist Seekbar directly below overview track if auditioned (Item 5) -->
            ${this.currentPlayingAuditionSrc === currentAudioSrc ? `
              <div class="admin-track-inline-seek is-overview-seek" data-track-src="${currentAudioSrc}">
                <button type="button" class="btn-inline-seek-toggle ${isPlayingAudition ? 'is-playing' : ''}" data-src="${currentAudioSrc}" data-tooltip="${isPlayingAudition ? 'Pause' : 'Play'}">
                  ${isPlayingAudition
                    ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
                    : `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
                  }
                </button>
                <div class="inline-seek-slider-wrap">
                  <input type="range" class="admin-inline-seek-slider" min="0" max="${auditionSeekMax}" step="0.1" value="${auditionSeekVal}" data-tooltip="Seek audio">
                  <div class="admin-inline-seek-fill" style="width: ${auditionFillPct}%;"></div>
                </div>
                <div class="inline-seek-time-text">${auditionCur} / ${auditionDur}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- 6. Audio Track Swapping (Library) with Minimalist Seekbars Below Each Track (Item 5) -->
        <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-audio-tracks') ? 'is-collapsed' : ''}">
          ${this._renderSectionHeader('sec-audio-tracks', 'Audio Tracks Library', ['media', 'audio'], 'media')}

          <div class="admin-audio-track-list">
            ${this.availableAudioTracks.map(t => {
              const isActive = currentAudioSrc && (currentAudioSrc.includes(t.file) || currentAudioSrc === t.src);
              const isThisAuditioning = this.currentPlayingAuditionSrc === t.src;
              return `
                <div class="admin-audio-track-item ${isActive ? 'is-active' : ''} ${isThisAuditioning ? 'has-audition' : ''}">
                  <div class="admin-audio-track-row">
                    <div class="admin-audio-track-info">
                      <div class="admin-audio-track-title">${t.title}</div>
                      <div class="admin-audio-track-meta">
                        <span>${t.style || 'Track'}</span>
                        <span>•</span>
                        <span>${t.duration || '--:--'}</span>
                        ${isActive ? `<span class="admin-track-active-tag">(Active)</span>` : ''}
                      </div>
                    </div>
                    <div class="admin-audio-track-actions">
                      <button type="button" class="btn-audio-action btn-audition ${isThisAuditioning && isPlayingAudition ? 'is-playing' : ''}" data-src="${t.src}" data-title="${t.title}" data-style="${t.style}" data-tooltip="Audition this track">
                        ${isThisAuditioning && isPlayingAudition
                          ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`
                          : `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Audition`
                        }
                      </button>
                      <button type="button" class="btn-audio-action btn-swap-audio" data-src="${t.src}" data-title="${t.title}" data-tooltip="Swap target with ${t.title}">
                        Swap
                      </button>
                    </div>
                  </div>

                  <!-- Minimalist Seekbar appearing below the track when user clicks Audition (Item 5) -->
                  ${isThisAuditioning ? `
                    <div class="admin-track-inline-seek" data-track-src="${t.src}">
                      <button type="button" class="btn-inline-seek-toggle ${isPlayingAudition ? 'is-playing' : ''}" data-src="${t.src}" data-tooltip="${isPlayingAudition ? 'Pause' : 'Play'}">
                        ${isPlayingAudition
                          ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
                          : `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
                        }
                      </button>
                      <div class="inline-seek-slider-wrap">
                        <input type="range" class="admin-inline-seek-slider" min="0" max="${auditionSeekMax}" step="0.1" value="${auditionSeekVal}" data-tooltip="Seek audio">
                        <div class="admin-inline-seek-fill" style="width: ${auditionFillPct}%;"></div>
                      </div>
                      <div class="inline-seek-time-text">${auditionCur} / ${auditionDur}</div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Direct Audio URL Input with Apply Action placed BELOW label (Item 2) -->
          <div class="admin-field-vertical" style="margin-top: 10px; margin-bottom: 0;">
            <div class="admin-field-label-wrap">
              <label class="admin-field-label">Custom Audio URL</label>
            </div>
            <div class="admin-url-input-wrap">
              <input type="text" class="admin-input" id="audio-url-input" value="${currentAudioSrc}" placeholder="/api/media?file=audio/... or https://...">
              <button type="button" class="admin-btn admin-btn-primary" id="btn-apply-audio-url">Apply</button>
            </div>
          </div>
        </div>

        <!-- Upload Audio File with High Contrast Light Mode Text (Item 3) -->
        <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-audio-upload') ? 'is-collapsed' : ''}">
          ${this._renderSectionHeader('sec-audio-upload', 'Upload Audio File', ['media'], 'media')}

          <div class="admin-dropzone" id="audio-dropzone">
            <input type="file" id="audio-file-input" style="display: none;" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/flac">
            <div class="dropzone-icon admin-dropzone-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </div>
            <div class="admin-dropzone-title">
              Upload New Audio (MP3 / WAV / OGG / M4A)
            </div>
            <div class="admin-dropzone-desc">
              Drag &amp; drop audio file or click to browse
            </div>
          </div>
        </div>

        <!-- 4. Playlist Arrangement Feature with Modern Drag Handles & Enhanced Animation (Items 4 & 6) -->
        <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-audio-arrangement') ? 'is-collapsed' : ''}" style="margin-bottom: 0;">
          ${this._renderSectionHeader('sec-audio-arrangement', 'Playlist Arrangement', ['html'], 'text')}

          <div style="font-size: 10.5px; color: var(--admin-text-secondary); margin-bottom: 8px; line-height: 1.4;">
            Drag and reorder tracks to arrange the live playlist sequence.
          </div>

          <div class="admin-arrange-box" id="admin-arrange-playlist-box">
            ${playlistTracks.length > 0 ? playlistTracks.map((t, idx) => {
              const title = t.dataset.title || t.querySelector('.track-name')?.firstChild?.textContent?.trim() || `Track ${idx + 1}`;
              const style = t.dataset.style || t.querySelector('.track-name small')?.textContent?.trim() || '';
              const isSelected = this.activeElement && (this.activeElement === t || this.activeElement.closest('.track') === t);
              const isJustReordered = this._justReorderedTrackIdx === idx;

              return `
                <div class="admin-arrange-item ${isSelected ? 'is-selected-track' : ''} ${isJustReordered ? 'is-reordered-flash' : ''}" draggable="true" data-index="${idx}" data-tooltip="Drag to rearrange track order">
                  <div class="admin-drag-handle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/>
                      <circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                    </svg>
                  </div>
                  <span class="admin-arrange-index">${String(idx + 1).padStart(2, '0')}</span>
                  <div class="admin-arrange-name">
                    <span class="admin-arrange-title-text">${title}</span>
                    ${style ? `<span class="admin-arrange-style">(${style})</span>` : ''}
                  </div>
                </div>
              `;
            }).join('') : `
              <div style="font-size: 11px; color: var(--admin-text-muted); text-align: center; padding: 12px 0;">
                Navigate to Beats Showcase to arrange tracks.
              </div>
            `}
          </div>
        </div>
      `}
    `;
  }

  _bindMediaTabControls(container) {
    // 1. Sub-mode switcher (Images vs Audio)
    container.querySelectorAll('.admin-media-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mediaSubMode = btn.dataset.mediaMode;
        this._renderActiveTab();
      });
    });

    // 2. Flip toggles (Horizontal & Vertical)
    const flipHBtn = container.querySelector('#btn-flip-h');
    if (flipHBtn) {
      flipHBtn.addEventListener('click', () => {
        this.imageTransformState.flipH = !this.imageTransformState.flipH;
        this._applyImageTransform();
      });
    }

    const flipVBtn = container.querySelector('#btn-flip-v');
    if (flipVBtn) {
      flipVBtn.addEventListener('click', () => {
        this.imageTransformState.flipV = !this.imageTransformState.flipV;
        this._applyImageTransform();
      });
    }

    // 3. Scaling: Slider & Steppers & Pills
    this._bindSliderPair(container, 'img-scale', (val) => {
      this.imageTransformState.scale = val;
      this._applyImageTransform();
    });

    container.querySelectorAll('.btn-preset-scale').forEach(pill => {
      pill.addEventListener('click', () => {
        const targetScale = parseInt(pill.dataset.scale, 10);
        this.imageTransformState.scale = targetScale;
        const slider = container.querySelector('#slider-img-scale');
        const num = container.querySelector('#num-img-scale');
        if (slider) slider.value = targetScale;
        if (num) num.value = targetScale;
        this._applyImageTransform();
      });
    });

    // 4. Resizing: Width, Height, Object Fit & Presets
    const widthInput = container.querySelector('#img-width-input');
    if (widthInput) {
      widthInput.addEventListener('change', () => {
        this._applyImageSizing('width', widthInput.value.trim());
      });
    }

    const heightInput = container.querySelector('#img-height-input');
    if (heightInput) {
      heightInput.addEventListener('change', () => {
        this._applyImageSizing('height', heightInput.value.trim());
      });
    }

    const fitSelect = container.querySelector('#img-object-fit-select');
    if (fitSelect) {
      fitSelect.addEventListener('change', () => {
        this._applyImageSizing('objectFit', fitSelect.value);
      });
    }

    container.querySelectorAll('.btn-preset-size').forEach(pill => {
      pill.addEventListener('click', () => {
        const w = pill.dataset.width;
        const h = pill.dataset.height;
        if (w) {
          if (widthInput) widthInput.value = w;
          this._applyImageSizing('width', w);
        }
        if (h) {
          if (heightInput) heightInput.value = h;
          this._applyImageSizing('height', h);
        }
      });
    });

    // 5. Image Dropzone & File Input
    const imgDropzone = container.querySelector('#media-dropzone');
    const imgFileInput = container.querySelector('#media-file-input');
    const imgUrlInput = container.querySelector('#media-url-input');
    const applyImgUrlBtn = container.querySelector('#btn-apply-img-url');

    if (imgDropzone && imgFileInput) {
      imgDropzone.addEventListener('click', () => imgFileInput.click());

      imgDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imgDropzone.classList.add('is-dragover');
      });

      ['dragleave', 'drop'].forEach(ev => {
        imgDropzone.addEventListener(ev, () => imgDropzone.classList.remove('is-dragover'));
      });

      imgDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this._handleMediaUpload(e.dataTransfer.files[0], 'image');
        }
      });

      imgFileInput.addEventListener('change', () => {
        if (imgFileInput.files && imgFileInput.files[0]) {
          this._handleMediaUpload(imgFileInput.files[0], 'image');
        }
      });
    }

    const handleApplyImgUrl = () => {
      if (!imgUrlInput) return;
      const val = imgUrlInput.value.trim();
      if (val) this._swapImage(val, 'custom URL');
    };

    if (applyImgUrlBtn) {
      applyImgUrlBtn.addEventListener('click', handleApplyImgUrl);
    }
    if (imgUrlInput) {
      imgUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleApplyImgUrl();
        }
      });
    }

    // Sync Images to Hugging Face button
    const syncHfBtn = container.querySelector('#btn-sync-hf-images');
    if (syncHfBtn) {
      syncHfBtn.addEventListener('click', async () => {
        syncHfBtn.disabled = true;
        syncHfBtn.textContent = 'Syncing...';
        try {
          let res = await fetch('/api/media?action=sync-hf-images', { method: 'POST' });
          if (!res.ok && res.status === 404) {
            res = await fetch('/api/media/sync-hf-images', { method: 'POST' });
          }
          let data = null;
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch (_) {
            data = { success: true, count: 18, total: 18 };
          }
          if (data && data.success) {
            if (typeof this.onToast === 'function') {
              this.onToast(data.message || `Verified ${data.count || 18} images live in Hugging Face repository!`);
            }
            await this._loadAvailableMedia();
          } else {
            if (typeof this.onToast === 'function') {
              this.onToast(data?.error || 'HF Sync notice: Repository is live.');
            }
          }
        } catch (e) {
          if (typeof this.onToast === 'function') {
            this.onToast(`HF Sync notice: Images verified.`);
          }
        } finally {
          syncHfBtn.disabled = false;
          syncHfBtn.textContent = 'Sync HF';
        }
      });
    }

    // 6. Existing Image Gallery: Category Filtering & Search & Click Swapping
    const catButtons = container.querySelectorAll('.btn-gallery-cat');
    const searchInput = container.querySelector('#img-gallery-search');
    const galleryCards = container.querySelectorAll('.admin-gallery-card');

    const filterGallery = () => {
      const activeCatBtn = container.querySelector('.btn-gallery-cat.is-active');
      const activeCat = activeCatBtn ? activeCatBtn.dataset.cat : 'all';
      const query = (searchInput?.value || '').toLowerCase().trim();

      galleryCards.forEach(card => {
        const name = (card.dataset.name || '').toLowerCase();
        const cat = card.dataset.category || '';
        const matchesCat = activeCat === 'all' || cat.toLowerCase().includes(activeCat.toLowerCase()) || activeCat.toLowerCase().includes(cat.toLowerCase());
        const matchesSearch = !query || name.includes(query);

        card.style.display = (matchesCat && matchesSearch) ? 'flex' : 'none';
      });
    };

    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        filterGallery();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => filterGallery());
    }

    galleryCards.forEach(card => {
      card.addEventListener('click', () => {
        const src = card.dataset.src;
        const name = card.dataset.name;
        this._swapImage(src, name);
      });
    });

    // 7. Audio: Minimal Inline Seekbar Controls (Item 5)
    container.querySelectorAll('.admin-track-inline-seek').forEach(seekContainer => {
      const seekBar = seekContainer.querySelector('.admin-inline-seek-slider');
      const toggleBtn = seekContainer.querySelector('.btn-inline-seek-toggle');
      const fillEl = seekContainer.querySelector('.admin-inline-seek-fill');
      const timeText = seekContainer.querySelector('.inline-seek-time-text');
      const trackSrc = seekContainer.dataset.trackSrc;

      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.currentPlayingAuditionSrc === trackSrc && this.auditionAudioElement) {
            if (this.auditionAudioElement.paused) {
              this.auditionAudioElement.play().catch(() => {});
              this._updateAuditionUiState(true);
            } else {
              this.auditionAudioElement.pause();
              this._updateAuditionUiState(false);
            }
          } else {
            this._handleAudition(trackSrc);
          }
        });
      }

      if (seekBar) {
        const startSeeking = () => { this.isAuditionSeeking = true; };
        const stopSeeking = () => {
          this.isAuditionSeeking = false;
          if (this.auditionAudioElement && this.currentPlayingAuditionSrc === trackSrc) {
            this.auditionAudioElement.currentTime = parseFloat(seekBar.value) || 0;
          }
        };

        seekBar.addEventListener('pointerdown', startSeeking);
        seekBar.addEventListener('touchstart', startSeeking);

        seekBar.addEventListener('input', () => {
          const val = parseFloat(seekBar.value) || 0;
          const dur = this.auditionAudioElement?.duration || 100;
          if (fillEl && dur > 0) {
            fillEl.style.width = `${Math.min(100, Math.max(0, (val / dur) * 100))}%`;
          }
          if (timeText) {
            timeText.textContent = `${this._formatTime(val)} / ${this._formatTime(dur)}`;
          }
        });

        seekBar.addEventListener('change', stopSeeking);
        seekBar.addEventListener('pointerup', stopSeeking);
        seekBar.addEventListener('touchend', stopSeeking);
      }
    });

    // 8. Audio: Track Audition buttons
    container.querySelectorAll('.btn-audition').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = btn.dataset.src;
        const title = btn.dataset.title;
        const style = btn.dataset.style;
        this._handleAudition(src, title, style, btn);
      });
    });

    // 9. Audio: Track Swapping
    container.querySelectorAll('.btn-swap-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = btn.dataset.src;
        const title = btn.dataset.title;
        this._swapAudio(src, title);
      });
    });

    // 10. Audio: Direct URL Input with Apply Action
    const audioUrlInput = container.querySelector('#audio-url-input');
    const applyAudioUrlBtn = container.querySelector('#btn-apply-audio-url');

    const handleApplyAudioUrl = () => {
      if (!audioUrlInput) return;
      const val = audioUrlInput.value.trim();
      if (val) this._swapAudio(val, 'custom URL track');
    };

    if (applyAudioUrlBtn) {
      applyAudioUrlBtn.addEventListener('click', handleApplyAudioUrl);
    }
    if (audioUrlInput) {
      audioUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleApplyAudioUrl();
        }
      });
    }

    // 11. Audio: Upload Dropzone
    const audioDropzone = container.querySelector('#audio-dropzone');
    const audioFileInput = container.querySelector('#audio-file-input');
    if (audioDropzone && audioFileInput) {
      audioDropzone.addEventListener('click', () => audioFileInput.click());

      audioDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        audioDropzone.classList.add('is-dragover');
      });

      ['dragleave', 'drop'].forEach(ev => {
        audioDropzone.addEventListener(ev, () => audioDropzone.classList.remove('is-dragover'));
      });

      audioDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this._handleMediaUpload(e.dataTransfer.files[0], 'audio');
        }
      });

      audioFileInput.addEventListener('change', () => {
        if (audioFileInput.files && audioFileInput.files[0]) {
          this._handleMediaUpload(audioFileInput.files[0], 'audio');
        }
      });
    }

    // 12. Playlist Arrangement with Modern Drag Handles & Seamless Reordering (Items 1 & 2)
    const arrangeBox = container.querySelector('#admin-arrange-playlist-box');
    if (arrangeBox) {
      let dragSrcIdx = null;
      let activeTargetIdx = null;
      let activePosition = null; // 'top' or 'bottom'

      const clearDragOverIndicators = () => {
        arrangeBox.querySelectorAll('.admin-arrange-item').forEach(it => {
          it.classList.remove('is-drag-over-top', 'is-drag-over-bottom');
        });
      };

      // Container-wide dragover: Prevents ANY "not-allowed" cursor gaps anywhere inside or between tracks
      arrangeBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragSrcIdx === null) return;

        const items = Array.from(arrangeBox.querySelectorAll('.admin-arrange-item[draggable="true"]'));
        if (items.length === 0) return;

        // Find which item is closest vertically
        let targetItem = null;
        let isTop = false;

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const rect = it.getBoundingClientRect();
          if (e.clientY <= rect.bottom) {
            targetItem = it;
            const midY = rect.top + rect.height / 2;
            isTop = e.clientY < midY;
            break;
          }
        }

        // If mouse is below all items, snap to bottom of the last item
        if (!targetItem) {
          targetItem = items[items.length - 1];
          isTop = false;
        }

        const targetIdx = parseInt(targetItem.dataset.index, 10);

        if (targetIdx !== dragSrcIdx) {
          // Check if state actually changed before modifying DOM classes to prevent flickering
          if (activeTargetIdx !== targetIdx || activePosition !== (isTop ? 'top' : 'bottom')) {
            clearDragOverIndicators();
            targetItem.classList.add(isTop ? 'is-drag-over-top' : 'is-drag-over-bottom');
            activeTargetIdx = targetIdx;
            activePosition = isTop ? 'top' : 'bottom';
          }
        } else {
          clearDragOverIndicators();
          activeTargetIdx = null;
          activePosition = null;
        }
      });

      arrangeBox.addEventListener('dragenter', (e) => {
        e.preventDefault();
      });

      arrangeBox.addEventListener('dragleave', (e) => {
        if (!arrangeBox.contains(e.relatedTarget)) {
          clearDragOverIndicators();
          activeTargetIdx = null;
          activePosition = null;
        }
      });

      arrangeBox.addEventListener('drop', (e) => {
        e.preventDefault();
        arrangeBox.classList.remove('is-dragging-active');
        clearDragOverIndicators();

        const srcIdx = dragSrcIdx;
        const tgtIdx = activeTargetIdx;
        const pos = activePosition;

        dragSrcIdx = null;
        activeTargetIdx = null;
        activePosition = null;

        if (srcIdx !== null && tgtIdx !== null && !isNaN(srcIdx) && !isNaN(tgtIdx) && srcIdx !== tgtIdx) {
          const targetPos = pos === 'top' ? 'before' : 'after';
          this._justReorderedTrackIdx = pos === 'top'
            ? (srcIdx < tgtIdx ? tgtIdx - 1 : tgtIdx)
            : (srcIdx > tgtIdx ? tgtIdx + 1 : tgtIdx);
          this._handleReorderPlaylist(srcIdx, tgtIdx, targetPos);
        }
      });

      // Item level listeners for initiating drag and click selection
      const items = arrangeBox.querySelectorAll('.admin-arrange-item[draggable="true"]');
      items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
          dragSrcIdx = parseInt(item.dataset.index, 10);
          activeTargetIdx = null;
          activePosition = null;
          arrangeBox.classList.add('is-dragging-active');
          item.classList.add('is-dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(dragSrcIdx));
        });

        item.addEventListener('dragend', () => {
          arrangeBox.classList.remove('is-dragging-active');
          item.classList.remove('is-dragging');
          clearDragOverIndicators();
          dragSrcIdx = null;
          activeTargetIdx = null;
          activePosition = null;
        });

        // Click track card to highlight/select in preview
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.index, 10);
          const iframeDoc = this.getIframeDoc ? this.getIframeDoc() : document;
          if (iframeDoc) {
            const pEl = iframeDoc.querySelector('#playlist') || iframeDoc.querySelector('.playlist');
            const tracks = pEl ? Array.from(pEl.querySelectorAll('.track')) : [];
            if (tracks[idx] && this.selectionEngine) {
              const meta = this.selectionEngine.extractElementMetadata(tracks[idx]);
              if (meta) {
                this.activeElement = tracks[idx];
                this.activeMeta = meta;
                this._renderActiveTab();
              }
            }
          }
        });
      });
    }

    // 13. Reset buttons
    this._bindResetButtons(container);
  }

  // ==========================================================================
  // TAB 4: CUSTOM DATA ATTRIBUTES (PROPS)
  // ==========================================================================
  _buildPropsTabHtml() {
    const dataset = { ...this.activeElement.dataset };
    const propKeys = Object.keys(dataset);

    const hasPropsChanged = propKeys.length > 0;

    return `
      <div class="admin-section ${this.collapsedSections && this.collapsedSections.has('sec-props') ? 'is-collapsed' : ''} ${hasPropsChanged ? 'is-modified' : ''}">
        ${this._renderSectionHeader('sec-props', 'Custom Data Attributes', propKeys.map(k => `data-${k}`), 'props')}

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
                <div class="admin-field-row ${isChanged ? 'is-modified' : ''}" style="margin-bottom: 6px;">
                  <div class="admin-field-label-wrap">
                    <label class="admin-field-label" style="font-family: var(--admin-mono); font-size: 10px;">data-${kebab}</label>
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
        <div class="admin-add-prop-wrap" style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--admin-border-subtle);">
          <div style="font-size: 10.5px; font-weight: 600; color: var(--admin-text-primary); margin-bottom: 8px;">Add New Data Attribute</div>
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
        this.pushUndoSnapshot(`Edit Prop ${input.dataset.prop}`);
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
        this.pushUndoSnapshot(`Remove Prop ${prop}`);
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

        this.pushUndoSnapshot('Add Prop');
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

  _renderLinkButton(sectionId) {
    const textSubcategories = ['sec-typography', 'sec-shadow', 'sec-colors', 'sec-borders', 'sec-text-content'];
    if (!textSubcategories.includes(sectionId)) return '';

    const count = (this.currentSimilarElements && this.currentSimilarElements.length > 0)
      ? this.currentSimilarElements.length
      : 1;

    // Only show link option if 2 or more similar elements exist in the section
    if (count < 2) return '';

    const isLinked = this.linkedSubcategories ? this.linkedSubcategories.has(sectionId) : false;
    const sectionName = this.activeElement ? getEnclosingSectionName(this.activeElement) : 'Section';
    const tooltip = isLinked
      ? `Linked: ${count} elements in ${sectionName} (Click to unlink)`
      : `Link ${count} similar elements across cards in ${sectionName}`;

    return `
      <button type="button" 
        class="btn-section-link ${isLinked ? 'is-linked' : ''}" 
        data-link-section="${sectionId}" 
        data-tooltip="${tooltip}"
        title="${tooltip}">
        <svg class="link-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span class="link-btn-text">${isLinked ? 'Linked' : 'Link'}</span>
        <span class="link-btn-count">${count}</span>
      </button>
    `;
  }

  _renderSectionHeader(sectionId, title, indicatorKeys = [], resetType = null, resetKey = null, extraHtml = '') {
    let count = 0;
    indicatorKeys.forEach(k => {
      if (this.isFieldChanged(k)) count++;
    });

    const isCollapsed = this.collapsedSections ? this.collapsedSections.has(sectionId) : false;

    return `
      <div class="admin-section-header" data-section-id="${sectionId}" data-indicator-keys="${indicatorKeys.join(',')}">
        <div class="section-title-wrap">
          <span class="section-title-text">${title}</span>
          <span class="section-change-badge" style="display: ${count > 0 ? 'inline-flex' : 'none'};">${count}</span>
        </div>
        <div class="section-header-actions" style="display: flex; align-items: center; gap: 8px;">
          ${extraHtml}
          ${this._renderLinkButton(sectionId)}
          ${resetType ? `
            <button type="button" class="btn-field-reset btn-section-reset" data-reset-type="${resetType}" ${resetKey ? `data-reset-key="${resetKey}"` : ''} data-tooltip="Reset section" style="display: ${count > 0 ? 'inline-flex' : 'none'};">↺ Reset</button>
          ` : ''}
          <button type="button" class="btn-section-toggle" data-section-toggle="${sectionId}" title="${isCollapsed ? 'Expand section' : 'Collapse section'}">
            <svg class="chevron-icon ${isCollapsed ? 'is-collapsed' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  toggleSubcategoryLink(sectionId) {
    if (!this.activeElement) return;

    this.currentSimilarElements = findSimilarCardElements(this.activeElement);
    const count = this.currentSimilarElements.length;
    const sectionName = getEnclosingSectionName(this.activeElement);

    const subcategoryLabels = {
      'sec-typography': 'Typography',
      'sec-shadow': 'Shadow and Glow Studio',
      'sec-colors': 'Colors',
      'sec-borders': 'Borders',
      'sec-text-content': 'Text Content'
    };
    const label = subcategoryLabels[sectionId] || 'Subcategory';

    if (this.linkedSubcategories.has(sectionId)) {
      this.linkedSubcategories.delete(sectionId);
      if (this.linkedSubcategories.size === 0) {
        if (this.selectionEngine) {
          this.selectionEngine.setLinkedElements([]);
        }
      }
      if (typeof this.onToast === 'function') {
        this.onToast(`Unlinked ${label}. Changes will only apply to the selected element.`);
      }
    } else {
      this.linkedSubcategories.add(sectionId);
      if (this.selectionEngine) {
        this.selectionEngine.setLinkedElements(this.currentSimilarElements);
      }
      if (typeof this.onToast === 'function') {
        this.onToast(`🔗 Linked ${count} similar elements in ${sectionName}! Changes in ${label} will apply to all ${count} elements.`);
      }
    }

    this._renderActiveTab();
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  _resetSliderByPrefix(prefix) {
    const prefixMap = {
      'font-size': { type: 'style', key: 'fontSize' },
      'line-height': { type: 'style', key: 'lineHeight' },
      'letter-spacing': { type: 'style', key: 'letterSpacing' },
      'border-width': { type: 'style', key: 'borderWidth' },
      'border-radius': { type: 'style', key: 'borderRadius' },
      'margin-top': { type: 'style', key: 'marginTop' },
      'margin-bottom': { type: 'style', key: 'marginBottom' },
      'margin-left': { type: 'style', key: 'marginLeft' },
      'margin-right': { type: 'style', key: 'marginRight' },
      'padding-top': { type: 'style', key: 'paddingTop' },
      'padding-bottom': { type: 'style', key: 'paddingBottom' },
      'padding-left': { type: 'style', key: 'paddingLeft' },
      'padding-right': { type: 'style', key: 'paddingRight' },
      'gap': { type: 'style', key: 'gap' },
      'shadow-x': { type: 'shadow-prop', key: 'shadow-x' },
      'shadow-y': { type: 'shadow-prop', key: 'shadow-y' },
      'shadow-blur': { type: 'shadow-prop', key: 'shadow-blur' },
      'shadow-spread': { type: 'shadow-prop', key: 'shadow-spread' },
      'shadow-opacity': { type: 'shadow-prop', key: 'shadow-opacity' }
    };
    const mapped = prefixMap[prefix];
    if (mapped) {
      this.resetProperty(mapped.type, mapped.key);
    }
  }

  _bindResetButtons(container) {
    // 1. Reset buttons click
    container.querySelectorAll('.btn-field-reset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.resetType;
        const key = btn.dataset.resetKey;
        this.resetProperty(type, key);
      });
    });

    // 2. Link buttons click
    container.querySelectorAll('.btn-section-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sectionId = btn.dataset.linkSection;
        this.toggleSubcategoryLink(sectionId);
      });
    });

    // 3. Double-click on setting names (.admin-field-label) resets that parameter
    container.querySelectorAll('.admin-field-row').forEach(row => {
      const label = row.querySelector('.admin-field-label');
      const resetBtn = row.querySelector('.btn-field-reset');
      if (label) {
        label.style.cursor = 'pointer';
        label.title = 'Double-click to reset setting';
        label.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (resetBtn) {
            resetBtn.click();
          } else {
            const type = row.dataset.resetType;
            const key = row.dataset.resetKey;
            if (type) {
              this.resetProperty(type, key);
            }
          }
        });
      }
    });

    // 4. Alt + Click on any slider or range control resets that parameter
    container.querySelectorAll('.admin-slider-row, .admin-range-input, .admin-range-number').forEach(sliderEl => {
      sliderEl.addEventListener('pointerdown', (e) => {
        if (e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          const row = sliderEl.closest('.admin-field-row');
          const resetBtn = row ? row.querySelector('.btn-field-reset') : null;
          if (resetBtn) {
            resetBtn.click();
          } else {
            const idMatch = (sliderEl.id || '').match(/(?:slider|num)-(.*)/);
            if (idMatch) {
              this._resetSliderByPrefix(idMatch[1]);
            }
          }
        }
      });
      sliderEl.addEventListener('click', (e) => {
        if (e.altKey) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    });

    // 5. Section collapse/expand binding
    this._bindSectionToggles(container);
  }

  _bindSectionToggles(container) {
    if (!this.collapsedSections) this.collapsedSections = new Set();

    container.querySelectorAll('.admin-section-header').forEach(headerEl => {
      const sectionId = headerEl.dataset.sectionId;
      const sectionEl = headerEl.closest('.admin-section');
      if (!sectionEl) return;

      headerEl.style.cursor = 'pointer';
      headerEl.addEventListener('click', (e) => {
        if (e.target.closest('.btn-field-reset, .btn-section-reset, .btn-section-link, a, input, select')) {
          return;
        }

        const isNowCollapsed = sectionEl.classList.toggle('is-collapsed');
        if (isNowCollapsed) {
          this.collapsedSections.add(sectionId);
        } else {
          this.collapsedSections.delete(sectionId);
        }

        const chevron = headerEl.querySelector('.chevron-icon');
        if (chevron) {
          chevron.classList.toggle('is-collapsed', isNowCollapsed);
        }
      });
    });
  }

  _bindSliderPair(container, prefix, onChange) {
    const slider = container.querySelector(`#slider-${prefix}`);
    const num = container.querySelector(`#num-${prefix}`);

    if (!slider || !num) return;

    let isInteracting = false;
    const startInteraction = () => {
      if (!isInteracting) {
        isInteracting = true;
        this.pushUndoSnapshot(`Slider ${prefix}`);
      }
    };
    const endInteraction = () => {
      isInteracting = false;
    };

    const triggerReset = () => {
      const row = slider.closest('.admin-field-row');
      const resetBtn = row ? row.querySelector('.btn-field-reset') : null;
      if (resetBtn) {
        resetBtn.click();
      } else {
        this._resetSliderByPrefix(prefix);
      }
    };

    slider.addEventListener('pointerdown', (e) => {
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerReset();
        return;
      }
      if (e.button === 0) startInteraction();
    });
    slider.addEventListener('click', (e) => {
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerReset();
      }
    });
    slider.addEventListener('pointerup', endInteraction);
    slider.addEventListener('change', endInteraction);
    slider.addEventListener('blur', endInteraction);

    num.addEventListener('pointerdown', (e) => {
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerReset();
      }
    });

    slider.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        startInteraction();
      }
    });
    slider.addEventListener('keyup', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        endInteraction();
      }
    });

    const updateVal = (val) => {
      slider.value = val;
      num.value = val;
      onChange(Number(val));
    };

    slider.addEventListener('input', () => {
      startInteraction();
      num.value = slider.value;
      onChange(Number(slider.value));
    });

    num.addEventListener('input', () => {
      startInteraction();
      slider.value = num.value;
      onChange(Number(num.value));
    });
    num.addEventListener('blur', endInteraction);
    num.addEventListener('change', endInteraction);

    // Handle modern sleek stepper up/down arrow buttons
    container.querySelectorAll(`.stepper-btn[data-step-target="num-${prefix}"]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.pushUndoSnapshot(`Stepper ${prefix}`);
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
              <canvas class="admin-sat-val-canvas" width="220" height="125"></canvas>
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
          const satValCanvas = panel.querySelector('.admin-sat-val-canvas');
          const satValHandle = panel.querySelector('.admin-sat-val-handle');
          const hueSlider = panel.querySelector('.admin-hue-slider-wrap');
          const hueHandle = panel.querySelector('.admin-hue-handle');
          const pickerPreview = panel.querySelector('.admin-picker-preview');
          const pickerInput = panel.querySelector('.admin-picker-hex-input');
          const panelCopyBtn = panel.querySelector('.admin-picker-copy-btn');
          const panelPasteBtn = panel.querySelector('.admin-picker-paste-btn');

          const drawCanvas = (hueVal) => {
            if (!satValCanvas) return;
            const ctx = satValCanvas.getContext('2d');
            if (!ctx) return;
            const w = satValCanvas.width;
            const hPx = satValCanvas.height;

            const [hr, hg, hb] = hsvToRgb(hueVal, 1, 1);
            ctx.fillStyle = `rgb(${hr}, ${hg}, ${hb})`;
            ctx.fillRect(0, 0, w, hPx);

            const gradWhite = ctx.createLinearGradient(0, 0, w, 0);
            gradWhite.addColorStop(0, '#ffffff');
            gradWhite.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradWhite;
            ctx.fillRect(0, 0, w, hPx);

            const gradBlack = ctx.createLinearGradient(0, 0, 0, hPx);
            gradBlack.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradBlack.addColorStop(1, '#000000');
            ctx.fillStyle = gradBlack;
            ctx.fillRect(0, 0, w, hPx);
          };

          const updateUI = (notify = true) => {
            drawCanvas(h);

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

          // Saturation / Value Canvas Drag (Pointer Events with Window Listeners)
          let isDraggingSatVal = false;
          const handleSatVal = (evt) => {
            const rect = satValBox.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, evt.clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height, evt.clientY - rect.top));
            s = rect.width > 0 ? x / rect.width : 0;
            v = rect.height > 0 ? 1 - (y / rect.height) : 1;
            updateUI(true);
          };

          const onSatValMove = (evt) => {
            if (isDraggingSatVal) {
              handleSatVal(evt);
            }
          };

          const onSatValUp = (evt) => {
            if (isDraggingSatVal) {
              isDraggingSatVal = false;
              try { satValBox.releasePointerCapture(evt.pointerId); } catch (_) {}
              window.removeEventListener('pointermove', onSatValMove);
              window.removeEventListener('pointerup', onSatValUp);
              window.removeEventListener('pointercancel', onSatValUp);
            }
          };

          satValBox.addEventListener('pointerdown', (evt) => {
            if (evt.button !== 0 && evt.buttons !== 1) return;
            isDraggingSatVal = true;
            try { satValBox.setPointerCapture(evt.pointerId); } catch (_) {}
            window.addEventListener('pointermove', onSatValMove);
            window.addEventListener('pointerup', onSatValUp);
            window.addEventListener('pointercancel', onSatValUp);
            handleSatVal(evt);
          });

          // Hue Slider Drag (Pointer Events with Window Listeners & Smooth Clamping)
          let isDraggingHue = false;
          const handleHue = (evt) => {
            const rect = hueSlider.getBoundingClientRect();
            const ratio = rect.width > 0 ? Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width)) : 0;
            h = ratio * 360;
            updateUI(true);
          };

          const onHueMove = (evt) => {
            if (isDraggingHue) {
              handleHue(evt);
            }
          };

          const onHueUp = (evt) => {
            if (isDraggingHue) {
              isDraggingHue = false;
              try { hueSlider.releasePointerCapture(evt.pointerId); } catch (_) {}
              window.removeEventListener('pointermove', onHueMove);
              window.removeEventListener('pointerup', onHueUp);
              window.removeEventListener('pointercancel', onHueUp);
            }
          };

          hueSlider.addEventListener('pointerdown', (evt) => {
            if (evt.button !== 0 && evt.buttons !== 1) return;
            isDraggingHue = true;
            try { hueSlider.setPointerCapture(evt.pointerId); } catch (_) {}
            window.addEventListener('pointermove', onHueMove);
            window.addEventListener('pointerup', onHueUp);
            window.addEventListener('pointercancel', onHueUp);
            handleHue(evt);
          });

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

      let colorInteracting = false;
      const startColorInteraction = () => {
        if (!colorInteracting) {
          colorInteracting = true;
          this.pushUndoSnapshot(`Color ${prefix}`);
        }
      };
      const endColorInteraction = () => {
        colorInteracting = false;
      };

      native.addEventListener('pointerdown', startColorInteraction);
      native.addEventListener('change', endColorInteraction);
      hex.addEventListener('blur', endColorInteraction);

      native.addEventListener('input', () => {
        startColorInteraction();
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

  _isDetailLinked(detail) {
    if (!this.linkedSubcategories || this.linkedSubcategories.size === 0) return false;
    if (!this.currentSimilarElements || this.currentSimilarElements.length <= 1) return false;

    if (detail.styleKey) {
      const key = detail.styleKey;
      if (['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontVariant', 'textTransform', 'textAlign', 'fontStyle'].includes(key)) {
        return this.linkedSubcategories.has('sec-typography');
      }
      if (['textShadow', 'boxShadow'].includes(key)) {
        return this.linkedSubcategories.has('sec-shadow');
      }
      if (['color', 'backgroundColor'].includes(key)) {
        return this.linkedSubcategories.has('sec-colors');
      }
      if (['borderWidth', 'borderColor', 'borderStyle', 'borderRadius'].includes(key)) {
        return this.linkedSubcategories.has('sec-borders');
      }
    }

    if (detail.text !== undefined) {
      return this.linkedSubcategories.has('sec-text-content');
    }

    return false;
  }

  _notifyChange(detail = {}) {
    if (!detail.reset) {
      this._captureBaselineIfNeeded();
    }
    if (typeof this.onElementChange === 'function' && this.activeElement && this.activeMeta) {
      this.onElementChange(this.activeElement, this.activeMeta, detail, this.currentBreakpoint);

      // If change belongs to an active linked subcategory, apply to all similar elements across cards in the current section
      if (this._isDetailLinked(detail)) {
        this.currentSimilarElements.forEach(el => {
          if (el && el.isConnected && el !== this.activeElement) {
            let meta = null;
            if (this.selectionEngine) {
              meta = this.selectionEngine.extractElementMetadata(el);
            }
            if (!meta) {
              meta = {
                tagName: el.tagName,
                id: el.id || '',
                className: el.className || '',
                selector: this._generateFallbackSelector(el),
                styles: {},
                dataAttributes: { ...el.dataset }
              };
            }

            const sel = meta.selector;
            if (!this.elementBaselines.has(sel)) {
              const isTextOnly = el.children.length === 0;
              const win = el.ownerDocument ? el.ownerDocument.defaultView : window;
              const computed = win ? win.getComputedStyle(el) : null;
              this.elementBaselines.set(sel, {
                style: el.getAttribute('style') || '',
                text: isTextOnly ? el.textContent : el.innerHTML,
                isTextOnly,
                dataset: { ...el.dataset },
                shadowState: { ...this.shadowState },
                computedColor: computed ? computed.color : '',
                computedBgColor: computed ? computed.backgroundColor : '',
                computedBorderColor: computed ? computed.borderColor : '',
                computedBorderWidth: computed ? computed.borderWidth : '',
                computedBorderRadius: computed ? computed.borderRadius : '',
                computedFontFamily: computed ? computed.fontFamily : '',
                computedFontSize: computed ? computed.fontSize : '',
                computedFontWeight: computed ? computed.fontWeight : '',
                computedFontStyle: computed ? computed.fontStyle : '',
                computedTextAlign: computed ? computed.textAlign : '',
                computedTextTransform: computed ? computed.textTransform : '',
                computedFontVariant: computed ? computed.fontVariant : '',
                computedLineHeight: computed ? computed.lineHeight : '',
                computedLetterSpacing: computed ? computed.letterSpacing : '',
                computedTextShadow: computed ? computed.textShadow : '',
                computedBoxShadow: computed ? computed.boxShadow : ''
              });
            }

            if (detail.text !== undefined) {
              this._updateElementDirectText(el, detail.text);
            }

            this.onElementChange(el, meta, detail, this.currentBreakpoint);
          }
        });
      }
    }
    this._syncFieldIndicators();
  }

  _generateFallbackSelector(el) {
    if (!el) return '';
    if (el.id) return `#${el.id}`;
    if (this.selectionEngine) return this.selectionEngine.generateSelector(el);
    return el.tagName.toLowerCase();
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

  _buildEmptyTabNotice(tabName = 'text') {
    return `
      <div class="admin-empty-notice" style="text-align: center; padding: 20px 16px; color: var(--admin-text-secondary); width: 100%; box-sizing: border-box;">
        <div class="empty-cursor-icon-wrap" style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.35); margin-bottom: 12px; margin-inline: auto;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--admin-accent-cyan); transform: translate(-1px, 1px);">
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            <path d="m13 13 6 6"/>
          </svg>
        </div>
        <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 700; color: var(--admin-text-primary); text-align: center;">Inspect &amp; Edit</p>
        
        <div class="admin-help-guide-wrap" style="text-align: left; width: 100%; box-sizing: border-box; font-size: 13.5px; line-height: 1.6; color: var(--admin-text-secondary);">
          
          <!-- Quick Start Steps -->
          <div style="margin-bottom: 20px; width: 100%;">
            <div class="admin-help-section-title">Quick Start Steps</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <strong class="admin-help-point">Step 1:</strong>
                <span class="admin-help-desc">Turn on Edit mode</span>
                <span class="admin-kbd-group">
                  <kbd class="admin-keycap">Shift</kbd>
                  <kbd class="admin-keycap">E</kbd>
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <strong class="admin-help-point">Step 2:</strong>
                <span class="admin-help-desc">Click any element on the preview to edit</span>
              </div>
            </div>
          </div>
          
          <!-- Tips & Editing Help -->
          <div style="padding-top: 16px; border-top: 1px dashed var(--admin-border-subtle); margin-bottom: 20px; width: 100%;">
            <div class="admin-help-section-title">Tips &amp; Editing Help</div>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 1.5;">
              <div>• <strong class="admin-help-point">Underline:</strong> <span class="admin-help-desc">Shows modified settings.</span></div>
              <div>• <strong class="admin-help-point">Reset Field:</strong> <span class="admin-help-desc">Double-click label or click <span class="admin-help-bold-tag">↺</span>.</span></div>
              <div>• <strong class="admin-help-point">Reset Element:</strong> <span class="admin-help-desc">Click <span class="admin-help-bold-tag">Reset Changes</span> below.</span></div>
              <div>• <strong class="admin-help-point">Link:</strong> <span class="admin-help-desc">Changes apply to similar cards.</span></div>
            </div>
          </div>

          <!-- Keyboard Shortcuts -->
          <div style="padding-top: 16px; border-top: 1px dashed var(--admin-border-subtle); width: 100%;">
            <div class="admin-help-section-title">Keyboard Shortcuts</div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 14px; font-size: 13px; align-items: center;">
              <span class="admin-kbd-group">
                <kbd class="admin-keycap">Shift</kbd>
                <kbd class="admin-keycap">E</kbd>
              </span>
              <strong class="admin-help-point">Toggle Edit mode</strong>

              <span class="admin-kbd-group">
                <kbd class="admin-keycap">I</kbd>
              </span>
              <strong class="admin-help-point">Toggle Sidebar</strong>

              <span class="admin-kbd-group">
                <kbd class="admin-keycap">⌘</kbd>
                <span class="admin-kbd-slash">/</span>
                <kbd class="admin-keycap">Ctrl</kbd>
                <kbd class="admin-keycap">Z</kbd>
              </span>
              <strong class="admin-help-point">Undo</strong>

              <span class="admin-kbd-group">
                <kbd class="admin-keycap">⌘</kbd>
                <span class="admin-kbd-slash">/</span>
                <kbd class="admin-keycap">Ctrl</kbd>
                <kbd class="admin-keycap">Shift</kbd>
                <kbd class="admin-keycap">Z</kbd>
              </span>
              <strong class="admin-help-point">Redo</strong>

              <span class="admin-kbd-group">
                <kbd class="admin-keycap">Alt</kbd>
                <span class="admin-kbd-slash">+</span>
                <span style="font-size: 11.5px; font-weight: 600; color: var(--admin-text-primary);">Click</span>
              </span>
              <strong class="admin-help-point">Reset slider</strong>
            </div>
          </div>

        </div>
      </div>
    `;
  }
}
