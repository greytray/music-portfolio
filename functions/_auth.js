// Cloudflare Pages Functions & Server Auth Helper
// Cryptographic HMAC-SHA256 session token generator & validator using Web Crypto API
// Inspect-proof password validation via SHA-256 cryptographic hashing (no raw passwords stored in codebase)

export const COOKIE_NAME = 'eko_session';
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function strToUint8(str) {
  return new TextEncoder().encode(str);
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToUint8(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Computes SHA-256 hex string using Web Crypto API
 */
export async function sha256Hex(text) {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const data = strToUint8(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node.js fallback if crypto.subtle is not globally present
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(text).digest('hex');
  } catch {
    return '';
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Inspect-proof password validator: verifies input ONLY against the dynamic Cloudflare Pages
 * environment variable (ADMIN_PASSWORD or ADMIN_PASSWORD_HASH).
 * NEVER stores, caches, or falls back to any static/hardcoded passwords.
 */
export async function verifyAdminPassword(inputPassword, env) {
  if (!inputPassword || typeof inputPassword !== 'string') return false;
  const trimmed = inputPassword.trim();
  if (!trimmed) return false;

  // Resolve environment from Cloudflare context.env or Node process.env
  const targetEnv = env || (typeof process !== 'undefined' ? process.env : {}) || {};

  const configuredPass = targetEnv.ADMIN_PASSWORD ? String(targetEnv.ADMIN_PASSWORD).replace(/\r/g, '').trim() : '';
  const configuredHash = targetEnv.ADMIN_PASSWORD_HASH ? String(targetEnv.ADMIN_PASSWORD_HASH).replace(/\r/g, '').trim().replace(/^["']|["']$/g, '').toLowerCase() : '';

  // If no dynamic password has been provisioned in Cloudflare environment, fail closed immediately
  if (!configuredPass && !configuredHash) {
    console.warn('[Auth] No ADMIN_PASSWORD or ADMIN_PASSWORD_HASH configured in Cloudflare environment.');
    return false;
  }

  // 1. Verify against dynamic Cloudflare ADMIN_PASSWORD
  if (configuredPass) {
    const unquotedEnvPassword = configuredPass.replace(/^["']|["']$/g, '').trim();

    // 1a. Plaintext match against trimmed or unquoted secret
    if (timingSafeEqual(trimmed, unquotedEnvPassword) || timingSafeEqual(trimmed, configuredPass) || timingSafeEqual(inputPassword, configuredPass)) {
      return true;
    }

    // 1b. If the secret entered in Cloudflare is a 64-char SHA-256 hex hash
    if (unquotedEnvPassword.length === 64 && /^[0-9a-fA-F]{64}$/.test(unquotedEnvPassword)) {
      const inputHash = await sha256Hex(trimmed);
      if (timingSafeEqual(inputHash, unquotedEnvPassword.toLowerCase())) {
        return true;
      }
    }
  }

  // 2. Verify against dynamic Cloudflare ADMIN_PASSWORD_HASH
  if (configuredHash) {
    const inputHash = await sha256Hex(trimmed);
    if (timingSafeEqual(inputHash, configuredHash)) {
      return true;
    }
  }

  // Strictly dynamic: Never falls back to any static password or cached hash
  return false;
}

async function getHmacKey(secret) {
  const keyData = strToUint8(secret);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export function getSecret(env) {
  const targetEnv = env || (typeof process !== 'undefined' ? process.env : {}) || {};
  const cleanPass = targetEnv.ADMIN_PASSWORD ? String(targetEnv.ADMIN_PASSWORD).replace(/\r/g, '').replace(/^["']|["']$/g, '').trim() : '';
  const cleanHash = targetEnv.ADMIN_PASSWORD_HASH ? String(targetEnv.ADMIN_PASSWORD_HASH).replace(/\r/g, '').replace(/^["']|["']$/g, '').trim() : '';
  return targetEnv.SESSION_SECRET || cleanPass || cleanHash || 'eko-dynamic-session-salt';
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token
 */
export async function createSessionToken(env) {
  const secret = getSecret(env);
  const key = await getHmacKey(secret);
  const now = Date.now();
  const payload = {
    role: 'admin',
    iat: now,
    exp: now + SESSION_DURATION_MS,
    nonce: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  };
  const payloadStr = JSON.stringify(payload);
  const encodedPayload = bufferToBase64Url(strToUint8(payloadStr));

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    strToUint8(encodedPayload)
  );
  const encodedSignature = bufferToBase64Url(signatureBuffer);

  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Validates the HMAC-SHA256 signature and expiration of an incoming session token
 */
export async function verifySessionToken(token, env) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [encodedPayload, encodedSignature] = parts;
  try {
    const secret = getSecret(env);
    const key = await getHmacKey(secret);
    const signatureBytes = base64UrlToUint8(encodedSignature);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      strToUint8(encodedPayload)
    );

    if (!isValid) return false;

    const payloadJson = new TextDecoder().decode(base64UrlToUint8(encodedPayload));
    const payload = JSON.parse(payloadJson);

    if (!payload.exp || typeof payload.exp !== 'number') return false;
    if (Date.now() > payload.exp) return false;

    return payload;
  } catch {
    return false;
  }
}

/**
 * Extracts a named cookie from the Request headers
 */
export function getCookie(request, name = COOKIE_NAME) {
  if (!request) return null;
  const headers = request.headers;
  const cookieHeader = (headers && typeof headers.get === 'function' ? headers.get('Cookie') || headers.get('cookie') : (headers && (headers.cookie || headers.Cookie))) || '';
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith(name + '=')) {
      return decodeURIComponent(c.substring(name.length + 1));
    }
  }
  return null;
}

/**
 * Multi-vector token extractor: extracts session token from Cookies, Authorization headers, or Query parameters.
 * Guarantees that embedded iframes (e.g. AI Studio preview) or strict privacy browsers unlock successfully even when cookies are restricted.
 */
export function extractToken(request, urlObj) {
  if (!request) return null;

  // 1. Check incoming cookie
  const cookie = getCookie(request);
  if (cookie) return cookie;

  // 2. Check Authorization header (Bearer <token>)
  const headers = request.headers;
  const authHeader = (headers && typeof headers.get === 'function' ? headers.get('Authorization') || headers.get('authorization') : (headers && (headers.authorization || headers.Authorization))) || '';
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.substring(7).trim();
    if (bearer) return bearer;
  }

  // 3. Check URL query parameters (?auth=... or ?token=...)
  if (urlObj && urlObj.searchParams) {
    const queryToken = urlObj.searchParams.get('auth') || urlObj.searchParams.get('token');
    if (queryToken) return queryToken.trim();
  }

  return null;
}

/**
 * Generates an HttpOnly session cookie header.
 * When isSecure is true (HTTPS), uses SameSite=None; Secure so it works seamlessly within iframes!
 * When isSecure is false (HTTP localhost), uses SameSite=Lax.
 */
export function buildSessionCookie(token, isSecure = true) {
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  const sameSite = isSecure ? 'SameSite=None; Secure' : 'SameSite=Lax';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; ${sameSite}`;
}

/**
 * Generates an expired Set-Cookie header for clearing authentication
 */
export function buildClearCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
