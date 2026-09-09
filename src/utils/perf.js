/**
 * Smart Device Capability & Performance Tier Engine
 *
 * Automatically detects device hardware capability and monitors runtime frame-times.
 * - Capable devices on 90Hz/120Hz/144Hz displays run at up to 120 FPS for silky responsive physics.
 * - Weak devices (low CPU cores, low memory, battery saver, or dropped frames) automatically fallback to 60 FPS.
 */

// Initial heuristic detection
function detectIsWeakDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // 1. Check CPU logical cores
  const cores = navigator.hardwareConcurrency || 4;
  if (cores < 4) return true;

  // 2. Check Device Memory (RAM in GB) if supported (Chrome/Edge/Android)
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
let activeTargetFPS = isWeakDevice ? 60 : 120;
let consecutiveSlowFrames = 0;
let consecutiveFastFrames = 0;
let frameTimeWindow = [];
const WINDOW_SIZE = 30;

/**
 * Gets the current optimal target FPS (120 for capable devices, 60 fallback for weak devices).
 * @param {number} [preferredMax=120] - Max desired FPS
 * @returns {number} Optimal target FPS
 */
export function getTargetFPS(preferredMax = 120) {
  if (isWeakDevice) return Math.min(preferredMax, 60);
  return Math.min(preferredMax, activeTargetFPS);
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

/**
 * Runtime Frame Performance Monitor
 * Continuously measures frame delivery. If the device experiences frame drops at 120 FPS,
 * it automatically steps down to 60 FPS without breaking any visual state.
 */
if (typeof window !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
  let lastMonitoredTime = performance.now();
  let monitorFrameCount = 0;

  function monitorLoop(now) {
    const delta = now - lastMonitoredTime;
    lastMonitoredTime = now;

    if (monitorFrameCount > 10 && delta > 0 && delta < 100) {
      frameTimeWindow.push(delta);
      if (frameTimeWindow.length > WINDOW_SIZE) {
        frameTimeWindow.shift();
      }

      // If we have enough samples, analyze performance
      if (frameTimeWindow.length === WINDOW_SIZE) {
        const avgDelta = frameTimeWindow.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
        
        // At 120 FPS target (~8.33ms), if average frame delta is consistently > 14ms (~70 FPS or lower),
        // or if multiple heavy janks occurred, demote to 60 FPS to save power and eliminate stutter.
        if (activeTargetFPS > 60 && avgDelta > 13.5) {
          consecutiveSlowFrames++;
          if (consecutiveSlowFrames > 2) {
            isWeakDevice = true;
            activeTargetFPS = 60;
            window.__sitePerfTier = 'tier-60fps-fallback';
            window.dispatchEvent(new CustomEvent('site-perf-tier-change', { detail: { fps: 60 } }));
          }
        }
      }
    }

    monitorFrameCount++;
    requestAnimationFrame(monitorLoop);
  }

  // Start monitoring after initial page settling (1 second)
  setTimeout(() => {
    lastMonitoredTime = performance.now();
    requestAnimationFrame(monitorLoop);
  }, 1000);

  // Listen for low battery mode if Battery API is available
  if ('getBattery' in navigator) {
    navigator.getBattery().then((battery) => {
      function checkBattery() {
        if (!battery.charging && battery.level <= 0.2) {
          isWeakDevice = true;
          activeTargetFPS = 60;
          window.dispatchEvent(new CustomEvent('site-perf-tier-change', { detail: { fps: 60 } }));
        }
      }
      checkBattery();
      battery.addEventListener('levelchange', checkBattery);
      battery.addEventListener('chargingchange', checkBattery);
    }).catch(() => {});
  }
}

// Global hook for inline scripts
if (typeof window !== 'undefined') {
  window.getSiteTargetFPS = getTargetFPS;
  window.getSiteFrameInterval = getFrameInterval;
  window.__sitePerfTier = isWeakDevice ? 'tier-60fps-weak' : 'tier-120fps-high';
}
