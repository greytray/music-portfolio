/**
 * Card 3D Perspective Tilt & Weight Press Physics System
 * 
 * Physics Behavior:
 * - When the cursor moves towards sides or corners: the card feels the physical weight
 *   of the cursor point and gets depressed inwards into the Z-axis.
 * - Optimized with cached bounding rects and single-rAF updates to eliminate layout thrashing.
 * - Zero frame drops during pointer movement over cards.
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

  // Strictly skip Buy Beats, Sessions, Send Audio, Orders, and any full-screen view sections
  if (
    card.closest('.fullscreen-view-container') ||
    card.closest('.beats-view, .sessions-view, .send-audio-view, .orders-view, .cart-view') ||
    card.matches('.beat-card, .license-card, .session-card, .kokonut-form-card, .kokonut-card, .upload-dropzone-card, .dropzone, .order-card, .support-card, .cert-card, .cart-item-card, .cart-summary-card, .checkout-card')
  ) {
    return;
  }

  activeCards.add(card);

  const isNowPlaying = card.classList.contains('now-playing') || 
                       card.id === 'now-playing' || 
                       Boolean(card.closest('.now-playing'));

  const isTrack = (card.classList.contains('track') || Boolean(card.closest('.track'))) && !isNowPlaying;

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
    targetTz: 0,
    liquidX: 50,
    liquidY: 50,
    lastSetLiquidX: 50,
    lastSetLiquidY: 50
  };

  const deadZone = isNowPlaying ? 0.04 : 0.01;
  const hoverLerp = isNowPlaying ? 0.14 : 0.22;
  const decayLerp = isNowPlaying ? 0.08 : 0.10;

  function update() {
    if (document.hidden || !card.isConnected || document.body.classList.contains('modal-open')) {
      card.style.transform = '';
      card.classList.remove('is-tilting');
      state.rafId = null;
      return;
    }

    const currentLerp = state.isHovered ? hoverLerp : decayLerp;
    state.currentRx += (state.targetRx - state.currentRx) * currentLerp;
    state.currentRy += (state.targetRy - state.currentRy) * currentLerp;
    state.currentTz += (state.targetTz - state.currentTz) * currentLerp;

    // Apply liquid shine coordinates smoothly
    if (Math.abs(state.liquidX - state.lastSetLiquidX) > 0.1 || Math.abs(state.liquidY - state.lastSetLiquidY) > 0.1) {
      card.style.setProperty('--liquid-x', `${state.liquidX.toFixed(1)}%`);
      card.style.setProperty('--liquid-y', `${state.liquidY.toFixed(1)}%`);
      state.lastSetLiquidX = state.liquidX;
      state.lastSetLiquidY = state.liquidY;
    }

    const hasSignificantMotion = 
      Math.abs(state.targetRx - state.currentRx) > 0.01 ||
      Math.abs(state.targetRy - state.currentRy) > 0.01 ||
      Math.abs(state.targetTz - state.currentTz) > 0.01 ||
      state.isHovered;

    if (hasSignificantMotion) {
      card.style.transform = `perspective(1000px) rotateX(${state.currentRx.toFixed(2)}deg) rotateY(${state.currentRy.toFixed(2)}deg) translateZ(${state.currentTz.toFixed(2)}px)`;
      state.rafId = requestAnimationFrame(update);
    } else {
      state.currentRx = 0;
      state.currentRy = 0;
      state.currentTz = 0;
      card.style.transform = '';
      card.classList.remove('is-tilting');
      state.rafId = null;
    }
  }

  function onPointerMove(e) {
    const rect = card.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let rawDx = (e.clientX - cx) / (rect.width / 2);
    let rawDy = (e.clientY - cy) / (rect.height / 2);

    rawDx = Math.max(-1, Math.min(1, rawDx));
    rawDy = Math.max(-1, Math.min(1, rawDy));

    const rawDist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    // Responsive liquid shine coordinates
    state.liquidX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    state.liquidY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (rawDist < deadZone) {
      state.targetRx = 0;
      state.targetRy = 0;
      state.targetTz = 0;
    } else {
      const aspectCorrectionX = Math.min(1.35, Math.max(0.75, 450 / (rect.width / 2)));
      const aspectCorrectionY = Math.min(1.35, Math.max(0.75, 80 / (rect.height / 2)));

      const maxTiltX = BASE_TILT_DEG * aspectCorrectionY;
      let maxTiltY = BASE_TILT_DEG * aspectCorrectionX;

      if (isTrack) {
        maxTiltY = (BASE_TILT_DEG * 0.45) * aspectCorrectionX;
      }

      let factorX = rawDx;
      let factorY = rawDy;
      let factorDist = rawDist;

      if (!isNowPlaying) {
        const absX = Math.abs(rawDx);
        const absY = Math.abs(rawDy);
        factorX = Math.sign(rawDx) * Math.min(1.0, Math.pow(absX, 0.72) * 1.4);
        factorY = Math.sign(rawDy) * Math.min(1.0, Math.pow(absY, 0.72) * 1.4);
        factorDist = Math.min(1.0, Math.pow(rawDist, 0.72) * 1.4);
      }

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
  '.delivery-panel'
];

let globalObserver = null;

/**
 * Scans the DOM and attaches 3D perspective tilt to all card components.
 * @param {HTMLElement|Document} [root=document] - Root container to search within
 */
export function initAllCardTilts(root = document) {
  const selector = CARD_SELECTORS.join(', ');
  const cards = root.querySelectorAll(selector);
  cards.forEach((card, index) => {
    attachTiltToCard(card, index);
  });

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

