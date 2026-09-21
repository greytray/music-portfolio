// Cloudflare Pages Function: /api/auth
// Handles administrative authentication, password verification, and session token issuance

import {
  createSessionToken,
  verifyAdminPassword,
  buildSessionCookie,
  buildClearCookie,
  verifySessionToken,
  extractToken
} from '../_auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 1. POST: Validate password and return signed session cookie + token
  if (request.method === 'POST') {
    try {
      let password = '';
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await request.json().catch(() => ({}));
        password = body.password || '';
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData().catch(() => new FormData());
        password = formData.get('password') || '';
      }

      const isValidPassword = await verifyAdminPassword(password, env);

      if (!isValidPassword) {
        // Throttling delay to thwart automated high-speed brute force attacks
        await new Promise((resolve) => setTimeout(resolve, 400));
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid administrative authorization password'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Generate cryptographically signed token valid for 24 hours
      const token = await createSessionToken(env);
      const isHttps = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
      const cookieHeader = buildSessionCookie(token, isHttps);

      return new Response(JSON.stringify({
        success: true,
        token: token,
        message: 'Administrative authorization verified'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication request failed: ' + err.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  // 2. GET: Check current session validity or handle logout
  if (request.method === 'GET') {
    if (url.searchParams.get('action') === 'logout') {
      return new Response(JSON.stringify({ success: true, message: 'Logged out' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildClearCookie(),
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const token = extractToken(request, url);
    const session = await verifySessionToken(token, env);

    if (session) {
      return new Response(JSON.stringify({ authenticated: true, exp: session.exp }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // 3. DELETE: Clear session cookie
  if (request.method === 'DELETE') {
    return new Response(JSON.stringify({ success: true, message: 'Session terminated' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildClearCookie(),
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
