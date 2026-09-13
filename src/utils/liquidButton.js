/**
 * Water Drop Liquid Glass Interactive Button Engine
 * 
 * Performance & Physics Optimizations:
 * - Pure CSS GPU-composited idle breathing to keep JS main thread completely idle
 * - Interactive pointer physics (meniscus 3D tilt & dynamic specular light) active ONLY on hover and settle
 * - Smart IntersectionObserver & tab visibility culling to ensure zero resource footprint when offscreen
 * - Smooth dampening transition to stable resting position on pointer leave, then immediately halts rAF loop
 * - Zero click distortion / stretching for solid structural stability
 */

export function initLiquidGlassButtons() {
  const buttons = document.querySelectorAll('.hero-cta, .liquid-glass-btn');

  buttons.forEach((btn) => {
    if (btn.dataset.waterButtonInit === 'true') return;
    btn.dataset.waterButtonInit = 'true';
    btn.classList.add('water-liquid-btn');

    let state = {
      rafId: null,
      isVisible: true,
      isHovered: false,
      // Fluid tilt
      tiltX: 0,
      tiltY: 0,
      targetTiltX: 0,
      targetTiltY: 0,
      // Specular light position
      glowX: 50,
      glowY: 48,
      targetGlowX: 50,
      targetGlowY: 48,
      lastRenderedGlowX: 50,
      lastRenderedGlowY: 48,
      // Hover scale factor
      hoverScale: 1.0,
      targetHoverScale: 1.0
    };

    function updatePhysics() {
      if (!state.isVisible || document.hidden || document.body.classList.contains('modal-open')) {
        btn.style.transform = '';
        btn.classList.remove('is-active-physics');
        state.rafId = null;
        return;
      }

      // Smooth tilt and hover scale interpolation
      const tiltLerp = state.isHovered ? 0.16 : 0.10;
      state.tiltX += (state.targetTiltX - state.tiltX) * tiltLerp;
      state.tiltY += (state.targetTiltY - state.tiltY) * tiltLerp;
      state.hoverScale += (state.targetHoverScale - state.hoverScale) * 0.10;

      // Dynamic specular glow coordinate interpolation
      state.glowX += (state.targetGlowX - state.glowX) * (state.isHovered ? 0.20 : 0.08);
      state.glowY += (state.targetGlowY - state.glowY) * (state.isHovered ? 0.20 : 0.08);

      if (Math.abs(state.glowX - state.lastRenderedGlowX) > 0.1 || Math.abs(state.glowY - state.lastRenderedGlowY) > 0.1) {
        btn.style.setProperty('--liquid-x', `${state.glowX.toFixed(1)}%`);
        btn.style.setProperty('--liquid-y', `${state.glowY.toFixed(1)}%`);
        state.lastRenderedGlowX = state.glowX;
        state.lastRenderedGlowY = state.glowY;
      }

      const hasMotion = 
        Math.abs(state.targetTiltX - state.tiltX) > 0.02 ||
        Math.abs(state.targetTiltY - state.tiltY) > 0.02 ||
        Math.abs(state.targetHoverScale - state.hoverScale) > 0.002 ||
        state.isHovered;

      if (hasMotion) {
        btn.classList.add('is-active-physics');
        btn.style.transform = `perspective(600px) rotateX(${state.tiltX.toFixed(2)}deg) rotateY(${state.tiltY.toFixed(2)}deg) scale3d(${state.hoverScale.toFixed(4)}, ${state.hoverScale.toFixed(4)}, 1)`;
        state.rafId = requestAnimationFrame(updatePhysics);
      } else {
        // Fully settled back to rest: release transform and stop loop
        state.tiltX = 0;
        state.tiltY = 0;
        state.hoverScale = 1.0;
        btn.style.transform = '';
        btn.classList.remove('is-active-physics');
        state.rafId = null;
      }
    }

    function startPhysics() {
      if (!state.rafId && state.isVisible && !document.hidden && !document.body.classList.contains('modal-open')) {
        state.rafId = requestAnimationFrame(updatePhysics);
      }
    }

    // Viewport Culling Observer
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const inView = entry.isIntersecting || entry.intersectionRatio > 0;
          state.isVisible = inView;
          if (!inView) {
            btn.classList.add('is-offscreen');
            if (state.rafId) {
              cancelAnimationFrame(state.rafId);
              state.rafId = null;
            }
          } else {
            btn.classList.remove('is-offscreen');
            if (state.isHovered) {
              startPhysics();
            }
          }
        });
      }, { threshold: [0, 0.05] });
      observer.observe(btn);
    }

    // Tab visibility and modal listeners
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
      } else if (state.isHovered && state.isVisible) {
        startPhysics();
      }
    }, { passive: true });

    window.addEventListener('fullscreen-overlay-change', (e) => {
      if (e.detail && e.detail.open) {
        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
      } else if (state.isHovered && state.isVisible) {
        startPhysics();
      }
    }, { passive: true });

    btn.addEventListener('pointerenter', (e) => {
      state.isHovered = true;
      state.targetHoverScale = 1.03; // Gentle elevation on hover
      if (e) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          state.targetGlowX = ((e.clientX - rect.left) / rect.width) * 100;
          state.targetGlowY = ((e.clientY - rect.top) / rect.height) * 100;
        }
      }
      startPhysics();
    });

    btn.addEventListener('pointermove', (e) => {
      const rect = btn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;

      state.targetGlowX = px;
      state.targetGlowY = py;

      // Fluid meniscus tilt
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

      const maxTilt = 6.5;
      state.targetTiltX = -dy * maxTilt;
      state.targetTiltY = dx * maxTilt;
      startPhysics();
    });

    btn.addEventListener('pointerleave', () => {
      state.isHovered = false;
      state.targetTiltX = 0;
      state.targetTiltY = 0;
      state.targetGlowX = 50;
      state.targetGlowY = 48;
      state.targetHoverScale = 1.0;
      startPhysics();
    });
  });
}
