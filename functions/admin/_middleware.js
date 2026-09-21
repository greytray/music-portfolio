// Cloudflare Pages Middleware: /functions/admin/_middleware.js
// Intercepts all /admin* requests to protect the admin editor codebase at the edge

import { verifySessionToken, extractToken, buildSessionCookie, getCookie } from '../_auth.js';
import { FAKE_CHROME_ERROR_HTML } from '../_fakeErrorHtml.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Check incoming cookie, header, or query param for cryptographically signed session
  const token = extractToken(request, url);
  const session = await verifySessionToken(token, env);

  if (session) {
    // Authorized! Let request pass through natively to load real visual editor code
    const response = await context.next();

    // If authorized via query param or header, persist session cookie in response for subsequent calls
    const existingCookie = getCookie(request);
    if (token && !existingCookie) {
      const isHttps = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
      const cookieHeader = buildSessionCookie(token, isHttps);
      const newHeaders = new Headers(response.headers);
      newHeaders.append('Set-Cookie', cookieHeader);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  }

  // Unauthenticated: Intercept request and return ONLY the static fake Chrome error page
  // Zero editor code, components, or secrets are leaked to the client
  return new Response(FAKE_CHROME_ERROR_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
