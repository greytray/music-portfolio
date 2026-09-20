/**
 * Selection Engine for Eko In-Context Visual Editor
 * Provides high-precision Figma / DevTools style element hovering, clicking,
 * bounding-box overlays, computed style extraction, and live binding.
 */

export class SelectionEngine {
  /**
   * @param {HTMLIFrameElement} iframe
   * @param {Object} options
   * @param {Function} options.onSelect - Callback when element is selected (element, metadata)
   * @param {Function} options.onDeselect - Callback when element is deselected
   */
  constructor(iframe, { onSelect, onDeselect }) {
    this.iframe = iframe;
    this.onSelect = onSelect;
    this.onDeselect = onDeselect;
    this.mode = 'select'; // 'select' | 'interactive'
    this.selectedElement = null;
    this.hoveredElement = null;

    this.overlayRoot = null;
    this.hoverBox = null;
    this.hoverBadge = null;
    this.selectedBox = null;
    this.selectedBadge = null;

    this._boundOnMouseMove = this._onMouseMove.bind(this);
    this._boundOnClick = this._onClick.bind(this);
    this._boundOnScroll = this._updateBoxes.bind(this);
    this._boundOnResize = this._updateBoxes.bind(this);

    this.init();
  }

  get doc() {
    return this.iframe.contentDocument || (this.iframe.contentWindow && this.iframe.contentWindow.document);
  }

  get win() {
    return this.iframe.contentWindow;
  }

  init() {
    if (!this.doc) return;

    // Remove any existing overlay roots
    const existing = this.doc.getElementById('eko-designer-overlays');
    if (existing) existing.remove();

    // Create persistent overlay container inside iframe document
    this.overlayRoot = this.doc.createElement('div');
    this.overlayRoot.id = 'eko-designer-overlays';
    this.overlayRoot.className = 'eko-designer-overlay-root';
    this.doc.body.appendChild(this.overlayRoot);

    // Hover box
    this.hoverBox = this.doc.createElement('div');
    this.hoverBox.className = 'eko-hover-box';
    this.hoverBox.style.display = 'none';
    this.hoverBadge = this.doc.createElement('div');
    this.hoverBadge.className = 'eko-hover-badge';
    this.hoverBox.appendChild(this.hoverBadge);
    this.overlayRoot.appendChild(this.hoverBox);

    // Selected box with 4 corner pips
    this.selectedBox = this.doc.createElement('div');
    this.selectedBox.className = 'eko-selected-box';
    this.selectedBox.style.display = 'none';
    this.selectedBadge = this.doc.createElement('div');
    this.selectedBadge.className = 'eko-selected-badge';
    this.selectedBox.appendChild(this.selectedBadge);

    ['tl', 'tr', 'bl', 'br'].forEach(corner => {
      const handle = this.doc.createElement('div');
      handle.className = `eko-handle ${corner}`;
      this.selectedBox.appendChild(handle);
    });

    this.overlayRoot.appendChild(this.selectedBox);

    // Attach listeners
    this.doc.addEventListener('mousemove', this._boundOnMouseMove, { passive: true });
    this.doc.addEventListener('click', this._boundOnClick, true);
    this.win.addEventListener('scroll', this._boundOnScroll, { passive: true });
    this.win.addEventListener('resize', this._boundOnResize, { passive: true });
  }

  setMode(newMode) {
    this.mode = newMode;
    if (newMode === 'interactive') {
      this.hideHover();
      if (this.selectedBox) this.selectedBox.style.display = 'none';
    } else {
      if (this.selectedElement) {
        this.selectElement(this.selectedElement);
      }
    }
  }

  _isIgnored(target) {
    if (!target || target === this.doc.body || target === this.doc.documentElement) return true;
    if (target.closest && (target.closest('#eko-designer-overlays') || target.closest('.admin-workspace'))) return true;
    if (target.tagName === 'HTML' || target.tagName === 'BODY' || target.tagName === 'SCRIPT' || target.tagName === 'STYLE') return true;
    return false;
  }

  _onMouseMove(e) {
    if (this.mode !== 'select') return;
    const target = this.doc.elementFromPoint(e.clientX, e.clientY);
    if (this._isIgnored(target)) {
      this.hideHover();
      return;
    }

    if (target === this.selectedElement) {
      this.hideHover();
      return;
    }

    this.hoveredElement = target;
    this._renderBox(this.hoverBox, this.hoverBadge, target, false);
  }

  _onClick(e) {
    if (this.mode !== 'select') return;
    const target = this.doc.elementFromPoint(e.clientX, e.clientY);
    if (this._isIgnored(target)) return;

    e.preventDefault();
    e.stopPropagation();

    this.selectElement(target);
  }

  selectElement(el) {
    if (!el || this._isIgnored(el)) {
      this.deselect();
      return;
    }

    this.selectedElement = el;
    this.hideHover();
    this._renderBox(this.selectedBox, this.selectedBadge, el, true);

    const metadata = this.extractElementMetadata(el);
    if (typeof this.onSelect === 'function') {
      this.onSelect(el, metadata);
    }
  }

  deselect() {
    this.selectedElement = null;
    if (this.selectedBox) this.selectedBox.style.display = 'none';
    if (typeof this.onDeselect === 'function') {
      this.onDeselect();
    }
  }

  hideHover() {
    this.hoveredElement = null;
    if (this.hoverBox) this.hoverBox.style.display = 'none';
  }

  _updateBoxes() {
    if (this.selectedElement) {
      this._renderBox(this.selectedBox, this.selectedBadge, this.selectedElement, true);
    }
    if (this.hoveredElement && this.mode === 'select') {
      this._renderBox(this.hoverBox, this.hoverBadge, this.hoveredElement, false);
    }
  }

  _renderBox(boxEl, badgeEl, targetEl, isSelected) {
    if (!boxEl || !targetEl || !targetEl.getBoundingClientRect) return;

    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      boxEl.style.display = 'none';
      return;
    }

    const scrollX = this.win.scrollX || this.doc.documentElement.scrollLeft;
    const scrollY = this.win.scrollY || this.doc.documentElement.scrollTop;

    boxEl.style.display = 'block';
    boxEl.style.width = `${Math.round(rect.width)}px`;
    boxEl.style.height = `${Math.round(rect.height)}px`;
    boxEl.style.left = `${Math.round(rect.left + scrollX)}px`;
    boxEl.style.top = `${Math.round(rect.top + scrollY)}px`;

    const tag = targetEl.tagName.toLowerCase();
    const id = targetEl.id ? `#${targetEl.id}` : '';
    let classNames = '';
    if (targetEl.classList && targetEl.classList.length > 0) {
      const filtered = Array.from(targetEl.classList).filter(c => !c.startsWith('eko-'));
      if (filtered.length > 0) {
        classNames = `.${filtered.slice(0, 2).join('.')}`;
      }
    }

    const labelText = `${tag}${id}${classNames}`;
    const dimText = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

    if (badgeEl) {
      badgeEl.innerHTML = `<span>${labelText}</span>${isSelected ? `<span class="dimensions">${dimText}</span>` : ''}`;
    }
  }

  /**
   * Generates a stable unique CSS selector for this element
   */
  generateSelector(el) {
    if (!el || !el.tagName) return '';
    if (el.id) return `#${el.id}`;

    // Test specific unique classes
    if (el.classList && el.classList.length > 0) {
      const cls = Array.from(el.classList).find(c => !c.startsWith('is-') && !c.startsWith('eko-'));
      if (cls) {
        const matches = this.doc.querySelectorAll(`.${cls}`);
        if (matches.length === 1) return `.${cls}`;
      }
    }

    // Structural parent hierarchy
    const path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== this.doc.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        let sibling = current;
        let nth = 1;
        while ((sibling = sibling.previousElementSibling)) {
          if (sibling.tagName.toLowerCase() === selector) nth++;
        }
        if (nth > 1) {
          selector += `:nth-of-type(${nth})`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Extracts clean computed styles and attributes for side panel mapping
   */
  extractElementMetadata(el) {
    const computed = this.win.getComputedStyle(el);
    const selector = this.generateSelector(el);

    // Helpers to clean px units
    const toNum = (val) => {
      const n = parseFloat(val);
      return isNaN(n) ? 0 : Math.round(n);
    };

    // Extract text content
    let textContent = '';
    if (el.children.length === 0) {
      textContent = el.textContent || '';
    } else {
      // Direct text or child text
      textContent = el.innerText || el.textContent || '';
    }

    // Media properties
    let audioSrc = '';
    let imageSrc = '';
    if (el.tagName === 'IMG') {
      imageSrc = el.getAttribute('src') || el.src || '';
    } else if (computed.backgroundImage && computed.backgroundImage !== 'none') {
      const m = computed.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
      if (m && m[1]) imageSrc = m[1];
    }

    if (el.tagName === 'AUDIO') {
      audioSrc = el.getAttribute('src') || el.src || '';
    } else if (el.querySelector('audio')) {
      audioSrc = el.querySelector('audio').getAttribute('src') || '';
    } else if (el.dataset.trackSrc) {
      audioSrc = el.dataset.trackSrc;
    }

    return {
      tagName: el.tagName,
      id: el.id || '',
      className: el.className || '',
      selector,
      text: textContent.trim(),
      styles: {
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
        textTransform: computed.textTransform,
        // 4-way Margins
        marginTop: toNum(computed.marginTop),
        marginBottom: toNum(computed.marginBottom),
        marginLeft: toNum(computed.marginLeft),
        marginRight: toNum(computed.marginRight),
        // 4-way Padding
        paddingTop: toNum(computed.paddingTop),
        paddingBottom: toNum(computed.paddingBottom),
        paddingLeft: toNum(computed.paddingLeft),
        paddingRight: toNum(computed.paddingRight),
        // Gap and tracking
        gap: toNum(computed.gap),
        letterSpacing: toNum(computed.letterSpacing),
        lineHeight: computed.lineHeight,
      },
      dataAttributes: { ...el.dataset },
      media: {
        audioSrc,
        imageSrc,
        isAudioTarget: Boolean(el.tagName === 'AUDIO' || el.closest('#player') || el.classList.contains('track') || audioSrc),
        isImageTarget: Boolean(el.tagName === 'IMG' || el.classList.contains('cover-art') || imageSrc)
      }
    };
  }

  destroy() {
    if (this.doc) {
      this.doc.removeEventListener('mousemove', this._boundOnMouseMove);
      this.doc.removeEventListener('click', this._boundOnClick, true);
    }
    if (this.win) {
      this.win.removeEventListener('scroll', this._boundOnScroll);
      this.win.removeEventListener('resize', this._boundOnResize);
    }
    if (this.overlayRoot) {
      this.overlayRoot.remove();
    }
  }
}
