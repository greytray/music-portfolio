/**
 * Global Light-Mode Tooltip Manager for Eko Admin Interface
 * Crisp, high-contrast light-mode popovers with delayed activation and correct directional pointers.
 */

export class TooltipManager {
  constructor() {
    this.tooltipEl = null;
    this.arrowEl = null;
    this.textEl = null;
    this.activeTarget = null;
    this.showTimeout = null;
    this.hideTimeout = null;
    this.delay = 320; // 320ms hover delay so tooltips don't pop aggressively

    this.init();
  }

  init() {
    // Create single floating light tooltip
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.id = 'admin-custom-light-tooltip';
    this.tooltipEl.className = 'admin-light-tooltip';
    this.tooltipEl.setAttribute('role', 'tooltip');
    this.tooltipEl.style.display = 'none';

    this.arrowEl = document.createElement('div');
    this.arrowEl.className = 'admin-light-tooltip-arrow';
    this.tooltipEl.appendChild(this.arrowEl);

    this.textEl = document.createElement('span');
    this.textEl.className = 'admin-light-tooltip-text';
    this.tooltipEl.appendChild(this.textEl);

    document.body.appendChild(this.tooltipEl);

    // Global event delegation
    this._onMouseOver = this._handleMouseOver.bind(this);
    this._onMouseOut = this._handleMouseOut.bind(this);
    this._onClick = this._hideImmediate.bind(this);
    this._onScroll = this._hideImmediate.bind(this);

    document.addEventListener('mouseover', this._onMouseOver, true);
    document.addEventListener('mouseout', this._onMouseOut, true);
    document.addEventListener('click', this._onClick, true);
    window.addEventListener('scroll', this._onScroll, true);
  }

  _handleMouseOver(e) {
    // Exclude anything inside the preview frame or canvas
    if (e.target.closest('#admin-preview-frame, #admin-preview-container, .admin-preview-frame, iframe, #preview-frame')) {
      this._hideImmediate();
      return;
    }

    const target = e.target.closest('[data-tooltip], [title]');
    if (!target) return;

    // Convert any native title to data-tooltip to prevent browser dark popups
    if (target.hasAttribute('title')) {
      const titleVal = target.getAttribute('title');
      if (titleVal && titleVal.trim()) {
        target.setAttribute('data-tooltip', titleVal.trim());
      }
      target.removeAttribute('title');
    }

    const text = target.getAttribute('data-tooltip');
    if (!text || !text.trim()) return;

    // Ignore if already active on same target
    if (this.activeTarget === target && this.tooltipEl.style.display !== 'none') {
      return;
    }

    this.activeTarget = target;
    clearTimeout(this.showTimeout);
    clearTimeout(this.hideTimeout);

    // Enforce hover delay before displaying
    this.showTimeout = setTimeout(() => {
      if (this.activeTarget === target) {
        this._show(target, text.trim());
      }
    }, this.delay);
  }

  _handleMouseOut(e) {
    const target = e.target.closest('[data-tooltip]');
    if (target && target === this.activeTarget) {
      clearTimeout(this.showTimeout);
      this._hide();
    }
  }

  _show(target, text) {
    if (!document.body.contains(target)) return;

    this.textEl.textContent = text;
    this.tooltipEl.style.display = 'inline-flex';
    this.tooltipEl.style.opacity = '0';
    this.tooltipEl.style.transform = 'translateY(2px) scale(0.97)';

    // Position tooltip relative to target
    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();

    let top = rect.top - tooltipRect.height - 9;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let placement = 'top';

    // If clipping top screen boundary (e.g. topbar buttons), place BELOW target
    if (top < 8) {
      top = rect.bottom + 9;
      placement = 'bottom';
    }

    // Keep within horizontal screen bounds
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    this.tooltipEl.dataset.placement = placement;
    this.tooltipEl.style.top = `${Math.round(top)}px`;
    this.tooltipEl.style.left = `${Math.round(left)}px`;

    // Correct directional arrow positioning:
    // When displaying BELOW item (placement='bottom'): arrow sits on TOP edge pointing UPWARDS to the item.
    // When displaying ABOVE item (placement='top'): arrow sits on BOTTOM edge pointing DOWNWARDS to the item.
    const targetCenterX = rect.left + (rect.width / 2);
    const arrowLeft = Math.max(10, Math.min(tooltipRect.width - 10, targetCenterX - left));

    this.arrowEl.style.left = `${Math.round(arrowLeft)}px`;

    if (placement === 'bottom') {
      this.arrowEl.style.top = '-4px';
      this.arrowEl.style.bottom = 'auto';
      this.arrowEl.style.borderTop = '1px solid #cbd5e1';
      this.arrowEl.style.borderLeft = '1px solid #cbd5e1';
      this.arrowEl.style.borderBottom = 'none';
      this.arrowEl.style.borderRight = 'none';
    } else {
      this.arrowEl.style.bottom = '-4px';
      this.arrowEl.style.top = 'auto';
      this.arrowEl.style.borderBottom = '1px solid #cbd5e1';
      this.arrowEl.style.borderRight = '1px solid #cbd5e1';
      this.arrowEl.style.borderTop = 'none';
      this.arrowEl.style.borderLeft = 'none';
    }

    // Fast smooth entrance
    requestAnimationFrame(() => {
      this.tooltipEl.classList.add('is-active');
      this.tooltipEl.style.opacity = '1';
      this.tooltipEl.style.transform = 'translateY(0) scale(1)';
    });
  }

  _hide() {
    clearTimeout(this.showTimeout);
    if (!this.tooltipEl || this.tooltipEl.style.display === 'none') return;
    this.tooltipEl.classList.remove('is-active');
    this.tooltipEl.style.opacity = '0';
    this.tooltipEl.style.transform = 'translateY(2px) scale(0.97)';
    this.hideTimeout = setTimeout(() => {
      this.tooltipEl.style.display = 'none';
      this.activeTarget = null;
    }, 120);
  }

  _hideImmediate() {
    clearTimeout(this.showTimeout);
    clearTimeout(this.hideTimeout);
    if (this.tooltipEl) {
      this.tooltipEl.classList.remove('is-active');
      this.tooltipEl.style.display = 'none';
      this.tooltipEl.style.opacity = '0';
    }
    this.activeTarget = null;
  }

  destroy() {
    clearTimeout(this.showTimeout);
    clearTimeout(this.hideTimeout);
    document.removeEventListener('mouseover', this._onMouseOver, true);
    document.removeEventListener('mouseout', this._onMouseOut, true);
    document.removeEventListener('click', this._onClick, true);
    window.removeEventListener('scroll', this._onScroll, true);
    if (this.tooltipEl) this.tooltipEl.remove();
  }
}
