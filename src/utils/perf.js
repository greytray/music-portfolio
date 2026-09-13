/**
 * Smart Device Capability & Performance Tier Engine
 *
 * Automatically detects device hardware capability and provides optimal frame pacing.
 * - Supports high-refresh displays (90Hz / 120Hz / 144Hz) with hardware vsync.
 * - Prevents artificial frame-skipping jitter while maintaining low power consumption.
 */

function detectIsWeakDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // 1. Check CPU logical cores
  const cores = navigator.hardwareConcurrency || 4;
  if (cores < 4) return true;

  // 2. Check Device Memory (RAM in GB) if supported
  const memory = navigator.deviceMemory;
  if (typeof memory === 'number' && memory < 4) return true;

  // 3. Check Network / Data Saver
  if (navigator.connection && (navigator.connection.saveData || navigator.connection.effectiveType === '2g' || navigator.connection.effectiveType === 'slow-2g')) {
    return true;
  }

  // 4. Check prefers-reduced-motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return true;
  }

  return false;
}

let isWeakDevice = detectIsWeakDevice();

/**
 * Gets optimal target FPS.
 * @param {number} [preferredMax=120] - Max desired FPS
 * @returns {number} Optimal target FPS
 */
export function getTargetFPS(preferredMax = 120) {
  if (isWeakDevice) return Math.min(preferredMax, 60);
  return preferredMax;
}

/**
 * Gets the frame interval in milliseconds for the target FPS.
 * @param {number} [preferredMax=120] - Max desired FPS
 * @returns {number} Frame interval in ms
 */
export function getFrameInterval(preferredMax = 120) {
  const fps = getTargetFPS(preferredMax);
  return 1000 / fps;
}

// Battery saving listener
if (typeof window !== 'undefined' && 'getBattery' in navigator) {
  navigator.getBattery().then((battery) => {
    function checkBattery() {
      if (!battery.charging && battery.level <= 0.2) {
        isWeakDevice = true;
        window.dispatchEvent(new CustomEvent('site-perf-tier-change', { detail: { fps: 60 } }));
      }
    }
    checkBattery();
    battery.addEventListener('levelchange', checkBattery);
    battery.addEventListener('chargingchange', checkBattery);
  }).catch(() => {});
}

// Global hooks
if (typeof window !== 'undefined') {
  window.getSiteTargetFPS = getTargetFPS;
  window.getSiteFrameInterval = getFrameInterval;
  window.__sitePerfTier = isWeakDevice ? 'tier-60fps-weak' : 'tier-120fps-high';
}

