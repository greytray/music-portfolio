/**
 * Media Proxy Helper for Eko Audio & Visual Assets
 * Routes media requests through the secure server-side proxy endpoint (/api/media?file=...)
 */

export const MEDIA_CONFIG = {
  proxyEndpoint: '/api/media',
};

/**
 * Resolves any relative media asset path to the secure server proxy URL.
 * Example: 'audio/feeling mello.mp3' -> '/api/media?file=audio/feeling%20mello.mp3'
 * Example: './assets/audio/song.mp3' -> '/api/media?file=audio/song.mp3'
 *
 * @param {string} path - The relative file path
 * @returns {string} - The dynamic proxy URL
 */
export function getMediaUrl(path) {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('/api/media')
  ) {
    return path;
  }

  // Strip leading dots/slashes and 'assets/' namespace
  const cleanPath = path.replace(/^\.?\/+/, '').replace(/^assets\//, '');
  return `${MEDIA_CONFIG.proxyEndpoint}?file=${encodeURIComponent(cleanPath)}`;
}

// Global set of prefetched URLs to avoid redundant requests
const prefetchedUrls = new Set();

/**
 * Preloads an audio file in the background with lowest priority (idle / hover).
 * Does not block main thread or page rendering.
 *
 * @param {string} pathOrUrl - Asset path or proxy URL
 */
export function preloadMedia(pathOrUrl) {
  if (!pathOrUrl || typeof window === 'undefined') return;
  const fullUrl = getMediaUrl(pathOrUrl);
  if (prefetchedUrls.has(fullUrl)) return;
  prefetchedUrls.add(fullUrl);

  try {
    if ('fetch' in window) {
      // Use low priority fetch if supported
      fetch(fullUrl, { priority: 'low', mode: 'cors' }).catch(() => {});
    }
  } catch (_) {}
}

/**
 * Executes a prefetch batch only when the browser is idle, ensuring zero impact on initial load.
 *
 * @param {string[]} paths - Array of media paths
 * @param {number} [delayMs=2500] - Delay before scheduling idle prefetch
 */
export function warmMediaOnIdle(paths, delayMs = 2500) {
  if (typeof window === 'undefined' || !Array.isArray(paths)) return;

  const schedule = () => {
    const run = () => {
      paths.forEach((p) => preloadMedia(p));
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 500);
    }
  };

  setTimeout(schedule, delayMs);
}
