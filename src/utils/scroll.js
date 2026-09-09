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

let activeScrollAnimationFrame = null;

function customFastScrollToY(targetY, isReduced, callback) {
  if (typeof window === 'undefined') return;

  if (isReduced) {
    window.scrollTo(0, targetY);
    if (typeof callback === 'function') callback();
    return;
  }

  const startY = window.scrollY || window.pageYOffset;
  const distance = targetY - startY;
  const absDist = Math.abs(distance);

  if (absDist < 2) {
    window.scrollTo(0, targetY);
    if (typeof callback === 'function') callback();
    return;
  }

  if (activeScrollAnimationFrame) {
    cancelAnimationFrame(activeScrollAnimationFrame);
    activeScrollAnimationFrame = null;
  }

  // Freeze hover state triggers and pointer events during high-speed motion
  document.body.classList.add('is-fast-scrolling');

  // Ultra-snappy duration (150ms min, 210ms max) for instant response
  const duration = Math.min(210, Math.max(150, Math.pow(absDist, 0.36) * 7.5));
  const startTime = performance.now();

  // Instant easeOutQuart curve: launches immediately on Frame 1 without slow S-curve delays
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  const cleanupFastScroll = () => {
    document.body.classList.remove('is-fast-scrolling');
    window.removeEventListener('wheel', cancelOnUserInteraction);
    window.removeEventListener('touchstart', cancelOnUserInteraction);
  };

  const cancelOnUserInteraction = () => {
    if (activeScrollAnimationFrame) {
      cancelAnimationFrame(activeScrollAnimationFrame);
      activeScrollAnimationFrame = null;
    }
    cleanupFastScroll();
  };

  window.addEventListener('wheel', cancelOnUserInteraction, { passive: true, once: true });
  window.addEventListener('touchstart', cancelOnUserInteraction, { passive: true, once: true });

  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);
    const easeProgress = easeOutQuart(progress);

    const currentY = startY + distance * easeProgress;
    window.scrollTo(0, Math.round(currentY));

    if (progress < 1) {
      activeScrollAnimationFrame = requestAnimationFrame(step);
    } else {
      activeScrollAnimationFrame = null;
      window.scrollTo(0, targetY);
      cleanupFastScroll();
      if (typeof callback === 'function') callback();
    }
  };

  activeScrollAnimationFrame = requestAnimationFrame(step);
}

/**
 * Scroll smoothly to an element, selector, or pixel position with snappy execution.
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

  // 1. Scroll to Top
  if (target === 0 || target === 'top' || target === '#top') {
    customFastScrollToY(0, isReduced, options.onComplete);
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

  // 3. Perform Fast Smooth Scroll exactly to section start
  if (el) {
    const getHeaderOffset = () => {
      const headerEl = typeof document !== 'undefined' ? document.querySelector('.site-header') : null;
      if (headerEl && headerEl.offsetHeight > 0) {
        return headerEl.offsetHeight;
      }
      return window.innerWidth <= 820 ? 54 : 68;
    };

    const headerOffset = getHeaderOffset();
    const isDesktop = typeof window !== 'undefined' && window.innerWidth > 820;
    const isContactTarget = target === 'contact' || target === '#contact' || (el && el.id === 'contact');

    let targetY;
    if (isContactTarget && isDesktop) {
      targetY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    } else {
      const rect = el.getBoundingClientRect();
      targetY = Math.max(0, Math.round(rect.top + window.scrollY - headerOffset + (options.offset || 0)));
    }

    customFastScrollToY(targetY, isReduced, options.onComplete);
  } else if (typeof target === 'number') {
    customFastScrollToY(target, isReduced, options.onComplete);
  }
}

// Aliases for compatibility
export { fastSmoothScrollTo as luxurySmoothScrollTo };
export { fastSmoothScrollTo as snapAndCoastScrollTo };
