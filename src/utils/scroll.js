/**
 * Native Smooth Scroll Utility
 * 
 * Recreates the exact, fluid, non-jarring scroll animation from the original website.
 * Operates directly on the browser's native compositor smooth scroll engine
 * (enabled via CSS `html { scroll-behavior: smooth; }` and `scroll-margin-top`).
 * 
 * Benefits over manual JS requestAnimationFrame curves:
 * - 60fps/120fps hardware-accelerated compositor transitions without main thread jitter
 * - Natural platform-calibrated acceleration & deceleration curve that doesn't strain eyes
 * - Immediate, fluid responsiveness without fighting mouse wheel or touch gestures
 * - Seamless support for reduced motion preferences
 */

/**
 * Scroll smoothly to an element, selector, or pixel position.
 * 
 * @param {HTMLElement|string|number} target - Target element, ID/selector, or pixel Y
 * @param {Object} [options]
 * @param {number} [options.offset=0] - Additional pixel offset
 * @param {Function} [options.onComplete] - Callback on finish
 */
export function fastSmoothScrollTo(target, options = {}) {
  const isReduced = typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = isReduced ? 'auto' : 'smooth';

  // 1. Scroll to Top
  if (target === 0 || target === 'top' || target === '#top') {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior
    });
    if (typeof options.onComplete === 'function') {
      setTimeout(options.onComplete, isReduced ? 0 : 450);
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
    const rect = el.getBoundingClientRect();
    const isMobileSticky = typeof window !== 'undefined' && window.innerWidth <= 820;
    const headerEl = isMobileSticky ? document.querySelector('.site-header') : null;
    const headerOffset = (headerEl && isMobileSticky) ? headerEl.offsetHeight : 0;
    const targetY = Math.max(0, Math.round(rect.top + window.scrollY - headerOffset + (options.offset || 0)));
    window.scrollTo({
      top: targetY,
      left: 0,
      behavior
    });
  } else if (typeof target === 'number') {
    window.scrollTo({
      top: target,
      left: 0,
      behavior
    });
  }

  if (typeof options.onComplete === 'function') {
    setTimeout(options.onComplete, isReduced ? 0 : 450);
  }
}

// Aliases for compatibility
export { fastSmoothScrollTo as luxurySmoothScrollTo };
export { fastSmoothScrollTo as snapAndCoastScrollTo };
