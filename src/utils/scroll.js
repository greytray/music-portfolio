/**
 * Native Smooth Scroll Utility
 * 
 * Provides instant, zero-delay, 60fps/120fps hardware-accelerated smooth scrolling.
 * Uses native browser compositor engine to eliminate main thread jitter and lag.
 */

/**
 * Scroll smoothly to an element, selector, or pixel position with instant execution.
 * 
 * @param {HTMLElement|string|number} target - Target element, ID/selector, or pixel Y
 * @param {Object} [options]
 * @param {number} [options.offset=0] - Additional pixel offset
 * @param {Function} [options.onComplete] - Callback on finish
 */
export function fastSmoothScrollTo(target, options = {}) {
  if (typeof window === 'undefined') return;

  const isReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = isReduced ? 'auto' : 'smooth';

  // 1. Scroll to Top
  if (target === 0 || target === 'top' || target === '#top') {
    window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior });
    if (typeof options.onComplete === 'function') {
      setTimeout(options.onComplete, isReduced ? 0 : 250);
    }
    return;
  }

  // 2. Resolve Element if Target is String or HTMLElement
  let el = null;
  if (typeof target === 'string') {
    const cleanId = target.replace(/^#/, '');
    el = document.getElementById(cleanId) || document.querySelector(target);
    // Alias support between 'beats' and 'showcase'
    if (!el && cleanId === 'beats') el = document.getElementById('showcase');
    if (!el && cleanId === 'showcase') el = document.getElementById('beats');
  } else if (target instanceof HTMLElement) {
    el = target;
  }

  // 3. Perform Smooth Scroll exactly to section start
  if (el) {
    const getHeaderOffset = () => {
      const headerEl = document.querySelector('.site-header');
      if (headerEl && headerEl.offsetHeight > 0) {
        return headerEl.offsetHeight;
      }
      return window.innerWidth <= 820 ? 54 : 68;
    };

    const headerOffset = getHeaderOffset();
    const isDesktop = window.innerWidth > 820;
    const isContactTarget = target === 'contact' || target === '#contact' || (el && el.id === 'contact');

    let targetY;
    if (isContactTarget && isDesktop) {
      targetY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    } else {
      const rect = el.getBoundingClientRect();
      targetY = Math.max(0, Math.round(rect.top + window.scrollY - headerOffset + (options.offset || 0)));
    }

    window.scrollTo({ top: targetY, left: 0, behavior: scrollBehavior });
    if (typeof options.onComplete === 'function') {
      setTimeout(options.onComplete, isReduced ? 0 : 250);
    }
  } else if (typeof target === 'number') {
    window.scrollTo({ top: Math.max(0, target), left: 0, behavior: scrollBehavior });
    if (typeof options.onComplete === 'function') {
      setTimeout(options.onComplete, isReduced ? 0 : 250);
    }
  }
}

// Aliases for compatibility
export { fastSmoothScrollTo as luxurySmoothScrollTo };
export { fastSmoothScrollTo as snapAndCoastScrollTo };

