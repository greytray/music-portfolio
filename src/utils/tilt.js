/**
 * Card 3D Perspective Tilt & Weight Press Physics System
 * 
 * Physics Behavior:
 * - When the cursor moves towards sides or corners: the card feels the physical weight
 *   of the cursor point and gets depressed inwards into the Z-axis, creating a satisfying
 *   perspective shift where the pressed side sinks and the opposite side elevates.
 * - For "Now Playing" card: preserves the calibrated gentle cinematic response.
 * - For all other cards: refined responsive speed (hoverLerp: 0.22), near-instant start on hover,
 *   and decreased effort to reach maximum tilt without exceeding maximum tilt limit.
 * - Real-time client bounding calculation ensures 100% accurate cursor tracking without offset drift.
 * - Cursor reactor liquid shine dissolves in-place at the exact exit spot on pointer leave.
 * - Organic staggered floating levitation animations remain intact.
 */

const BASE_TILT_DEG = 8.5; // Base maximum tilt angle in degrees
const BASE_DEPRESS_PX = 7; // Inward depth displacement in pixels

const activeCards = new WeakSet();

/**
 * Initializes cursor weight-press tilt on an individual card element.
 * @param {HTMLElement} card - The card DOM element
 * @param {number} [index=0] - Index for staggered floating rhythm
 */
export function attachTiltToCard(card, index = 0) {
  if (!card || activeCards.has(card)) return;
  activeCards.add(card);

  const isNowPlaying = card.classList.contains('now-playing') || 
                       card.id === 'now-playing' || 
                       Boolean(card.closest('.now-playing'));

  // Set card floating index for CSS staggered floating rhythm
  card.style.setProperty('--card-float-delay', `${(index % 8) * 0.45}s`);
  card.classList.add('floating-card-item');

  let state = {
    rafId: null,
    isHovered: false,
    currentRx: 0,
    currentRy: 0,
    currentTz: 0,
    targetRx: 0,
    targetRy: 0,
    targetTz: 0
  };

  // Calibrate dynamics:
  // - Now Playing: smooth & gentle cinematic lerp
  // - Other Cards: slightly slower and refined (0.22 hover, 0.10 decay) for buttery smooth reaction
  const deadZone = isNowPlaying ? 0.04 : 0.01;
  const hoverLerp = isNowPlaying ? 0.14 : 0.22;
  const decayLerp = isNowPlaying ? 0.08 : 0.10;

  function update() {
    const currentLerp = state.isHovered ? hoverLerp : decayLerp;
    state.currentRx += (state.targetRx - state.currentRx) * currentLerp;
    state.currentRy += (state.targetRy - state.currentRy) * currentLerp;
    state.currentTz += (state.targetTz - state.currentTz) * currentLerp;

    const hasSignificantMotion = 
      Math.abs(state.targetRx - state.currentRx) > 0.005 ||
      Math.abs(state.targetRy - state.currentRy) > 0.005 ||
      Math.abs(state.targetTz - state.currentTz) > 0.005 ||
      state.isHovered;

    if (hasSignificantMotion) {
      card.style.transform = `perspective(1000px) rotateX(${state.currentRx.toFixed(3)}deg) rotateY(${state.currentRy.toFixed(3)}deg) translateZ(${state.currentTz.toFixed(3)}px)`;
      state.rafId = requestAnimationFrame(update);
    } else {
      card.style.transform = '';
      card.classList.remove('is-tilting');
      state.rafId = null;
    }
  }

  function onPointerMove(e) {
    // Always retrieve live bounding rectangle to ensure 100% accurate coordinates
    // regardless of page scrolling, dynamic viewport shifts, or floating animations.
    const rect = card.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Normalized raw offset from center: -1 (top/left) to +1 (bottom/right)
    let rawDx = (e.clientX - cx) / (rect.width / 2);
    let rawDy = (e.clientY - cy) / (rect.height / 2);

    rawDx = Math.max(-1, Math.min(1, rawDx));
    rawDy = Math.max(-1, Math.min(1, rawDy));

    const rawDist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    // Responsive liquid shine coordinates clamped safely to 0-100%
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    card.style.setProperty('--liquid-x', `${px.toFixed(2)}%`);
    card.style.setProperty('--liquid-y', `${py.toFixed(2)}%`);

    if (rawDist < deadZone) {
      state.targetRx = 0;
      state.targetRy = 0;
      state.targetTz = 0;
    } else {
      // Aspect ratio correction for balanced physics across portrait & landscape cards
      const aspectCorrectionX = Math.min(1.35, Math.max(0.75, 450 / (rect.width / 2)));
      const aspectCorrectionY = Math.min(1.35, Math.max(0.75, 80 / (rect.height / 2)));

      const maxTiltX = BASE_TILT_DEG * aspectCorrectionY;
      const maxTiltY = BASE_TILT_DEG * aspectCorrectionX;

      let factorX = rawDx;
      let factorY = rawDy;
      let factorDist = rawDist;

      if (!isNowPlaying) {
        // Decreased effort to reach maximum tilt: progressive power curve
        // Moving cursor ~50% towards edge reaches near 90-100% of max tilt limit
        const absX = Math.abs(rawDx);
        const absY = Math.abs(rawDy);
        factorX = Math.sign(rawDx) * Math.min(1.0, Math.pow(absX, 0.72) * 1.4);
        factorY = Math.sign(rawDy) * Math.min(1.0, Math.pow(absY, 0.72) * 1.4);
        factorDist = Math.min(1.0, Math.pow(rawDist, 0.72) * 1.4);
      }

      // Weight Press Physics:
      // - Cursor on top (dy < 0): top sinks inwards -> rotX is positive in CSS 3D
      // - Cursor on bottom (dy > 0): bottom sinks inwards -> rotX is negative
      // - Cursor on right (dx > 0): right sinks inwards -> rotY is positive
      // - Cursor on left (dx < 0): left sinks inwards -> rotY is negative
      state.targetRx = -factorY * maxTiltX;
      state.targetRy = factorX * maxTiltY;
      state.targetTz = -factorDist * BASE_DEPRESS_PX;
    }

    if (!state.rafId) {
      state.rafId = requestAnimationFrame(update);
    }
  }

  function onPointerEnter(e) {
    state.isHovered = true;
    card.classList.add('is-tilting');
    if (e) onPointerMove(e);
    if (!state.rafId) {
      state.rafId = requestAnimationFrame(update);
    }
  }

  function onPointerLeave() {
    state.isHovered = false;
    // NOTE: We intentionally do NOT reset --liquid-x and --liquid-y to 50%
    // so that the cursor reactor liquid glow dissolves smoothly in-place at the exact exit spot!
    
    // Target 0 resting state; keep 'is-tilting' until spring decays smoothly to 0 in update()
    state.targetRx = 0;
    state.targetRy = 0;
    state.targetTz = 0;
    if (!state.rafId) {
      state.rafId = requestAnimationFrame(update);
    }
  }

  card.addEventListener('pointerenter', onPointerEnter, { passive: true });
  card.addEventListener('pointermove', onPointerMove, { passive: true });
  card.addEventListener('pointerleave', onPointerLeave, { passive: true });
}

const CARD_SELECTORS = [
  '.now-playing',
  '.track',
  '.process-card',
  '.process-closing',
  '.service-card',
  '.delivery-panel',
  '.beat-card',
  '.license-card',
  '.session-card',
  '.kokonut-form-card',
  '.kokonut-card',
  '.upload-dropzone-card',
  '.order-card',
  '.support-card',
  '.cert-card',
  '.cart-item-card',
  '.cart-item',
  '.cart-summary-card',
  '.checkout-card',
  '.confirmed-card',
  '.liquid-glass-card'
];

let globalObserver = null;

/**
 * Scans the DOM and attaches 3D perspective tilt to all card components.
 * Also sets up a MutationObserver to automatically attach to dynamically rendered cards.
 * @param {HTMLElement|Document} [root=document] - Root container to search within
 */
export function initAllCardTilts(root = document) {
  const selector = CARD_SELECTORS.join(', ');
  const cards = root.querySelectorAll(selector);
  cards.forEach((card, index) => {
    attachTiltToCard(card, index);
  });

  // Automatically watch for dynamically added card nodes
  if (!globalObserver && typeof MutationObserver !== 'undefined') {
    globalObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.matches && node.matches(selector)) {
              attachTiltToCard(node);
            }
            const nestedCards = node.querySelectorAll ? node.querySelectorAll(selector) : [];
            nestedCards.forEach((c) => attachTiltToCard(c));
          }
        });
      });
    });

    globalObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}
