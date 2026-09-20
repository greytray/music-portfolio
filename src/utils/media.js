/**
 * Media Proxy & Zero-Latency Audio Cache Engine for Eko
 * Routes media requests through the secure server-side proxy endpoint (/api/media?file=...)
 * Pre-caches audio chunks into in-memory Blob URLs for true instantaneous 0ms audio playback.
 */

export const MEDIA_CONFIG = {
  proxyEndpoint: '/api/media',
};

// In-memory cache for Object URLs (RAM-backed instant playback)
const mediaBlobCache = typeof window !== 'undefined' ? (window.__MEDIA_BLOB_CACHE__ = window.__MEDIA_BLOB_CACHE__ || new Map()) : new Map();
const mediaFetchPromises = typeof window !== 'undefined' ? (window.__MEDIA_FETCH_PROMISES__ = window.__MEDIA_FETCH_PROMISES__ || new Map()) : new Map();
const prefetchedUrls = typeof window !== 'undefined' ? (window.__PREFETCHED_MEDIA_URLS__ = window.__PREFETCHED_MEDIA_URLS__ || new Set()) : new Set();

/**
 * Resolves any relative media asset path to the secure server proxy URL.
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

/**
 * Returns the in-memory Blob URL if already preloaded, otherwise falls back to the proxy URL.
 *
 * @param {string} pathOrUrl
 * @returns {string}
 */
export function getInstantMediaUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('blob:')) return pathOrUrl;
  const standardUrl = getMediaUrl(pathOrUrl);
  if (mediaBlobCache.has(standardUrl)) {
    return mediaBlobCache.get(standardUrl);
  }
  return standardUrl;
}

/**
 * Fetches and stores the audio binary in memory as a Blob URL for 0ms decoding.
 *
 * @param {string} pathOrUrl
 * @returns {Promise<string>}
 */
export function fetchAndCacheBlob(pathOrUrl) {
  if (!pathOrUrl || typeof window === 'undefined') return Promise.resolve('');
  const standardUrl = getMediaUrl(pathOrUrl);

  if (mediaBlobCache.has(standardUrl)) {
    return Promise.resolve(mediaBlobCache.get(standardUrl));
  }
  if (mediaFetchPromises.has(standardUrl)) {
    return mediaFetchPromises.get(standardUrl);
  }

  const promise = fetch(standardUrl, { priority: 'low', mode: 'cors' })
    .then((res) => {
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      mediaBlobCache.set(standardUrl, blobUrl);
      return blobUrl;
    })
    .catch(() => {
      return standardUrl;
    });

  mediaFetchPromises.set(standardUrl, promise);
  return promise;
}

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

  // Background fetch to RAM blob cache
  fetchAndCacheBlob(fullUrl);
}

/**
 * Executes a prefetch batch only when the browser is idle, ensuring zero impact on initial load.
 *
 * @param {string[]} paths - Array of media paths
 * @param {number} [delayMs=2000] - Delay before scheduling idle prefetch
 */
export function warmMediaOnIdle(paths, delayMs = 2000) {
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

// Global exports for vanilla scripts
if (typeof window !== 'undefined') {
  window.__getMediaUrl = getMediaUrl;
  window.__getInstantMediaUrl = getInstantMediaUrl;
  window.__preloadMedia = preloadMedia;
  window.__fetchAndCacheBlob = fetchAndCacheBlob;
  window.__warmMediaOnIdle = warmMediaOnIdle;
}
