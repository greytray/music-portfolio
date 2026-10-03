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

/**
 * Helper to identify the enclosing semantic section of an element
 */
export function getEnclosingSection(el) {
  if (!el || !el.ownerDocument) return null;
  const section = el.closest(
    'section, header, footer, [id="showcase"], [id="services"], [id="process"], [id="delivery"], [id="contact"], [id="hero"], [id="top"], .section, .process-section, .delivery-section, .services, .contact, .hero, .site-header, main'
  );
  return section || el.ownerDocument.body;
}

/**
 * Returns a friendly name for the enclosing section
 */
export function getEnclosingSectionName(el) {
  const sec = getEnclosingSection(el);
  if (!sec) return 'Current Section';
  const id = (sec.id || '').toLowerCase();
  const cls = Array.from(sec.classList || []).map(c => c.toLowerCase());

  if (id === 'showcase' || cls.includes('showcase') || cls.includes('beats')) return 'Showcase Section';
  if (id === 'services' || cls.includes('services')) return 'Services Section';
  if (id === 'process' || cls.includes('process-section')) return 'Process Section';
  if (id === 'delivery' || cls.includes('delivery-section')) return 'Delivery Section';
  if (id === 'contact' || cls.includes('contact')) return 'Contact Section';
  if (id === 'top' || id === 'hero' || cls.includes('hero')) return 'Hero Section';
  if (sec.tagName.toLowerCase() === 'header' || cls.includes('site-header')) return 'Header Section';
  if (sec.tagName.toLowerCase() === 'footer') return 'Footer Section';

  const heading = sec.querySelector('h1, h2, h3');
  if (heading && heading.textContent.trim()) {
    const text = heading.textContent.trim();
    return text.length > 20 ? `${text.slice(0, 18)}... Section` : `${text} Section`;
  }

  return 'Current Section';
}

/**
 * Builds a relative CSS selector path from a card/container down to a target descendant
 */
function getRelativeCardPath(card, el) {
  if (!card || !el || card === el) return '';
  const parts = [];
  let curr = el;
  while (curr && curr !== card && curr.parentElement) {
    let selector = curr.tagName.toLowerCase();
    const cleanClasses = Array.from(curr.classList || []).filter(c => 
      !c.startsWith('is-') && !c.startsWith('eko-') && c !== 'active' && c !== 'selected' && c !== 'hover' && c !== 'focus'
    );
    if (cleanClasses.length > 0) {
      selector += '.' + cleanClasses.join('.');
    } else {
      let idx = 1;
      let sib = curr.previousElementSibling;
      let totalSame = 0;
      if (curr.parentElement) {
        for (const ch of curr.parentElement.children) {
          if (ch.tagName === curr.tagName) totalSame++;
        }
      }
      if (totalSame > 1) {
        while (sib) {
          if (sib.tagName === curr.tagName) idx++;
          sib = sib.previousElementSibling;
        }
        selector += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(selector);
    curr = curr.parentElement;
  }
  return parts.join(' > ');
}

/**
 * Smartly finds all similar text elements across different cards/items
 * strictly within the enclosing website section of targetEl.
 */
export function findSimilarCardElements(targetEl) {
  if (!targetEl || !targetEl.ownerDocument) return [];

  const section = getEnclosingSection(targetEl);
  if (!section) return [targetEl];

  const isValidCandidate = (el) => {
    if (!el || !el.isConnected) return false;
    if (el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.closest && (el.closest('#eko-designer-overlays') || el.closest('.admin-workspace'))) return false;
    return true;
  };

  // Known card and repeating item selectors across the website
  const cardSelectors = [
    '.track',
    '.process-card',
    '.services-catalog-card',
    '.services-card-wrapper',
    '.service-card',
    '.beat-card',
    '.session-card',
    '.order-card',
    '.cart-item',
    '.catalog-audio-track',
    '.catalog-tile',
    'article',
    '[class*="card"]',
    'li'
  ];

  let card = null;
  let cardSelectorMatched = null;

  for (const sel of cardSelectors) {
    const candidate = targetEl.closest(sel);
    if (candidate && section.contains(candidate) && candidate !== section) {
      const matches = section.querySelectorAll(sel);
      if (matches.length > 1) {
        card = candidate;
        cardSelectorMatched = sel;
        break;
      }
    }
  }

  // If no known selector matched, check if an ancestor within the section has multiple same-tag/class siblings
  if (!card) {
    let curr = targetEl.parentElement;
    while (curr && curr !== section && curr !== targetEl.ownerDocument.body) {
      if (curr.parentElement) {
        const siblings = Array.from(curr.parentElement.children).filter(c => c.tagName === curr.tagName);
        if (siblings.length > 1) {
          card = curr;
          break;
        }
      }
      curr = curr.parentElement;
    }
  }

  // If a repeating card container is found:
  if (card && section.contains(card)) {
    let cards = [];
    if (cardSelectorMatched) {
      cards = Array.from(section.querySelectorAll(cardSelectorMatched)).filter(isValidCandidate);
    }
    if (cards.length <= 1 && card.parentElement) {
      cards = Array.from(card.parentElement.children).filter(c => c.tagName === card.tagName && isValidCandidate(c));
    }

    if (cards.length > 1) {
      const relSelector = getRelativeCardPath(card, targetEl);
      const results = [];

      for (const c of cards) {
        let match = null;
        if (relSelector) {
          try {
            match = c.querySelector(relSelector);
          } catch (_) {}
        }
        if (!match && targetEl.classList && targetEl.classList.length > 0) {
          const cleanClasses = Array.from(targetEl.classList).filter(cls => 
            !cls.startsWith('is-') && !cls.startsWith('eko-') && cls !== 'active' && cls !== 'selected'
          );
          if (cleanClasses.length > 0) {
            try {
              match = c.querySelector(`.${cleanClasses.join('.')}`);
            } catch (_) {}
          }
        }
        if (!match) {
          const sameTags = c.querySelectorAll(targetEl.tagName.toLowerCase());
          if (sameTags.length === 1) {
            match = sameTags[0];
          }
        }
        if (!match && targetEl === card) {
          match = c;
        }

        if (match && isValidCandidate(match)) {
          results.push(match);
        }
      }

      if (results.length > 1) {
        if (!results.includes(targetEl)) {
          const cardIdx = cards.indexOf(card);
          if (cardIdx >= 0) results[cardIdx] = targetEl;
          else results.unshift(targetEl);
        }
        return results;
      }
    }
  }

  // Fallback: If not in card, check if multiple elements with the same specific class exist in this section
  if (targetEl.classList && targetEl.classList.length > 0) {
    const cleanClasses = Array.from(targetEl.classList).filter(cls => 
      !cls.startsWith('is-') && !cls.startsWith('eko-') && cls !== 'active' && cls !== 'selected'
    );
    for (const cls of cleanClasses) {
      const candidates = Array.from(section.querySelectorAll(`.${cls}`)).filter(isValidCandidate);
      if (candidates.length > 1 && candidates.includes(targetEl)) {
        return candidates;
      }
    }
  }

  // Fallback: check if targetEl has same-tag siblings in immediate parent
  if (targetEl.parentElement && section.contains(targetEl.parentElement)) {
    const sameTagSiblings = Array.from(targetEl.parentElement.children).filter(
      c => c.tagName === targetEl.tagName && isValidCandidate(c)
    );
    if (sameTagSiblings.length > 1 && sameTagSiblings.includes(targetEl)) {
      return sameTagSiblings;
    }
  }

  return [targetEl];
}

export class SelectionEngine {
  /**
   * @param {HTMLIFrameElement} iframe
   * @param {Object} options
   * @param {Function} options.onSelect - Callback when element is selected (element, metadata)
   * @param {Function} options.onDeselect - Callback when element is deselected
   */
  constructor(iframe, { onSelect, onDeselect, mode = 'interactive', breakpoint = 'universal', showChanges = true } = {}) {
    this.iframe = iframe;
    this.onSelect = onSelect;
    this.onDeselect = onDeselect;
    this.mode = mode; // 'interactive' (Normal) | 'select' (Inspect)
    this.breakpoint = breakpoint;
    this.selectedElement = null;
    this.hoveredElement = null;

    this.overlayRoot = null;
    this.hoverBox = null;
    this.hoverBadge = null;
    this.selectedBox = null;
    this.selectedBadge = null;
    this.changedBoxesContainer = null;
    this.linkedBoxesContainer = null;
    this.circuitSvg = null;
    this.leftTag = null;
    this.rightTag = null;
    this.leftTagY = null; // null => centered vertically (50%)
    this.rightTagY = null;
    this.isDraggingLeft = false;
    this.isDraggingRight = false;
    this.dragStartY = 0;
    this.dragStartTagY = 0;
    this.hasMovedDrag = false;

    this.changedElements = new Set();
    this.linkedElements = [];
    this.showChangesEnabled = Boolean(showChanges);

    this._boundOnMouseMove = this._onMouseMove.bind(this);
    this._boundOnClick = this._onClick.bind(this);
    this._boundOnScroll = this._updateBoxes.bind(this);
    this._boundOnResize = this._updateBoxes.bind(this);
    this._boundOnPointerMove = this._onPointerMove.bind(this);
    this._boundOnPointerUp = this._onPointerUp.bind(this);

    this.init();
  }

  get doc() {
    try {
      return this.iframe.contentDocument || null;
    } catch (_) {
      return null;
    }
  }

  get win() {
    try {
      const w = this.iframe.contentWindow;
      if (w && w.location && w.location.href) return w;
      return null;
    } catch (_) {
      return null;
    }
  }

  init() {
    if (!this.doc || !this.doc.body) return;

    // Inject isolated overlay CSS directly into iframe document head
    this._injectOverlayStyles();

    // Remove any existing overlay roots
    const existing = this.doc.getElementById('eko-designer-overlays');
    if (existing) existing.remove();

    // Create persistent overlay container inside iframe document
    this.overlayRoot = this.doc.createElement('div');
    this.overlayRoot.id = 'eko-designer-overlays';
    this.overlayRoot.className = 'eko-designer-overlay-root';
    this.doc.body.appendChild(this.overlayRoot);

    // SVG canvas for futuristic circuit connector traces
    this.circuitSvg = this.doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.circuitSvg.setAttribute('class', 'eko-circuit-canvas');
    this.circuitSvg.style.pointerEvents = 'none';
    this.overlayRoot.appendChild(this.circuitSvg);

    // Container for changed elements highlight overlays (rendered below hover & select boxes)
    this.changedBoxesContainer = this.doc.createElement('div');
    this.changedBoxesContainer.id = 'eko-changed-boxes-container';
    this.changedBoxesContainer.style.pointerEvents = 'none';
    this.overlayRoot.appendChild(this.changedBoxesContainer);

    // Container for linked elements highlight overlays
    this.linkedBoxesContainer = this.doc.createElement('div');
    this.linkedBoxesContainer.id = 'eko-linked-boxes-container';
    this.linkedBoxesContainer.style.pointerEvents = 'none';
    this.overlayRoot.appendChild(this.linkedBoxesContainer);

    // Left movable futuristic tag (Compact Circle with Change Count & Snap-to-center on double click)
    this.leftTag = this.doc.createElement('div');
    this.leftTag.className = 'eko-circuit-tag left-tag';
    this.leftTag.style.display = 'none';
    this.leftTag.setAttribute('title', 'Drag vertically to move • Double-click to snap to center');
    this.leftTag.innerHTML = `
      <div class="circuit-tag-circle">
        <span class="circuit-tag-count" id="circuit-left-count">0</span>
      </div>
      <div class="circuit-tag-node"></div>
    `;
    this.overlayRoot.appendChild(this.leftTag);

    // Right movable futuristic tag (Compact Circle with Change Count & Snap-to-center on double click)
    this.rightTag = this.doc.createElement('div');
    this.rightTag.className = 'eko-circuit-tag right-tag';
    this.rightTag.style.display = 'none';
    this.rightTag.setAttribute('title', 'Drag vertically to move • Double-click to snap to center');
    this.rightTag.innerHTML = `
      <div class="circuit-tag-node"></div>
      <div class="circuit-tag-circle">
        <span class="circuit-tag-count" id="circuit-right-count">0</span>
      </div>
    `;
    this.overlayRoot.appendChild(this.rightTag);

    this._bindTagDragEvents();

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
    if (this.win) {
      this.win.addEventListener('scroll', this._boundOnScroll, { passive: true });
      this.win.addEventListener('resize', this._boundOnResize, { passive: true });
    }

    // Render any already-recorded changed boxes
    this._renderChangedBoxes();
  }

  _bindTagDragEvents() {
    if (!this.leftTag || !this.rightTag) return;

    // Double click to snap to center
    this.leftTag.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.leftTagY = null; // snaps to center (viewportHeight / 2)
      this._renderChangedBoxes();
    });

    this.rightTag.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.rightTagY = null; // snaps to center (viewportHeight / 2)
      this._renderChangedBoxes();
    });

    this.leftTag.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDraggingLeft = true;
      this.isDraggingRight = false;
      this.hasMovedDrag = false;
      this.dragStartY = e.clientY;
      const rect = this.leftTag.getBoundingClientRect();
      this.dragStartTagY = rect.top + rect.height / 2;
      this.leftTag.setPointerCapture(e.pointerId);
      this.leftTag.classList.add('is-dragging');
    });

    this.rightTag.addEventListener('pointerdown', (e) => {
      const isMobile = this.breakpoint === 'mobile' || (this.iframe && this.iframe.offsetWidth > 0 && this.iframe.offsetWidth <= 520);
      if (isMobile) return;
      e.preventDefault();
      e.stopPropagation();
      this.isDraggingRight = true;
      this.isDraggingLeft = false;
      this.hasMovedDrag = false;
      this.dragStartY = e.clientY;
      const rect = this.rightTag.getBoundingClientRect();
      this.dragStartTagY = rect.top + rect.height / 2;
      this.rightTag.setPointerCapture(e.pointerId);
      this.rightTag.classList.add('is-dragging');
    });

    this.doc.addEventListener('pointermove', this._boundOnPointerMove);
    this.doc.addEventListener('pointerup', this._boundOnPointerUp);
    this.doc.addEventListener('pointercancel', this._boundOnPointerUp);
  }

  _onPointerMove(e) {
    if (!this.isDraggingLeft && !this.isDraggingRight) return;
    const viewportHeight = this.win.innerHeight || (this.doc.documentElement && this.doc.documentElement.clientHeight) || 800;
    const dy = e.clientY - this.dragStartY;
    if (Math.abs(dy) > 2) {
      this.hasMovedDrag = true;
    }
    let newY = Math.max(30, Math.min(viewportHeight - 30, this.dragStartTagY + dy));

    if (this.isDraggingLeft) {
      this.leftTagY = newY;
    } else if (this.isDraggingRight) {
      this.rightTagY = newY;
    }
    this._renderChangedBoxes();
  }

  _onPointerUp(e) {
    if (this.isDraggingLeft && this.leftTag) {
      this.leftTag.classList.remove('is-dragging');
    }
    if (this.isDraggingRight && this.rightTag) {
      this.rightTag.classList.remove('is-dragging');
    }
    this.isDraggingLeft = false;
    this.isDraggingRight = false;
  }

  _injectOverlayStyles() {
    if (!this.doc || !this.doc.head) return;
    let styleTag = this.doc.getElementById('eko-overlay-styles');
    if (!styleTag) {
      styleTag = this.doc.createElement('style');
      styleTag.id = 'eko-overlay-styles';
      styleTag.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

        .eko-designer-overlay-root {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          pointer-events: none !important;
          z-index: 99999999 !important;
          overflow: hidden !important;
          overscroll-behavior: contain !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
        }

        /* --------------------------------------------------------------------------
           Futuristic Circuit Overlay Canvas & Movable Side Tags (Iron Man / HUD UI)
           -------------------------------------------------------------------------- */
        .eko-circuit-canvas {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          pointer-events: none !important;
          z-index: 99999980 !important;
          overflow: visible !important;
        }

        .eko-circuit-tag {
          position: fixed !important;
          display: none !important;
          align-items: center !important;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          color: #f5f3ff !important;
          font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          cursor: ns-resize !important;
          pointer-events: none !important;
          user-select: none !important;
          touch-action: none !important;
          z-index: 100000000 !important;
          transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .eko-circuit-tag.is-active-visible {
          display: flex !important;
          pointer-events: auto !important;
        }

        .eko-circuit-tag:hover,
        .eko-circuit-tag.is-dragging {
          transform: translateY(-50%) scale(1.08) !important;
        }

        .eko-circuit-tag.left-tag {
          left: 10px !important;
          gap: 4px !important;
        }

        .eko-circuit-tag.right-tag {
          right: 10px !important;
          gap: 4px !important;
        }

        .circuit-tag-circle {
          width: 26px !important;
          height: 26px !important;
          border-radius: 50% !important;
          background: rgba(10, 10, 15, 0.96) !important;
          border: 2px solid #FFFF00 !important;
          box-shadow: 0 0 0 1.5px #000000, 0 0 10px rgba(255, 255, 0, 0.5) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          transition: all 0.18s ease !important;
          box-sizing: border-box !important;
        }

        .eko-circuit-tag:hover .circuit-tag-circle,
        .eko-circuit-tag.is-dragging .circuit-tag-circle {
          border-color: #FFFF00 !important;
          box-shadow: 0 0 0 1.5px #000000, 0 0 16px rgba(255, 255, 0, 0.8) !important;
          background: rgba(15, 15, 20, 0.98) !important;
        }

        .circuit-tag-count {
          font-size: 13px !important;
          font-weight: 800 !important;
          color: #ffffff !important;
          font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          letter-spacing: 0 !important;
          line-height: 1 !important;
          text-align: center !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-font-smoothing: antialiased !important;
          text-shadow: 0 1px 2px #000000 !important;
          font-variant-numeric: tabular-nums !important;
        }

        .circuit-tag-node {
          width: 5px !important;
          height: 5px !important;
          border-radius: 50% !important;
          background: #FFFF00 !important;
          border: 1px solid #000000 !important;
          box-shadow: 0 0 0 1px #FFFFFF, 0 0 6px #FFFF00 !important;
          flex-shrink: 0 !important;
        }

        /* --------------------------------------------------------------------------
           High-Visibility Changed Element Overlays (Clean High-Contrast Framing)
           -------------------------------------------------------------------------- */
        .eko-changed-box {
          position: absolute !important;
          border: none !important;
          background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23000000' stroke-width='2.8' stroke-dasharray='7%2c 5' stroke-dashoffset='0' stroke-linecap='square'/%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23FFFF00' stroke-width='1.5' stroke-dasharray='7%2c 5' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e") !important;
          background-color: transparent !important;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4)) !important;
          box-shadow: none !important;
          pointer-events: none !important;
          border-radius: 0 !important;
          box-sizing: border-box !important;
          z-index: 99999985 !important;
          transition: width 0.08s ease-out, height 0.08s ease-out, left 0.08s ease-out, top 0.08s ease-out !important;
        }

        /* Framing Corner L-Brackets with Clean Outward Standoff:
           Positioned with a clean 4px clearance outside the dashed box */
        .eko-changed-box::before {
          content: '' !important;
          position: absolute !important;
          top: -4px !important;
          left: -4px !important;
          width: 9px !important;
          height: 9px !important;
          border-top: 2px solid #FFFF00 !important;
          border-left: 2px solid #FFFF00 !important;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5)) !important;
          pointer-events: none !important;
          box-sizing: border-box !important;
          z-index: 2 !important;
        }

        .eko-changed-box::after {
          content: '' !important;
          position: absolute !important;
          bottom: -4px !important;
          right: -4px !important;
          width: 9px !important;
          height: 9px !important;
          border-bottom: 2px solid #FFFF00 !important;
          border-right: 2px solid #FFFF00 !important;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5)) !important;
          pointer-events: none !important;
          box-sizing: border-box !important;
          z-index: 2 !important;
        }

        .eko-hover-box {
          position: absolute !important;
          border: 1.5px dashed #00e5ff !important;
          background: rgba(0, 229, 255, 0.06) !important;
          pointer-events: none !important;
          transition: all 0.06s ease-out !important;
          border-radius: 2px !important;
          box-sizing: border-box !important;
          z-index: 99999999 !important;
        }

        .eko-hover-badge {
          display: none !important;
        }

        .eko-selected-box {
          position: absolute !important;
          border: 2px solid #007fff !important;
          background: rgba(0, 127, 255, 0.08) !important;
          pointer-events: none !important;
          border-radius: 2px !important;
          box-sizing: border-box !important;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 127, 255, 0.3) !important;
          z-index: 99999999 !important;
        }

        .eko-selected-badge {
          display: none !important;
        }

        .eko-handle {
          position: absolute !important;
          width: 7px !important;
          height: 7px !important;
          background: #ffffff !important;
          border: 1.5px solid #007fff !important;
          border-radius: 1px !important;
          pointer-events: none !important;
        }
        .eko-handle.tl { top: -4px !important; left: -4px !important; }
        .eko-handle.tr { top: -4px !important; right: -4px !important; }
        .eko-handle.bl { bottom: -4px !important; left: -4px !important; }
        .eko-handle.br { bottom: -4px !important; right: -4px !important; }

        /* --------------------------------------------------------------------------
           Linked Elements Highlight Boxes & Badges
           -------------------------------------------------------------------------- */
        .eko-linked-box {
          position: absolute !important;
          border: 2px dashed #00b0ff !important;
          background: rgba(0, 176, 255, 0.08) !important;
          pointer-events: none !important;
          border-radius: 2px !important;
          box-sizing: border-box !important;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 0 14px rgba(0, 176, 255, 0.28) !important;
          z-index: 99999995 !important;
          transition: width 0.06s ease-out, height 0.06s ease-out, left 0.06s ease-out, top 0.06s ease-out !important;
        }

        .eko-linked-badge {
          position: absolute !important;
          bottom: -16px !important;
          top: auto !important;
          right: 0 !important;
          left: auto !important;
          background: rgba(13, 21, 39, 0.94) !important;
          color: #38bdf8 !important;
          font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Work Sans", sans-serif !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          padding: 1px 4px !important;
          border-radius: 2px !important;
          white-space: nowrap !important;
          border: 1px solid rgba(0, 176, 255, 0.6) !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;
          display: flex !important;
          align-items: center !important;
          gap: 2px !important;
          line-height: 1 !important;
          height: 14px !important;
          box-sizing: border-box !important;
          z-index: 100000000 !important;
          pointer-events: none !important;
        }

        .eko-linked-bracket {
          position: absolute !important;
          width: 6px !important;
          height: 6px !important;
          pointer-events: none !important;
        }
        .eko-linked-bracket.tl { top: -2px !important; left: -2px !important; border-top: 2px solid #00e5ff !important; border-left: 2px solid #00e5ff !important; }
        .eko-linked-bracket.tr { top: -2px !important; right: -2px !important; border-top: 2px solid #00e5ff !important; border-right: 2px solid #00e5ff !important; }
        .eko-linked-bracket.bl { bottom: -2px !important; left: -2px !important; border-bottom: 2px solid #00e5ff !important; border-left: 2px solid #00e5ff !important; }
        .eko-linked-bracket.br { bottom: -2px !important; right: -2px !important; border-bottom: 2px solid #00e5ff !important; border-right: 2px solid #00e5ff !important; }
      `;
      this.doc.head.appendChild(styleTag);
    }
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
    let target = this.doc.elementFromPoint(e.clientX, e.clientY);
    if (this._isIgnored(target)) {
      this.hideHover();
      return;
    }

    if (target && target.tagName !== 'IMG' && target.querySelector('img')) {
      const img = target.querySelector('img');
      if (img && !this._isIgnored(img)) {
        target = img;
      }
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
    let target = this.doc.elementFromPoint(e.clientX, e.clientY);
    if (this._isIgnored(target)) return;

    // When clicking an image container wrapper, prefer the img inside it
    if (target && target.tagName !== 'IMG' && target.querySelector('img')) {
      const img = target.querySelector('img');
      if (img && !this._isIgnored(img)) {
        target = img;
      }
    }

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
    this.setLinkedElements([]);
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
    this._renderChangedBoxes();
    this._renderLinkedBoxes();
  }

  /**
   * Sets linked elements to highlight concurrently with selected element
   * @param {Array<HTMLElement>} elements
   */
  setLinkedElements(elements = []) {
    this.linkedElements = Array.isArray(elements) ? elements : Array.from(elements || []);
    this._renderLinkedBoxes();
    if (this.selectedElement) {
      this._renderBox(this.selectedBox, this.selectedBadge, this.selectedElement, true);
    }
  }

  /**
   * Renders high-visibility floating highlight boxes around all linked elements
   */
  _renderLinkedBoxes() {
    if (!this.linkedBoxesContainer || !this.doc) return;
    this.linkedBoxesContainer.innerHTML = '';

    if (!this.linkedElements || this.linkedElements.length <= 1) return;

    const total = this.linkedElements.length;
    const viewportHeight = this.win.innerHeight || (this.doc.documentElement && this.doc.documentElement.clientHeight) || 1000;
    const viewportWidth = this.win.innerWidth || (this.doc.documentElement && this.doc.documentElement.clientWidth) || 1000;

    this.linkedElements.forEach((el, idx) => {
      if (!el || !el.isConnected) return;
      if (el === this.selectedElement) return; // Selected element is already highlighted with selectedBox

      const rect = this._getElementContainerRect(el) || el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) return;

      const box = this.doc.createElement('div');
      box.className = 'eko-linked-box';
      box.style.display = 'block';
      box.style.width = `${Math.round(rect.width)}px`;
      box.style.height = `${Math.round(rect.height)}px`;
      box.style.left = `${Math.round(rect.left)}px`;
      box.style.top = `${Math.round(rect.top)}px`;

      const badge = this.doc.createElement('div');
      badge.className = 'eko-linked-badge';
      badge.innerHTML = `<span>🔗 ${idx + 1}/${total}</span>`;
      badge.style.setProperty('right', '0px', 'important');
      badge.style.setProperty('left', 'auto', 'important');
      if (rect.bottom > viewportHeight - 18) {
        badge.style.setProperty('bottom', '2px', 'important');
        badge.style.setProperty('top', 'auto', 'important');
      } else {
        badge.style.setProperty('bottom', '-16px', 'important');
        badge.style.setProperty('top', 'auto', 'important');
      }
      box.appendChild(badge);

      ['tl', 'tr', 'bl', 'br'].forEach(corner => {
        const bracket = this.doc.createElement('div');
        bracket.className = `eko-linked-bracket ${corner}`;
        box.appendChild(bracket);
      });

      this.linkedBoxesContainer.appendChild(box);
    });
  }

  /**
   * Sets the elements to highlight as changed and updates the overlay boxes
   * @param {Set<HTMLElement>|Array<HTMLElement>} elementsSet
   * @param {boolean} isEnabled
   */
  setChangedElements(elementsSet, isEnabled = true) {
    this.changedElements = elementsSet instanceof Set ? elementsSet : new Set(elementsSet || []);
    this.showChangesEnabled = Boolean(isEnabled);
    this._renderChangedBoxes();
  }

  setBreakpoint(newBreakpoint) {
    this.breakpoint = newBreakpoint || 'universal';
    this._renderChangedBoxes();
  }

  /**
   * Renders high-visibility floating highlight boxes around changed elements,
   * static/draggable left and right futuristic HUD tags, and clean circuit traces
   * connecting each tag to its nearest modified elements with zero layout shift.
   */
  _renderChangedBoxes() {
    if (!this.changedBoxesContainer || !this.doc) return;

    // If Show Changes is OFF, hide all highlight boxes, circuit traces, and both tags completely
    if (!this.showChangesEnabled) {
      this.changedBoxesContainer.innerHTML = '';
      if (this.circuitSvg) this.circuitSvg.innerHTML = '';
      if (this.leftTag) {
        this.leftTag.classList.remove('is-active-visible');
        this.leftTag.style.setProperty('display', 'none', 'important');
        this.leftTag.style.pointerEvents = 'none';
      }
      if (this.rightTag) {
        this.rightTag.classList.remove('is-active-visible');
        this.rightTag.style.setProperty('display', 'none', 'important');
        this.rightTag.style.pointerEvents = 'none';
        this.isDraggingRight = false;
      }
      return;
    }

    const viewportHeight = this.win.innerHeight || (this.doc.documentElement && this.doc.documentElement.clientHeight) || 800;
    const viewportWidth = this.win.innerWidth || (this.doc.documentElement && this.doc.documentElement.clientWidth) || 1000;
    const iframeWidth = (this.iframe && this.iframe.offsetWidth) ? this.iframe.offsetWidth : viewportWidth;
    const isMobileMode = Boolean(this.breakpoint === 'mobile' || iframeWidth <= 520 || viewportWidth <= 520);
    const midX = viewportWidth / 2;

    this.changedBoxesContainer.innerHTML = '';

    // Collect visible modified elements and their bounding boxes
    const visibleItems = [];

    if (this.changedElements && this.changedElements.size > 0) {
      this.changedElements.forEach(el => {
        if (!el || !el.isConnected) return;
        const rect = this._getElementContainerRect(el) || el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        // Filter out elements scrolled completely outside viewport
        if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) return;

        const box = this.doc.createElement('div');
        box.className = 'eko-changed-box';
        box.style.display = 'block';
        box.style.width = `${Math.round(rect.width)}px`;
        box.style.height = `${Math.round(rect.height)}px`;
        box.style.left = `${Math.round(rect.left)}px`;
        box.style.top = `${Math.round(rect.top)}px`;
        this.changedBoxesContainer.appendChild(box);

        visibleItems.push({
          el,
          rect,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2
        });
      });
    }

    // Partition elements to left or right tag based on closest side (or all to left for mobile mode)
    const leftItems = [];
    const rightItems = [];

    visibleItems.forEach(item => {
      if (isMobileMode || item.centerX <= midX) {
        leftItems.push(item);
      } else {
        rightItems.push(item);
      }
    });

    // Tags position: Default to vertically centered (viewportHeight / 2) unless dragged by user
    const defaultTagY = Math.round(viewportHeight / 2);
    const leftY = Math.max(20, Math.min(viewportHeight - 20, this.leftTagY !== null ? this.leftTagY : defaultTagY));
    const rightY = Math.max(20, Math.min(viewportHeight - 20, this.rightTagY !== null ? this.rightTagY : defaultTagY));

    // Position Left Tag (Always displayed when Show Changes is ON; shows count or '-')
    if (this.leftTag) {
      this.leftTag.classList.add('is-active-visible');
      this.leftTag.style.setProperty('display', 'flex', 'important');
      this.leftTag.style.pointerEvents = 'auto';
      this.leftTag.style.top = `${leftY}px`;
      this.leftTag.style.transform = 'translateY(-50%)';
      const countEl = this.leftTag.querySelector('#circuit-left-count');
      if (countEl) {
        countEl.textContent = leftItems.length > 0 ? `${leftItems.length}` : '-';
      }
    }

    // Position Right Tag (Always displayed on desktop/universal when Show Changes is ON; completely disabled & hidden in mobile mode)
    if (this.rightTag) {
      if (!isMobileMode) {
        this.rightTag.classList.add('is-active-visible');
        this.rightTag.style.setProperty('display', 'flex', 'important');
        this.rightTag.style.pointerEvents = 'auto';
        this.rightTag.style.top = `${rightY}px`;
        this.rightTag.style.transform = 'translateY(-50%)';
        const countEl = this.rightTag.querySelector('#circuit-right-count');
        if (countEl) {
          countEl.textContent = rightItems.length > 0 ? `${rightItems.length}` : '-';
        }
      } else {
        this.rightTag.classList.remove('is-active-visible');
        this.rightTag.style.setProperty('display', 'none', 'important');
        this.rightTag.style.pointerEvents = 'none';
        this.isDraggingRight = false;
      }
    }

    // If no visible changes, clear the circuit line canvas
    if (visibleItems.length === 0) {
      if (this.circuitSvg) this.circuitSvg.innerHTML = '';
      return;
    }

    // Draw futuristic circuit lines on SVG
    if (!this.circuitSvg) return;

    this.circuitSvg.setAttribute('width', `${viewportWidth}`);
    this.circuitSvg.setAttribute('height', `${viewportHeight}`);
    this.circuitSvg.setAttribute('viewBox', `0 0 ${viewportWidth} ${viewportHeight}`);

    let svgHtml = `
      <defs>
        <linearGradient id="circuitGradLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FFFF00" stop-opacity="1" />
          <stop offset="100%" stop-color="#FFFF00" stop-opacity="1" />
        </linearGradient>
        <linearGradient id="circuitGradRight" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#FFFF00" stop-opacity="1" />
          <stop offset="100%" stop-color="#FFFF00" stop-opacity="1" />
        </linearGradient>
      </defs>
    `;

    // Coordinates of left and right tag connection nodes
    const leftTagRect = this.leftTag && this.leftTag.classList.contains('is-active-visible') ? this.leftTag.getBoundingClientRect() : null;
    const rightTagRect = this.rightTag && !isMobileMode && this.rightTag.classList.contains('is-active-visible') ? this.rightTag.getBoundingClientRect() : null;

    const leftNodeX = leftTagRect ? leftTagRect.right - 2.5 : 100;
    const leftNodeY = leftTagRect ? leftTagRect.top + leftTagRect.height / 2 : leftY;

    const rightNodeX = rightTagRect ? rightTagRect.left + 2.5 : viewportWidth - 100;
    const rightNodeY = rightTagRect ? rightTagRect.top + rightTagRect.height / 2 : rightY;

    // Standoff clearance distance between the terminal dot and the highlighted box edge
    const STANDOFF_GAP = 14;
    // Disconnect gap between dots and dashed line endpoints
    const DASH_GAP = 7;

    // Helper: calculate evenly spaced dash array with exactly 3.5px spacing/gaps between dashes
    const getEvenDashArray = (length) => {
      const len = Math.max(8, length);
      const targetDash = 5;
      const targetGap = 3.5;
      const cycle = targetDash + targetGap; // 8.5px
      const N = Math.max(1, Math.round(len / cycle));
      const gap = 3.5;
      const dash = Math.max(2, (len - (N * gap)) / N);
      return `${dash.toFixed(2)} ${gap.toFixed(2)}`;
    };

    // Helper: render a single disconnected dashed segment between two points with complete even dashes
    const renderCircuitSegment = (x1, y1, x2, y2) => {
      const dist = Math.hypot(x2 - x1, y2 - y1);
      if (dist <= DASH_GAP * 2 + 2) return ''; // Distance too short for dashes

      const ux = (x2 - x1) / dist;
      const uy = (y2 - y1) / dist;

      const sx = x1 + ux * DASH_GAP;
      const sy = y1 + uy * DASH_GAP;
      const ex = x2 - ux * DASH_GAP;
      const ey = y2 - uy * DASH_GAP;

      const segLen = dist - DASH_GAP * 2;
      const dashArr = getEvenDashArray(segLen);
      const pathD = `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}`;

      return `
        <path d="${pathD}" fill="none" stroke="#000000" stroke-width="3.5" stroke-dasharray="${dashArr}" stroke-linecap="round" opacity="0.95" />
        <path d="${pathD}" fill="none" stroke="#FFFF00" stroke-width="2" stroke-dasharray="${dashArr}" stroke-linecap="round" opacity="1" />
      `;
    };

    // Helper: render high-contrast glowing dot at a joint vertex
    const renderJointDot = (cx, cy) => `
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="#000000" />
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.5" fill="#FFFF00" stroke="#FFFFFF" stroke-width="1" />
    `;

    // Helper: render separate circuit lines for each changed element originating directly from root
    const renderTracesForSide = (items, rootX, rootY, isLeft) => {
      if (!items || items.length === 0) return '';
      let markup = '';

      // Prepare items with clamped viewport boundaries and standoff clearances
      const prepared = items.map(item => {
        const targetY = Math.max(10, Math.min(viewportHeight - 10, item.centerY));
        const endDotX = isLeft
          ? Math.max(rootX + 35, item.rect.left - STANDOFF_GAP)
          : Math.min(rootX - 35, item.rect.right + STANDOFF_GAP);
        return { item, targetY, endDotX };
      });

      // Render single root dot at the tag connection point (never duplicated or overlapping)
      markup += renderJointDot(rootX, rootY);

      // Separate circuit line for each changed element originating directly from the root node
      prepared.forEach(({ item, targetY, endDotX }, idx) => {
        const isDirect = Math.abs(targetY - rootY) < 6;

        if (isDirect) {
          // Direct horizontal trace from root to terminal dot
          markup += renderCircuitSegment(rootX, rootY, endDotX, targetY);
          markup += renderJointDot(endDotX, targetY);
        } else {
          // Dedicated circuit trace angled from root to horizontal lead level
          const minX = isLeft ? rootX + 24 : endDotX + 16;
          const maxX = isLeft ? endDotX - 16 : rootX - 24;

          let cornerX;
          if (isLeft) {
            cornerX = rootX + (endDotX - rootX) * 0.4 + (idx * 8);
            if (maxX > minX) {
              cornerX = Math.max(minX, Math.min(maxX, cornerX));
            } else {
              cornerX = (rootX + endDotX) / 2;
            }
          } else {
            cornerX = rootX - (rootX - endDotX) * 0.4 - (idx * 8);
            if (maxX > minX) {
              cornerX = Math.max(minX, Math.min(maxX, cornerX));
            } else {
              cornerX = (rootX + endDotX) / 2;
            }
          }

          // 2 clean non-overlapping segments:
          // 1. Direct diagonal trace from root node to the element's turn point
          markup += renderCircuitSegment(rootX, rootY, cornerX, targetY);
          // 2. Horizontal trace from turn point to terminal dot
          markup += renderCircuitSegment(cornerX, targetY, endDotX, targetY);

          // Place joint dot at corner and terminal dot at highlighted box
          markup += renderJointDot(cornerX, targetY);
          markup += renderJointDot(endDotX, targetY);
        }
      });

      return markup;
    };

    // Draw traces for Left items
    if (leftItems.length > 0 && leftTagRect) {
      svgHtml += renderTracesForSide(leftItems, leftNodeX, leftNodeY, true);
    }

    // Draw traces for Right items (only if not mobile mode)
    if (!isMobileMode && rightItems.length > 0 && rightTagRect) {
      svgHtml += renderTracesForSide(rightItems, rightNodeX, rightNodeY, false);
    }

    this.circuitSvg.innerHTML = svgHtml;
  }

  /**
   * Calculates the true container rect for an element on the website canvas.
   * For images and elements with transforms/focal repositioning, ensures the inspect
   * outline remains locked to the visual container size and is never affected by internal
   * image scaling or zoom adjustments.
   */
  _getElementContainerRect(targetEl) {
    if (!targetEl || !targetEl.getBoundingClientRect) return null;

    const isImg = targetEl.tagName === 'IMG';
    const hasTransform = Boolean(targetEl.style && (targetEl.style.transform || targetEl.style.objectPosition || targetEl.style.backgroundPosition));

    if (isImg || hasTransform) {
      const parent = targetEl.parentElement;
      if (parent && parent !== this.doc.body && parent !== this.doc.documentElement) {
        const parentStyle = this.win.getComputedStyle ? this.win.getComputedStyle(parent) : null;
        const parentOverflow = parentStyle ? (parentStyle.overflow || '') : '';
        const isClipping = parentOverflow === 'hidden' || parentOverflow === 'clip' || parentOverflow === 'auto';

        if (isClipping || parent.classList.contains('catalog-hero-img-wrap') || parent.classList.contains('catalog-tile')) {
          const pRect = parent.getBoundingClientRect();
          if (pRect.width > 0 && pRect.height > 0) {
            return pRect;
          }
        }
      }

      // If untransformed layout dimensions exist on the element:
      if (targetEl.offsetWidth > 0 && targetEl.offsetHeight > 0) {
        const rect = targetEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const w = targetEl.offsetWidth;
        const h = targetEl.offsetHeight;
        return {
          left: centerX - w / 2,
          top: centerY - h / 2,
          right: centerX + w / 2,
          bottom: centerY + h / 2,
          width: w,
          height: h
        };
      }
    }

    return targetEl.getBoundingClientRect();
  }

  _renderBox(boxEl, badgeEl, targetEl, isSelected) {
    if (!boxEl || !targetEl || !targetEl.getBoundingClientRect || this.mode !== 'select') {
      if (boxEl) boxEl.style.display = 'none';
      return;
    }

    const rect = this._getElementContainerRect(targetEl) || targetEl.getBoundingClientRect();
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
      const isLinkedGroup = isSelected && this.linkedElements && this.linkedElements.length > 1 && this.linkedElements.includes(targetEl);
      if (isLinkedGroup) {
        const activeIdx = this.linkedElements.indexOf(targetEl) + 1;
        const total = this.linkedElements.length;
        badgeEl.className = 'eko-linked-badge';
        badgeEl.innerHTML = `<span>🔗 ${activeIdx}/${total}</span>`;
        badgeEl.style.setProperty('display', 'flex', 'important');
        badgeEl.style.setProperty('right', '0px', 'important');
        badgeEl.style.setProperty('left', 'auto', 'important');
        if (rect.bottom > viewportHeight - 18) {
          badgeEl.style.setProperty('bottom', '2px', 'important');
          badgeEl.style.setProperty('top', 'auto', 'important');
        } else {
          badgeEl.style.setProperty('bottom', '-16px', 'important');
          badgeEl.style.setProperty('top', 'auto', 'important');
        }
      } else {
        badgeEl.style.setProperty('display', 'none', 'important');
        badgeEl.innerHTML = '';
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
      this.doc.removeEventListener('pointermove', this._boundOnPointerMove);
      this.doc.removeEventListener('pointerup', this._boundOnPointerUp);
      this.doc.removeEventListener('pointercancel', this._boundOnPointerUp);
      const styleTag = this.doc.getElementById('eko-overlay-styles');
      if (styleTag) styleTag.remove();
    }
    if (this.win) {
      this.win.removeEventListener('scroll', this._boundOnScroll);
      this.win.removeEventListener('resize', this._boundOnResize);
    }
    if (this.overlayRoot) {
      this.overlayRoot.remove();
    }
    if (this.linkedBoxesContainer) {
      this.linkedBoxesContainer.remove();
    }
    this.linkedElements = [];
  }
}
