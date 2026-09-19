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
