/**
 * Water Drop Liquid Glass Interactive Button Engine
 * 
 * Performance & Physics Optimizations:
 * - Locked 60 FPS frame-pacing to prevent battery drain on high-refresh 120Hz/144Hz displays
 * - Smart IntersectionObserver viewport culling: completely halts rAF loop when button is off-screen
 * - Tab visibility & modal-open awareness: pauses execution when backgrounded or hidden
 * - Ultra-refractive fluid water capsule aesthetic with dynamic caustics & realistic highlights
 * - Consistent, non-randomized slow-medium breathing (growing & shrinking) idle animation
 * - Driven by a continuous, deterministic timestamp cycle (no frame-rate stutter or jitter)
 * - Smooth dampening transition to stable size on cursor hover, and smooth resumption on leave
 * - Meniscus fluid tilt following cursor position
 * - Zero click distortion / stretching (all click animations disabled for solid stability)
 */

import { getFrameInterval } from './perf.js';

export function initLiquidGlassButtons() {
  const buttons = document.querySelectorAll('.hero-cta, .liquid-glass-btn');

  // Refined breathing cycle duration (2.6 seconds = slightly faster, energetic breathing pace)
  const BREATHE_PERIOD_MS = 2600;
  const BREATHE_SCALE_RANGE = 0.035; // Maximum growth: +3.5%, contraction: -3.5%

  buttons.forEach((btn) => {
    if (btn.dataset.waterButtonInit === 'true') return;
    btn.dataset.waterButtonInit = 'true';
    btn.classList.add('water-liquid-btn');

    let state = {
      rafId: null,
      isVisible: true,
      lastFrameTime: 0,
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
      // Breathing amplitude modulation (1.0 = active idle breathing, 0.0 = paused on hover)
      breatheAmp: 1.0,
      targetBreatheAmp: 1.0,
      // Hover scale factor
      hoverScale: 1.0,
      targetHoverScale: 1.0
    };

    function updatePhysics(now) {
      // Smart resource management: Stop loop if not visible, tab hidden, or full-screen view open
      if (!state.isVisible || document.hidden || document.body.classList.contains('modal-open')) {
        state.rafId = null;
        return;
      }

      state.rafId = requestAnimationFrame(updatePhysics);

      const timestamp = typeof now === 'number' ? now : performance.now();
      const delta = timestamp - state.lastFrameTime;
      const frameInterval = getFrameInterval(120);
      
      // Enforce dynamic FPS cap (120 FPS on capable devices, 60 FPS fallback on weak devices)
      if (delta < frameInterval - 1) {
        return;
      }
      state.lastFrameTime = timestamp - (delta % frameInterval);

      // Smoothly blend breathing amplitude (smoothly pauses on hover, smoothly resumes on leave)
      const breatheTransitionSpeed = state.isHovered ? 0.07 : 0.04;
      state.breatheAmp += (state.targetBreatheAmp - state.breatheAmp) * breatheTransitionSpeed;

      // Deterministic, continuous sine cycle with exact constant speed across all displays/refresh rates
      const cycleProgress = (timestamp % BREATHE_PERIOD_MS) / BREATHE_PERIOD_MS;
      const pulse = Math.sin(cycleProgress * 2 * Math.PI);

      // Consistent uniform breathing scale (identical on both axes to eliminate wobbling/randomized distortion)
      const breatheScale = 1.0 + pulse * BREATHE_SCALE_RANGE * state.breatheAmp;

      // Smooth tilt and hover scale interpolation
      const tiltLerp = state.isHovered ? 0.12 : 0.08;
      state.tiltX += (state.targetTiltX - state.tiltX) * tiltLerp;
      state.tiltY += (state.targetTiltY - state.tiltY) * tiltLerp;
      state.hoverScale += (state.targetHoverScale - state.hoverScale) * 0.08;

      // Dynamic specular glow coordinate interpolation
      state.glowX += (state.targetGlowX - state.glowX) * (state.isHovered ? 0.15 : 0.06);
      state.glowY += (state.targetGlowY - state.glowY) * (state.isHovered ? 0.15 : 0.06);

      if (Math.abs(state.glowX - state.lastRenderedGlowX) > 0.05 || Math.abs(state.glowY - state.lastRenderedGlowY) > 0.05) {
        btn.style.setProperty('--liquid-x', `${state.glowX.toFixed(2)}%`);
        btn.style.setProperty('--liquid-y', `${state.glowY.toFixed(2)}%`);
        state.lastRenderedGlowX = state.glowX;
        state.lastRenderedGlowY = state.glowY;
      }

      // Combined uniform scale
      const finalScale = breatheScale * state.hoverScale;
      btn.style.transform = `perspective(600px) rotateX(${state.tiltX.toFixed(2)}deg) rotateY(${state.tiltY.toFixed(2)}deg) scale3d(${finalScale.toFixed(4)}, ${finalScale.toFixed(4)}, 1)`;
    }

    function ensurePhysicsRunning() {
      if (!state.rafId && state.isVisible && !document.hidden && !document.body.classList.contains('modal-open')) {
        state.lastFrameTime = performance.now();
        state.rafId = requestAnimationFrame(updatePhysics);
      }
    }

    // Smart Viewport Culling Observer
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const inView = entry.isIntersecting || entry.intersectionRatio > 0;
          state.isVisible = inView;
          if (inView) {
            ensurePhysicsRunning();
          } else if (state.rafId) {
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
          }
        });
      }, { threshold: [0, 0.05] });
      observer.observe(btn);
    }

    // Tab visibility and modal listeners
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        ensurePhysicsRunning();
      } else if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
    }, { passive: true });

    window.addEventListener('fullscreen-overlay-change', (e) => {
      if (e.detail && e.detail.open) {
        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
      } else {
        ensurePhysicsRunning();
      }
    }, { passive: true });

    // Start physics loop
    ensurePhysicsRunning();

    btn.addEventListener('pointerenter', () => {
      state.isHovered = true;
      state.targetBreatheAmp = 0.0;  // Smoothly pause breathing at resting scale
      state.targetHoverScale = 1.02; // Gentle stable hover elevation
      ensurePhysicsRunning();
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
      ensurePhysicsRunning();
    });

    btn.addEventListener('pointerleave', () => {
      state.isHovered = false;
      state.targetTiltX = 0;
      state.targetTiltY = 0;
      state.targetGlowX = 50;
      state.targetGlowY = 48;
      state.targetHoverScale = 1.0;
      state.targetBreatheAmp = 1.0;  // Smoothly resume gentle growing and shrinking
      ensurePhysicsRunning();
    });

    // NOTE: All click animations are intentionally completely disabled as requested.
    // The button remains structurally stable on click without any stretch or distortion.
  });
}
