/**
 * Media Proxy & Zero-Latency Audio Engine for Eko
 * Streams audio directly from Hugging Face via /api/media without local file duplicates.
 * Pre-caches audio into in-memory Blob URLs for true instantaneous 0ms audio playback.
 */

export const MEDIA_CONFIG = {
  proxyEndpoint: '/api/media',
};

// Global in-memory cache for Object URLs (RAM-backed instant playback)
const mediaBlobCache = typeof window !== 'undefined' ? (window.__MEDIA_BLOB_CACHE__ = window.__MEDIA_BLOB_CACHE__ || new Map()) : new Map();
const mediaFetchPromises = typeof window !== 'undefined' ? (window.__MEDIA_FETCH_PROMISES__ = window.__MEDIA_FETCH_PROMISES__ || new Map()) : new Map();
const prefetchedUrls = typeof window !== 'undefined' ? (window.__PREFETCHED_MEDIA_URLS__ = window.__PREFETCHED_MEDIA_URLS__ || new Set()) : new Set();

/**
 * Normalizes all possible variations of a media path/URL to canonical keys for instant lookup.
 * @param {string} pathOrUrl
 * @returns {string[]}
 */
function getLookupKeys(pathOrUrl) {
  if (!pathOrUrl) return [];
  const raw = String(pathOrUrl);
  const keys = new Set();
  keys.add(raw);

  try {
    const decoded = decodeURIComponent(raw);
    keys.add(decoded);
    const fileName = decoded.split('/').pop().split('?')[0].replace(/^file=/, '');
    if (fileName) {
      keys.add(fileName);
      keys.add(fileName.toLowerCase());
      keys.add(`audio/${fileName}`);
      keys.add(`audio/${fileName}`.toLowerCase());
      keys.add(`/api/media?file=audio/${fileName}`);
      keys.add(`/api/media?file=${encodeURIComponent('audio/' + fileName)}`);
      keys.add(`/api/media?file=${encodeURIComponent(fileName)}`);
    }
  } catch {}

  const clean = raw.replace(/^\.?\/+/, '').replace(/^assets\//, '').replace(/^\/api\/media\?file=/, '');
  keys.add(clean);
  keys.add(clean.toLowerCase());

  return Array.from(keys);
}

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
  if (pathOrUrl.startsWith('blob:') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl;
  }

  const lookupKeys = getLookupKeys(pathOrUrl);
  for (const k of lookupKeys) {
    if (mediaBlobCache.has(k)) {
      return mediaBlobCache.get(k);
    }
  }

  return getMediaUrl(pathOrUrl);
}

/**
 * Checks if a track is already cached in RAM memory.
 * @param {string} pathOrUrl
 * @returns {boolean}
 */
export function isMediaCachedInMemory(pathOrUrl) {
  if (!pathOrUrl) return false;
  const lookupKeys = getLookupKeys(pathOrUrl);
  for (const k of lookupKeys) {
    if (mediaBlobCache.has(k)) return true;
  }
  return false;
}

/**
 * Fetches and stores the audio binary in RAM as a Blob URL for instantaneous 0ms decoding.
 *
 * @param {string} pathOrUrl
 * @param {boolean} [highPriority=false]
 * @returns {Promise<string>}
 */
export function fetchAndCacheBlob(pathOrUrl, highPriority = false) {
  if (!pathOrUrl || typeof window === 'undefined') return Promise.resolve('');
  const standardUrl = getMediaUrl(pathOrUrl);

  const lookupKeys = getLookupKeys(pathOrUrl);
  for (const k of lookupKeys) {
    if (mediaBlobCache.has(k)) {
      return Promise.resolve(mediaBlobCache.get(k));
    }
  }

  if (mediaFetchPromises.has(standardUrl)) {
    return mediaFetchPromises.get(standardUrl);
  }

  const fetchOptions = {
    mode: 'cors',
  };
  if (highPriority) {
    fetchOptions.priority = 'high';
  }

  const promise = fetch(standardUrl, fetchOptions)
    .then((res) => {
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const allKeys = getLookupKeys(pathOrUrl).concat(getLookupKeys(standardUrl));
      for (const k of allKeys) {
        mediaBlobCache.set(k, blobUrl);
      }
      // Notify any active audio elements that an instant blob is ready
      window.dispatchEvent(new CustomEvent('media-blob-ready', {
        detail: { url: standardUrl, blobUrl, raw: pathOrUrl }
      }));
      return blobUrl;
    })
    .catch((err) => {
      console.warn('[Audio Preload] Fetch fallback to direct stream:', err.message);
      return standardUrl;
    });

  mediaFetchPromises.set(standardUrl, promise);
  return promise;
}

/**
 * Preloads an audio file in the background into RAM.
 *
 * @param {string} pathOrUrl - Asset path or proxy URL
 * @param {boolean} [highPriority=false]
 */
export function preloadMedia(pathOrUrl, highPriority = false) {
  if (!pathOrUrl || typeof window === 'undefined') return;
  const fullUrl = getMediaUrl(pathOrUrl);
  if (prefetchedUrls.has(fullUrl)) return;
  prefetchedUrls.add(fullUrl);

  // Background fetch directly to RAM blob cache
  fetchAndCacheBlob(fullUrl, highPriority);
}

/**
 * Executes proactive pre-warming for all known audio tracks.
 *
 * @param {string[]} paths - Array of media paths
 */
export function warmMediaOnIdle(paths) {
  if (typeof window === 'undefined' || !Array.isArray(paths)) return;

  const startPreload = () => {
    // Warm all tracks with high priority without delay
    paths.forEach((p, idx) => {
      setTimeout(() => preloadMedia(p, idx < 2), idx * 40);
    });
  };

  if (document.readyState === 'complete') {
    startPreload();
  } else {
    window.addEventListener('DOMContentLoaded', startPreload, { once: true });
    window.addEventListener('load', startPreload, { once: true });
  }
}

// Global exports for vanilla scripts
if (typeof window !== 'undefined') {
  window.__getMediaUrl = getMediaUrl;
  window.__getInstantMediaUrl = getInstantMediaUrl;
  window.__isMediaCachedInMemory = isMediaCachedInMemory;
  window.__preloadMedia = preloadMedia;
  window.__fetchAndCacheBlob = fetchAndCacheBlob;
  window.__warmMediaOnIdle = warmMediaOnIdle;

  // Proactive auto-warming of standard track list on script evaluation
  const STANDARD_TRACKS = [
    '/api/media?file=audio/feeling mello.mp3',
    '/api/media?file=audio/broken jar mastered.mp3',
    '/api/media?file=audio/Kpop beat.mp3',
    '/api/media?file=audio/Kensuke.mp3',
    '/api/media?file=audio/K-Pop post fx.mp3',
    '/api/media?file=audio/Aiobahn maybe last mix.mp3'
  ];
  warmMediaOnIdle(STANDARD_TRACKS);
}
