/**
 * Media Proxy & Zero-Latency Audio/Image Engine for Eko
 * Streams audio and private Hugging Face images directly via /api/media.
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
 * Resolves any relative media asset path or private Hugging Face dataset URL to the secure server proxy URL.
 *
 * @param {string} path - The relative file path or raw URL
 * @returns {string} - The dynamic proxy URL
 */
export function getMediaUrl(path) {
  if (!path) return '';
  
  // Transform direct Hugging Face dataset URLs to authenticated server proxy
  if (path.includes('huggingface.co/datasets/greyhugging/RawStorage/')) {
    const parts = path.split('/resolve/main/');
    if (parts[1]) {
      return `${MEDIA_CONFIG.proxyEndpoint}?file=${encodeURIComponent(parts[1])}`;
    }
  }

  if (
    path.startsWith('/api/media') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  // External non-HF full HTTP URLs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Strip leading dots/slashes and 'assets/' namespace
  const cleanPath = path.replace(/^\.?\/+/, '').replace(/^assets\//, '');
  
  // If cleanPath is an image without Images/ prefix, prepend Images/
  const ext = cleanPath.split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
  const normalizedFile = isImage && !cleanPath.startsWith('Images/') && !cleanPath.startsWith('backgrounds/')
    ? `Images/${cleanPath}`
    : cleanPath;

  return `${MEDIA_CONFIG.proxyEndpoint}?file=${encodeURIComponent(normalizedFile)}`;
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
  const cleanKey = standardUrl.replace(/^\/api\/media\?file=/, '');
  if (mediaBlobCache.has(cleanKey)) {
    return mediaBlobCache.get(cleanKey);
  }
  return standardUrl;
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

  if (mediaBlobCache.has(standardUrl)) {
    return Promise.resolve(mediaBlobCache.get(standardUrl));
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
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error(`Endpoint returned HTML instead of audio binary`);
      }
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      mediaBlobCache.set(standardUrl, blobUrl);
      const cleanKey = standardUrl.replace(/^\/api\/media\?file=/, '');
      mediaBlobCache.set(cleanKey, blobUrl);
      window.dispatchEvent(new CustomEvent('media-blob-ready', {
        detail: { url: standardUrl, blobUrl, cleanKey }
      }));
      return blobUrl;
    })
    .catch((err) => {
      console.warn('[Audio Preload] Fetch error, falling back to direct stream:', err.message);
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
    if (paths.length > 0) {
      preloadMedia(paths[0], true);
    }
    paths.slice(1).forEach((p, idx) => {
      setTimeout(() => preloadMedia(p, false), idx * 100);
    });
  };

  if (document.readyState === 'complete') {
    startPreload();
  } else {
    window.addEventListener('load', startPreload, { once: true });
  }
}

// Global exports for vanilla scripts
if (typeof window !== 'undefined') {
  window.__getMediaUrl = getMediaUrl;
  window.__getInstantMediaUrl = getInstantMediaUrl;
  window.__preloadMedia = preloadMedia;
  window.__fetchAndCacheBlob = fetchAndCacheBlob;
  window.__warmMediaOnIdle = warmMediaOnIdle;

  const STANDARD_TRACKS = [
    '/api/media?file=audio/Aiobahn maybe last mix.mp3',
    '/api/media?file=audio/Kensuke.mp3',
    '/api/media?file=audio/broken jar mastered.mp3',
    '/api/media?file=audio/feeling mello.mp3',
    '/api/media?file=audio/Kpop beat.mp3',
    '/api/media?file=audio/K-Pop post fx.mp3'
  ];
  warmMediaOnIdle(STANDARD_TRACKS);
}
