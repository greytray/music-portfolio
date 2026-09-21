import { AdminApp } from './adminApp.js';
import { initPublishedDesignSchema } from '../utils/schemaApplier.js';

let isEditorInitialized = false;

// Tab-scoped administrative session management:
// Retains ?auth=<token> so soft refreshes (F5, Ctrl+R, reload button) preserve authentication natively
try {
  const currentUrl = new URL(window.location.href);
  const queryToken = currentUrl.searchParams.get('auth') || currentUrl.searchParams.get('token');
  const storedToken = sessionStorage.getItem('eko_admin_token');

  const activeToken = queryToken || storedToken;

  if (activeToken) {
    sessionStorage.setItem('eko_admin_token', activeToken);
    // Ensure URL query param ?auth=<token> is present so browser reloads retain session
    if (!currentUrl.searchParams.get('auth')) {
      currentUrl.searchParams.set('auth', activeToken);
      window.history.replaceState({}, document.title, currentUrl.pathname + '?' + currentUrl.searchParams.toString() + currentUrl.hash);
    }
  } else {
    // If no active token in this tab session, return to gate
    window.location.href = '/admin';
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
