/**
 * Water Drop Liquid Glass Interactive Button Engine
 * 
 * Features:
 * - Ultra-refractive fluid water capsule aesthetic with dynamic caustics & realistic highlights
 * - Continuous organic breathing (growing & shrinking) idle animation
 * - Smooth dampening transition to stable normal size on cursor hover, and smooth resumption on leave
 * - Meniscus fluid tilt following cursor position
 * - Zero click distortion / stretching (all click animations disabled for solid stability)
 */

export function initLiquidGlassButtons() {
  const buttons = document.querySelectorAll('.hero-cta, .liquid-glass-btn');

  buttons.forEach((btn) => {
    if (btn.dataset.waterButtonInit === 'true') return;
    btn.dataset.waterButtonInit = 'true';
    btn.classList.add('water-liquid-btn');

    let state = {
      rafId: null,
      isHovered: false,
      // Fluid tilt
      tiltX: 0,
      tiltY: 0,
      targetTiltX: 0,
      targetTiltY: 0,
      // Specular light position
      glowX: 50,
      glowY: 50,
      targetGlowX: 50,
      targetGlowY: 50,
      // Continuous growing and shrinking (breathing) animation
      breathePhase: 0,
      breatheAmp: 1.0,        // Current amplitude (1.0 = fully pulsing, 0.0 = stable)
      targetBreatheAmp: 1.0,  // Target amplitude (0.0 on hover, 1.0 on idle)
      // Hover scale factor
      hoverScale: 1.0,
      targetHoverScale: 1.0
    };

    function updatePhysics() {
      // Smoothly blend breathing amplitude (gently stops on hover, gently resumes on leave)
      const breatheTransitionSpeed = state.isHovered ? 0.06 : 0.035;
      state.breatheAmp += (state.targetBreatheAmp - state.breatheAmp) * breatheTransitionSpeed;

      // Always advance breathing phase smoothly so there are zero phase jumps or snaps
      state.breathePhase += 0.032;

      // Calculate breathing scale oscillation
      const pulse = Math.sin(state.breathePhase);
      const breatheScaleX = 1.0 + pulse * 0.032 * state.breatheAmp;
      const breatheScaleY = 1.0 + Math.sin(state.breathePhase + 0.3) * 0.026 * state.breatheAmp;

      // Smooth tilt and hover scale interpolation
      const tiltLerp = state.isHovered ? 0.12 : 0.08;
      state.tiltX += (state.targetTiltX - state.tiltX) * tiltLerp;
      state.tiltY += (state.targetTiltY - state.tiltY) * tiltLerp;
      state.hoverScale += (state.targetHoverScale - state.hoverScale) * 0.08;

      // Dynamic specular glow coordinate interpolation
      state.glowX += (state.targetGlowX - state.glowX) * (state.isHovered ? 0.15 : 0.05);
      state.glowY += (state.targetGlowY - state.glowY) * (state.isHovered ? 0.15 : 0.05);

      // Idle specular drift when not hovered
      if (!state.isHovered) {
        state.targetGlowX = 50 + Math.cos(state.breathePhase * 0.7) * 22;
        state.targetGlowY = 40 + Math.sin(state.breathePhase * 0.9) * 18;
      }

      btn.style.setProperty('--liquid-x', `${state.glowX.toFixed(2)}%`);
      btn.style.setProperty('--liquid-y', `${state.glowY.toFixed(2)}%`);

      // Combined scale
      const finalScaleX = breatheScaleX * state.hoverScale;
      const finalScaleY = breatheScaleY * state.hoverScale;

      btn.style.transform = `perspective(600px) rotateX(${state.tiltX.toFixed(2)}deg) rotateY(${state.tiltY.toFixed(2)}deg) scale3d(${finalScaleX.toFixed(4)}, ${finalScaleY.toFixed(4)}, 1)`;

      state.rafId = requestAnimationFrame(updatePhysics);
    }

    // Start physics loop
    state.rafId = requestAnimationFrame(updatePhysics);

    btn.addEventListener('pointerenter', () => {
      state.isHovered = true;
      state.targetBreatheAmp = 0.0;  // Smoothly blend breathing down to zero (normal size)
      state.targetHoverScale = 1.02; // Gentle stable hover elevation
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
    });

    btn.addEventListener('pointerleave', () => {
      state.isHovered = false;
      state.targetTiltX = 0;
      state.targetTiltY = 0;
      state.targetHoverScale = 1.0;
      state.targetBreatheAmp = 1.0;  // Smoothly resume gentle growing and shrinking
    });

    // NOTE: All click animations are intentionally completely disabled as requested.
    // The button remains structurally stable on click without any stretch or distortion.
  });
}
