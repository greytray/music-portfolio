// Cloudflare Pages Function: /functions/admin.html.js
// Intercepts /admin.html to ensure edge protection matches /admin

export { onRequest } from './admin/_middleware.js';
