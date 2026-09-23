// Cloudflare Pages Middleware: /functions/admin/_middleware.js
// Intercepts all /admin* requests to protect the admin editor codebase at the edge

import { verifySessionToken, extractToken, buildClearCookie } from '../_auth.js';
import { FAKE_CHROME_ERROR_HTML } from '../_fakeErrorHtml.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Validate session token from query parameters (?auth=... or ?token=...), cookies, or headers
  const token = extractToken(request, url);
  const session = token ? await verifySessionToken(token, env) : null;

  if (session) {
    // Authorized: Let request pass through natively to load visual editor
    return await context.next();
  }

  // 2. Unauthenticated (New arrival, missing token, expired session, or invalid signature):
  // Return ONLY the static fake Chrome error page
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

