/**
 * Kinetic Fast Smooth Scroll Utility
 * 
 * Provides a fast, direct scroll animation with high initial velocity and
 * a refined deceleration phase that only settles when approaching the final destination.
 * Avoids sluggish browser smooth scroll curves while feeling snappy and premium.
 */

let activeAnimation = null;

/**
 * Perform a fast smooth scroll to an element, selector, or pixel position.
 * 
 * @param {HTMLElement|string|number} target - Target element, ID/selector, or pixel Y
 * @param {Object} [options]
 * @param {HTMLElement|Window} [options.container=window] - Scroll container
 * @param {number} [options.offset=0] - Additional pixel offset
 * @param {number} [options.duration] - Custom duration in ms
 * @param {Function} [options.onComplete] - Callback on finish
 */
export function fastSmoothScrollTo(target, options = {}) {
  // Cancel existing animation if running
  if (activeAnimation) {
    cancelAnimationFrame(activeAnimation.frameId);
    activeAnimation.cleanup();
    activeAnimation = null;
  }

  // Resolve target element if string
  let targetEl = null;
  let targetY = 0;

  if (typeof target === 'string') {
    const cleanId = target.replace(/^#/, '');
    targetEl = document.getElementById(cleanId) || document.querySelector(target);
  } else if (target instanceof HTMLElement) {
    targetEl = target;
  } else if (typeof target === 'number') {
    targetY = target;
  }

  // Auto-detect container if not explicitly provided
  let container = options.container;
  if (!container) {
    if (targetEl && targetEl.closest && targetEl.closest('.fullscreen-view-container')) {
      container = targetEl.closest('.fullscreen-view-container');
    } else {
      container = window;
    }
  }

  const isWindow = container === window || container === document.documentElement || container === document.body;

  // Calculate start scroll position and target scroll position
  const startY = isWindow ? window.scrollY : container.scrollTop;

  if (targetEl) {
    if ((targetEl.id === 'top' || target === 'top') && isWindow) {
      targetY = 0;
    } else if (isWindow) {
      const rect = targetEl.getBoundingClientRect();
      targetY = rect.top + window.scrollY;
    } else {
      const containerRect = container.getBoundingClientRect();
      const rect = targetEl.getBoundingClientRect();
      targetY = (rect.top - containerRect.top) + container.scrollTop;
    }
  }

  if (options.offset) {
    targetY += options.offset;
  }

  // Clamp target within scroll bounds
  const maxScroll = isWindow
    ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    : Math.max(0, container.scrollHeight - container.clientHeight);

  targetY = Math.max(0, Math.min(targetY, maxScroll));
  const distance = targetY - startY;

  // Already at destination
  if (Math.abs(distance) < 2) {
    if (isWindow) window.scrollTo(0, targetY);
    else container.scrollTop = targetY;
    if (typeof options.onComplete === 'function') options.onComplete();
    return;
  }

  // Snappy timing: scales smoothly with distance (260ms - 460ms max)
  const absDist = Math.abs(distance);
  const duration = typeof options.duration === 'number'
    ? options.duration
    : Math.min(460, Math.max(260, 220 + Math.log10(Math.max(10, absDist)) * 75));

  const startTime = performance.now();

  // Premium curve: Quartic ease-out (1 - (1 - t)^3.6).
  // High initial speed, direct transit through the majority of distance,
  // with a tight, refined deceleration settling only near the finish.
  const easeOutNearEnd = (t) => 1 - Math.pow(1 - t, 3.6);

  let isCancelled = false;

  const interruptEvents = ['wheel', 'touchstart', 'touchmove', 'keydown'];
  const onUserInterrupt = (e) => {
    if (e.type === 'keydown') {
      const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'];
      if (!scrollKeys.includes(e.code)) return;
    }
    isCancelled = true;
    if (activeAnimation) {
      cancelAnimationFrame(activeAnimation.frameId);
      activeAnimation.cleanup();
      activeAnimation = null;
    }
  };

  const cleanup = () => {
    const targetEventHost = isWindow ? window : container;
    interruptEvents.forEach(evt => {
      targetEventHost.removeEventListener(evt, onUserInterrupt, { passive: true });
    });
  };

  const targetEventHost = isWindow ? window : container;
  interruptEvents.forEach(evt => {
    targetEventHost.addEventListener(evt, onUserInterrupt, { passive: true });
  });

  function step(now) {
    if (isCancelled) return;

    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = easeOutNearEnd(progress);
    const currentY = startY + distance * ease;

    if (isWindow) {
      window.scrollTo(0, currentY);
    } else {
      container.scrollTop = currentY;
    }

    if (progress < 1) {
      const frameId = requestAnimationFrame(step);
      activeAnimation.frameId = frameId;
    } else {
      if (isWindow) window.scrollTo(0, targetY);
      else container.scrollTop = targetY;
      cleanup();
      activeAnimation = null;
      if (typeof options.onComplete === 'function') options.onComplete();
    }
  }

  const frameId = requestAnimationFrame(step);
  activeAnimation = { frameId, cleanup };
}
