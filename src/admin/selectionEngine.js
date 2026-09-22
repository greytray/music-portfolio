/**
 * Selection Engine for Eko In-Context Visual Editor
 * Provides high-precision Figma / DevTools style element hovering, clicking,
 * bounding-box overlays, computed style extraction, and live binding.
 */

export function getFriendlyName(targetEl) {
  if (!targetEl || !targetEl.tagName) return 'Element';

  const id = (targetEl.id || '').toLowerCase();
  const tag = targetEl.tagName.toLowerCase();
  const classes = Array.from(targetEl.classList || []).map(c => c.toLowerCase());

  // 1. Specific IDs and major Sections
  if (id === 'contact' || classes.includes('contact')) return 'Contact Section';
  if (id === 'showcase' || classes.includes('showcase') || classes.includes('player-shell')) return 'Showcase Section';
  if (id === 'services' || classes.includes('services')) return 'Services Section';
  if (id === 'process' || classes.includes('process-section')) return 'Process Section';
  if (id === 'delivery' || classes.includes('delivery-section')) return 'Delivery Section';
  if (id === 'hero' || classes.includes('hero')) return 'Hero Banner';

  // 2. Notable Components
  if (id === 'hero-title') return 'Hero Title';
  if (classes.includes('site-header') || tag === 'header') return 'Header Navigation';
  if (tag === 'nav') return 'Navigation Bar';
  if (tag === 'footer' || classes.includes('contact-copyright')) return 'Page Footer';
  if (classes.includes('brand')) return 'Logo Brand';
  if (classes.includes('cover-art')) return 'Album Cover Art';
  if (classes.includes('now-playing')) return 'Music Player';
  if (classes.includes('track') || classes.includes('beat-card')) return 'Audio Track Card';
  if (classes.includes('service-card')) return 'Service Card';
  if (classes.includes('main-play')) return 'Play Button';

  // 3. Tag & Role based Friendly Names
  if (tag === 'h1') return 'Main Heading';
  if (tag === 'h2') return 'Section Title';
  if (tag === 'h3') return 'Subsection Title';
  if (['h4', 'h5', 'h6'].includes(tag)) return 'Heading';

  if (tag === 'p') {
    if (classes.includes('eyebrow')) return 'Section Subtitle';
    return 'Text Paragraph';
  }

  if (tag === 'button' || classes.includes('button') || classes.includes('cta-button') || classes.includes('nav-btn')) {
    const txt = (targetEl.textContent || '').trim();
    if (txt && txt.length > 0 && txt.length < 24) return `${txt} Button`;
    return 'Button';
  }

  if (tag === 'a') {
    const txt = (targetEl.textContent || '').trim();
    if (txt && txt.length > 0 && txt.length < 24) return `${txt} Link`;
    return 'Link';
  }

  if (tag === 'img') {
    const alt = targetEl.getAttribute('alt');
    if (alt && alt.length > 0 && alt.length < 24) return `${alt} Image`;
    return 'Image';
  }

  if (tag === 'audio') return 'Audio Player';
  if (['input', 'textarea', 'select'].includes(tag)) return 'Form Field';
  if (tag === 'label') return 'Form Label';
  if (tag === 'form') return 'Form';
  if (tag === 'section') return 'Page Section';

  // 4. Containers
  if (['div', 'span', 'article', 'aside'].includes(tag)) {
    const textSnippet = (targetEl.innerText || targetEl.textContent || '').trim();
    if (textSnippet && textSnippet.length > 0 && textSnippet.length <= 20) {
      return `"${textSnippet}"`;
    }
    return 'Content Container';
  }

  return 'Element';
}

export class SelectionEngine {
  /**
   * @param {HTMLIFrameElement} iframe
   * @param {Object} options
   * @param {Function} options.onSelect - Callback when element is selected (element, metadata)
   * @param {Function} options.onDeselect - Callback when element is deselected
   */
  constructor(iframe, { onSelect, onDeselect, mode = 'interactive' } = {}) {
    this.iframe = iframe;
    this.onSelect = onSelect;
    this.onDeselect = onDeselect;
    this.mode = mode; // 'interactive' (Normal) | 'select' (Inspect)
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
    if (!boxEl || !targetEl || !targetEl.getBoundingClientRect || this.mode !== 'select') {
      if (boxEl) boxEl.style.display = 'none';
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      boxEl.style.display = 'none';
      return;
    }

    // Hide box completely if target is scrolled out of the viewport window
    const viewportHeight = this.win.innerHeight || (this.doc && this.doc.documentElement && this.doc.documentElement.clientHeight) || 1000;
    const viewportWidth = this.win.innerWidth || (this.doc && this.doc.documentElement && this.doc.documentElement.clientWidth) || 1000;
    if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) {
      boxEl.style.display = 'none';
      return;
    }

    // Since overlayRoot is position: fixed, rect coordinates are directly used
    boxEl.style.display = 'block';
    boxEl.style.width = `${Math.round(rect.width)}px`;
    boxEl.style.height = `${Math.round(rect.height)}px`;
    boxEl.style.left = `${Math.round(rect.left)}px`;
    boxEl.style.top = `${Math.round(rect.top)}px`;

    const friendlyName = getFriendlyName(targetEl);
    const dimText = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

    if (badgeEl) {
      badgeEl.innerHTML = `<span>${friendlyName}</span>${isSelected ? `<span class="dimensions">${dimText}</span>` : ''}`;
      // Flip badge inside if close to top edge of viewport
      if (rect.top < 28) {
        badgeEl.style.top = '2px';
      } else {
        badgeEl.style.top = '-26px';
      }
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

    // Structural parent hierarchy with precise nth-of-type indexing
    const path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== this.doc.body) {
      const tag = current.tagName.toLowerCase();
      let selector = tag;

      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        let sameTagCount = 0;
        if (current.parentElement) {
          sameTagCount = Array.from(current.parentElement.children).filter(c => c.tagName.toLowerCase() === tag).length;
        }

        let sibling = current;
        let nth = 1;
        while ((sibling = sibling.previousElementSibling)) {
          if (sibling.tagName.toLowerCase() === tag) nth++;
        }

        // Add class modifier if available
        let classModifier = '';
        if (current.classList && current.classList.length > 0) {
          const cls = Array.from(current.classList).find(c => !c.startsWith('is-') && !c.startsWith('eko-'));
          if (cls) classModifier = `.${cls}`;
        }

        if (sameTagCount > 1) {
          selector += `${classModifier}:nth-of-type(${nth})`;
        } else {
          selector += classModifier;
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

    // Extract direct text content (excluding nested child elements like <small>)
    let textContent = '';
    const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
    if (textNodes.length > 0) {
      textContent = textNodes.map(n => n.textContent).join(' ').trim();
    } else if (el.children.length === 0) {
      textContent = (el.textContent || '').trim();
    } else {
      // Fallback for elements with only nested text
      textContent = (el.innerText || el.textContent || '').trim();
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
