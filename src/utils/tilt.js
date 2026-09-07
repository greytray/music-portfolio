/**
 * Card 3D Perspective Tilt & Weight Press Physics System
 * 
 * Physics Behavior:
 * - When the cursor is near the center of a card: the card is stable, resting, and flat.
 * - When the cursor moves towards sides or corners: the card feels the physical weight
 *   of the cursor point and gets depressed inwards into the Z-axis, creating a satisfying
 *   perspective shift where the pressed side sinks and the opposite side elevates.
 * - Smooth spring interpolation ensures ultra-fluid 60fps tracking.
 * - Staggered tiny floating animations give cards an organic levitating atmosphere.
 */

const MAX_TILT_DEG = 8.5; // Maximum tilt angle in degrees
const MAX_DEPRESS_PX = 6; // Maximum inward depth displacement in pixels
const LERP_FACTOR = 0.14;  // Spring interpolation speed
const DEAD_ZONE = 0.06;    // Center dead-zone where card remains stable

const activeCards = new WeakSet();

/**
 * Initializes cursor weight-press tilt on an individual card element.
 * @param {HTMLElement} card - The card DOM element
 * @param {number} [index=0] - Index for staggered floating rhythm
 */
export function attachTiltToCard(card, index = 0) {
  if (!card || activeCards.has(card)) return;
  activeCards.add(card);

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

  function update() {
    state.currentRx += (state.targetRx - state.currentRx) * LERP_FACTOR;
    state.currentRy += (state.targetRy - state.currentRy) * LERP_FACTOR;
    state.currentTz += (state.targetTz - state.currentTz) * LERP_FACTOR;

    const hasSignificantMotion = 
      Math.abs(state.targetRx - state.currentRx) > 0.01 ||
      Math.abs(state.targetRy - state.currentRy) > 0.01 ||
      Math.abs(state.targetTz - state.currentTz) > 0.01 ||
      state.isHovered;

    if (hasSignificantMotion) {
      card.style.transform = `perspective(1000px) rotateX(${state.currentRx.toFixed(3)}deg) rotateY(${state.currentRy.toFixed(3)}deg) translateZ(${state.currentTz.toFixed(3)}px)`;
      state.rafId = requestAnimationFrame(update);
    } else {
      card.style.transform = '';
      state.rafId = null;
    }
  }

  function onPointerMove(e) {
    const rect = card.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Normalized offset from center: -1 (top/left) to +1 (bottom/right)
    let dx = (e.clientX - cx) / (rect.width / 2);
    let dy = (e.clientY - cy) / (rect.height / 2);

    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));

    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < DEAD_ZONE) {
      // Center zone: Card is stable, calm, and resting flat
      state.targetRx = 0;
      state.targetRy = 0;
      state.targetTz = 0;
    } else {
      // Weight Press Physics:
      // - Cursor on top (dy < 0): top sinks inwards -> rotX is positive in CSS 3D
      // - Cursor on bottom (dy > 0): bottom sinks inwards -> rotX is negative
      // - Cursor on right (dx > 0): right sinks inwards -> rotY is positive
      // - Cursor on left (dx < 0): left sinks inwards -> rotY is negative
      state.targetRx = -dy * MAX_TILT_DEG;
      state.targetRy = dx * MAX_TILT_DEG;
      state.targetTz = -Math.min(dist, 1.0) * MAX_DEPRESS_PX;
    }

    if (!state.rafId) {
      state.rafId = requestAnimationFrame(update);
    }
  }

  function onPointerEnter() {
    state.isHovered = true;
    card.classList.add('is-tilting');
    if (!state.rafId) {
      state.rafId = requestAnimationFrame(update);
    }
  }

  function onPointerLeave() {
    state.isHovered = false;
    card.classList.remove('is-tilting');
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

/**
 * Scans the DOM and attaches 3D perspective tilt to all card components.
 * @param {HTMLElement|Document} [root=document] - Root container to search within
 */
export function initAllCardTilts(root = document) {
  const cardSelectors = [
    '.now-playing',
    '.timeline',
    '.track',
    '.process-card',
    '.process-closing',
    '.service-card',
    '.delivery-panel',
    '.beat-card',
    '.session-card',
    '.order-card',
    '.cart-item',
    '.checkout-card',
    '.upload-dropzone-card',
    '.kokonut-card'
  ];

  const cards = root.querySelectorAll(cardSelectors.join(', '));
  cards.forEach((card, index) => {
    attachTiltToCard(card, index);
  });
}
