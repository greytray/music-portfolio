import { AdminApp } from './adminApp.js';
import { initPublishedDesignSchema } from '../utils/schemaApplier.js';

let isEditorInitialized = false;

// Extract token from URL query string if passed during authentication redirect
try {
  const currentUrl = new URL(window.location.href);
  const token = currentUrl.searchParams.get('auth') || currentUrl.searchParams.get('token');
  if (token) {
    sessionStorage.setItem('eko_admin_token', token);
    localStorage.setItem('eko_admin_token', token);
    document.cookie = 'eko_session=' + encodeURIComponent(token) + '; path=/; max-age=86400; SameSite=Lax';

    // Scrub query parameter from browser address bar immediately so token does not linger in history
    currentUrl.searchParams.delete('auth');
    currentUrl.searchParams.delete('token');
    const cleanUrl = currentUrl.pathname + (currentUrl.search ? currentUrl.search : '') + currentUrl.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }
} catch (_) {}

/**
 * Mounts the Figma-style backend studio workspace natively
 */
export function mountEditor() {
  if (isEditorInitialized) return;
  isEditorInitialized = true;

  // Clean up any remaining wrapper elements
  const errorScreen = document.getElementById('fake-chrome-error-screen');
  if (errorScreen) errorScreen.remove();

  const errorStyles = document.getElementById('fake-chrome-error-styles');
  if (errorStyles) errorStyles.remove();

  const promptModal = document.getElementById('trapdoor-prompt-modal');
  if (promptModal) promptModal.remove();

  // Set canvas styling for the backend editor workspace
  document.title = 'Eko — In-Context Visual Editor (Design Mode)';
  document.body.className = '';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.background = '#07070a';
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';
  document.documentElement.style.height = '100vh';
  document.documentElement.style.overflow = 'hidden';

  // Initialize visual overrides schema and mount the backend studio workspace
  initPublishedDesignSchema();
  new AdminApp(document.body);
}

// Global logout helper for administrative sessions
window.adminLogout = async function() {
  try {
    sessionStorage.removeItem('eko_admin_token');
    localStorage.removeItem('eko_admin_token');
    document.cookie = 'eko_session=; path=/; max-age=0;';
    await fetch('/api/auth?action=logout', { method: 'GET' });
  } catch (_) {}
  window.location.href = '/admin';
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountEditor);
} else {
  mountEditor();
}
