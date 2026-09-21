// Cloudflare Pages Middleware: /functions/admin/_middleware.js
// Intercepts all /admin* requests to protect the admin editor codebase at the edge

import { verifySessionToken, buildClearCookie } from '../_auth.js';
import { FAKE_CHROME_ERROR_HTML } from '../_fakeErrorHtml.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Detect hard refresh: Cache-Control or Pragma header with 'no-cache'
  const cacheControl = (request.headers.get('cache-control') || '').toLowerCase();
  const pragma = (request.headers.get('pragma') || '').toLowerCase();
  const isHardRefresh = cacheControl.includes('no-cache') || pragma.includes('no-cache');

  if (isHardRefresh) {
    return new Response(FAKE_CHROME_ERROR_HTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Set-Cookie': buildClearCookie(),
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 2. Validate session token from query parameters (?auth=... or ?token=...)
  // On new arrivals (/admin), query token is absent, requiring authentication each time.
  // On soft refreshes, the browser reloads the current URL retaining ?auth=<token>.
  const queryToken = (url.searchParams.get('auth') || url.searchParams.get('token') || '').trim();
  const session = queryToken ? await verifySessionToken(queryToken, env) : null;

  if (session) {
    // Authorized: Let request pass through natively to load visual editor
    return await context.next();
  }

  // Unauthenticated (New arrival, missing token, or invalid signature):
  // Return ONLY the static fake Chrome error page
  return new Response(FAKE_CHROME_ERROR_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

