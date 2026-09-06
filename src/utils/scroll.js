/**
 * Snap & Coast Luxury Smooth Scroll Utility
 * 
 * Delivers a "Snap & Coast" kinetic motion profile:
 * 1. Aggressive Ease-In: Accelerates almost instantly at the very start.
 * 2. Ultra-Fast Middle: Blasts through intermediary content in ~120-160ms so it feels like
 *    a crisp, intentional cut rather than a long, dizzying blur.
 * 3. Luxurious Ease-Out: Spends ~75-80% of its total animation time gently gliding and
 *    coasting into a perfectly soft, pillowy stop at the exact destination.
 * 4. Shorter Capped Duration: Maximum scroll time is capped so it never drags, even across
 *    thousands of pixels.
 */

// ============================================================================
// SNAP & COAST CONFIGURATION
// Tweak these variables to adjust peak velocity, snap intensity, and coast softness.
// ============================================================================
export const SCROLL_CONFIG = {
  // --- DURATION CAPS (in milliseconds) ---
  minDuration: 420, // Base duration for short jumps
  maxDuration: 420, // HARD CEILING: lower (e.g. 650) for quicker arrival, higher (e.g. 850) for more glide
  distanceScale: 0.085, // How duration scales with distance

  // --- PEAK SPEED & SNAP INTENSITY (P1 of cubic-bezier) ---
  snapX: 0.35, // Lower (e.g. 0.05) = sharper, more instantaneous takeoff
  snapY: 0.88, // Higher (e.g. 0.88) = covers more of the distance upfront in a flash

  // --- SOFTNESS OF FINAL STOP (P2 of cubic-bezier) ---
  coastX: 0.25, // Lower (e.g. 0.14) = longer, softer feather-light coast; Higher (e.g. 0.25) = firmer stop
  coastY: 1.0,  // Keep at 1.0 for an exact landing without overshoot
};

let activeAnimation = null;

/**
 * High-precision Cubic-Bezier curve generator (Newton-Raphson + Bisection fallback)
 * Standard W3C CSS cubic-bezier specification implementation.
 */
function createCubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t) {
    return ((ax * t + bx) * t + cx) * t;
  }

  function sampleCurveY(t) {
    return ((ay * t + by) * t + cy) * t;
  }

  function sampleCurveDerivativeX(t) {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveCurveX(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Fast Newton-Raphson iteration
    let t = x;
    for (let i = 0; i < 8; i++) {
      const currentX = sampleCurveX(t) - x;
      if (Math.abs(currentX) < 1e-6) return t;
      const dX = sampleCurveDerivativeX(t);
      if (Math.abs(dX) < 1e-6) break;
      t -= currentX / dX;
    }

    // High-accuracy Bisection fallback if derivative near zero
    let t0 = 0;
    let t1 = 1;
    t = x;
    while (t0 < t1) {
      const currentX = sampleCurveX(t);
      if (Math.abs(currentX - x) < 1e-6) return t;
      if (x > currentX) t0 = t;
      else t1 = t;
      t = (t1 + t0) * 0.5;
    }
    return t;
  }

  return function ease(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleCurveY(solveCurveX(x));
  };
}

/**
 * The Snap & Coast curve:
 * Launches with near-vertical acceleration (80%+ covered in ~20% of duration),
 * followed by a long, silky, pillowy coast that smoothly levels out to zero velocity.
 */
let cachedEase = null;
let lastEaseKey = '';

export function getSnapAndCoastEase() {
  const key = `${SCROLL_CONFIG.snapX}_${SCROLL_CONFIG.snapY}_${SCROLL_CONFIG.coastX}_${SCROLL_CONFIG.coastY}`;
  if (!cachedEase || lastEaseKey !== key) {
    cachedEase = createCubicBezier(
      SCROLL_CONFIG.snapX,
      SCROLL_CONFIG.snapY,
      SCROLL_CONFIG.coastX,
      SCROLL_CONFIG.coastY
    );
    lastEaseKey = key;
  }
  return cachedEase;
}

export const snapAndCoastEase = (t) => getSnapAndCoastEase()(t);

// Backward-compatible alias
export const luxuryPillowyEase = snapAndCoastEase;

/**
 * Calculate dynamic duration based on travel distance with a strict upper ceiling.
 */
export function calculateDynamicDuration(distance) {
  const absDist = Math.abs(distance);
  if (absDist <= 200) {
    return SCROLL_CONFIG.minDuration;
  }
  // Sub-linear curve with strict cap to prevent long, dizzying scroll drags
  const computed = SCROLL_CONFIG.minDuration + Math.sqrt(absDist) * (SCROLL_CONFIG.distanceScale * 80);
  return Math.min(SCROLL_CONFIG.maxDuration, Math.max(SCROLL_CONFIG.minDuration, Math.round(computed)));
}

/**
 * Perform a Snap & Coast smooth scroll to an element, selector, or pixel position.
 * 
 * @param {HTMLElement|string|number} target - Target element, ID/selector, or pixel Y
 * @param {Object} [options]
 * @param {HTMLElement|Window} [options.container=window] - Scroll container
 * @param {number} [options.offset=0] - Additional pixel offset
 * @param {number} [options.duration] - Custom duration in ms (auto-computed if omitted)
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

      // When the mobile/tablet sticky header is active, offset target to keep comfortable breathing space
      const siteHeader = document.querySelector('.site-header');
      if (siteHeader) {
        const headerStyle = window.getComputedStyle(siteHeader);
        if (headerStyle.position === 'sticky' || headerStyle.position === 'fixed') {
          targetY = Math.max(0, targetY - siteHeader.offsetHeight);
        }
      }
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

  // Respect reduced-motion preferences
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (isWindow) window.scrollTo(0, targetY);
    else container.scrollTop = targetY;
    if (typeof options.onComplete === 'function') options.onComplete();
    return;
  }

  // Already at destination
  if (Math.abs(distance) < 2) {
    if (isWindow) window.scrollTo(0, targetY);
    else container.scrollTop = targetY;
    if (typeof options.onComplete === 'function') options.onComplete();
    return;
  }

  // Dynamic duration adapting to distance traveled with strict ceiling cap
  const duration = typeof options.duration === 'number'
    ? options.duration
    : calculateDynamicDuration(distance);

  const startTime = performance.now();
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
    const ease = snapAndCoastEase(progress);
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

// Aliases for semantic clarity
export { fastSmoothScrollTo as luxurySmoothScrollTo };
export { fastSmoothScrollTo as snapAndCoastScrollTo };

