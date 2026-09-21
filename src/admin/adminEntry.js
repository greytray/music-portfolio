import { AdminApp } from './adminApp.js';
import { initPublishedDesignSchema } from '../utils/schemaApplier.js';

// Administrative authorization password
const SECRET_PHRASE = 'eko090';

let isEditorInitialized = false;

/**
 * Clears away the fake Chrome error screen and fully mounts the Figma-style editor
 */
function unlockAndMountEditor() {
  if (isEditorInitialized) return;
  isEditorInitialized = true;

  // 1. Remove fake Chrome error DOM elements and custom modal
  const errorScreen = document.getElementById('fake-chrome-error-screen');
  if (errorScreen) {
    errorScreen.remove();
  }

  const errorStyles = document.getElementById('fake-chrome-error-styles');
  if (errorStyles) {
    errorStyles.remove();
  }

  const promptModal = document.getElementById('trapdoor-prompt-modal');
  if (promptModal) {
    promptModal.remove();
  }

  // 2. Reset document title and body canvas styling for the backend editor
  document.title = 'Eko — In-Context Visual Editor (Design Mode)';
  document.body.className = '';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.background = '#07070a';
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';
  document.documentElement.style.height = '100vh';
  document.documentElement.style.overflow = 'hidden';

  // 3. Initialize visual overrides schema and mount the backend studio workspace
  initPublishedDesignSchema();
  new AdminApp(document.body);
}

/**
 * Renders a clean, reliable, styled pop-up box prompt (never blocked by iframe sandbox)
 */
function showPasswordPromptModal() {
  let modal = document.getElementById('trapdoor-prompt-modal');
  if (modal) {
    modal.style.display = 'flex';
    const input = document.getElementById('trapdoor-password-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    const err = document.getElementById('trapdoor-error-msg');
    if (err) err.style.display = 'none';
    return;
  }

  // Create clean modal markup matching Chrome system prompt aesthetics
  modal = document.createElement('div');
  modal.id = 'trapdoor-prompt-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999999;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  modal.innerHTML = `
    <div id="trapdoor-dialog-box" style="
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12);
      width: 90%;
      max-width: 440px;
      padding: 24px 28px;
      box-sizing: border-box;
      color: #202124;
      animation: trapdoorFadeIn 0.18s ease-out;
    ">
      <style>
        @keyframes trapdoorFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        #trapdoor-password-input:focus {
          border-color: #1a73e8 !important;
          outline: 2px solid rgba(26, 115, 232, 0.2) !important;
        }
      </style>
      <div style="font-size: 15px; font-weight: 500; color: #202124; margin-bottom: 14px; line-height: 1.4;">
        Enter administrative authorization password:
      </div>
      <input
        id="trapdoor-password-input"
        type="password"
        autocomplete="off"
        autofocus
        placeholder="Password"
        style="
          width: 100%;
          box-sizing: border-box;
          padding: 10px 14px;
          font-size: 14px;
          border: 1px solid #dadce0;
          border-radius: 4px;
          background: #ffffff;
          color: #202124;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        "
      />
      <div id="trapdoor-error-msg" style="
        display: none;
        color: #d93025;
        font-size: 13px;
        margin-top: 8px;
        font-weight: 500;
      ">
        ERR_ADDRESS_UNREACHABLE: Invalid administrative password.
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px;">
        <button id="trapdoor-cancel-btn" type="button" style="
          padding: 8px 18px;
          font-size: 14px;
          font-weight: 500;
          color: #1a73e8;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.15s ease;
        ">Cancel</button>
        <button id="trapdoor-submit-btn" type="button" style="
          padding: 8px 22px;
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          background: #1a73e8;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
          transition: background 0.15s ease;
        ">OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const input = modal.querySelector('#trapdoor-password-input');
  const submitBtn = modal.querySelector('#trapdoor-submit-btn');
  const cancelBtn = modal.querySelector('#trapdoor-cancel-btn');
  const errorMsg = modal.querySelector('#trapdoor-error-msg');

  function handleVerify() {
    const val = input.value.trim();
    if (val === SECRET_PHRASE) {
      modal.remove();
      unlockAndMountEditor();
    } else {
      errorMsg.style.display = 'block';
      input.value = '';
      input.focus();
    }
  }

  function handleClose() {
    modal.style.display = 'none';
    input.value = '';
    errorMsg.style.display = 'none';
  }

  submitBtn.addEventListener('click', handleVerify);
  cancelBtn.addEventListener('click', handleClose);

  // Keyboard controls: Enter to submit, Escape to close
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerify();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      handleClose();
    }
  });

  setTimeout(() => input.focus(), 60);
}

/**
 * Strictly prevents copying, downloading, right-clicking, or dragging the sad file icon
 */
function protectFromCopyAndDownload() {
  const elements = [
    document.getElementById('sad-file-trigger'),
    document.getElementById('sad-file-icon'),
    document.getElementById('sad-file-shield'),
  ].filter(Boolean);

  elements.forEach((el) => {
    // 1. Prevent right-click context menu (Save image as..., Copy image, etc.)
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    // 2. Prevent drag-and-drop to desktop or other tabs
    el.addEventListener('dragstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    // 3. Prevent text/element selection
    el.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    });

    // 4. Intercept and block keyboard copy shortcuts
    el.addEventListener('copy', (e) => {
      e.preventDefault();
      return false;
    });
  });
}

/**
 * Attaches the hidden double-click trigger strictly to the Sad File Icon
 */
function initTrapdoor() {
  protectFromCopyAndDownload();

  // Back button functionality
  const backBtn = document.getElementById('chrome-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', (event) => {
      if (typeof window.handleChromeBack === 'function') {
        window.handleChromeBack(event);
      } else {
        if (window.history.length > 1) {
          window.history.back();
          setTimeout(() => { window.location.href = '/'; }, 250);
        } else {
          window.location.href = '/';
        }
      }
    });
  }

  const sadFileWrapper = document.getElementById('sad-file-trigger');
  const sadFileShield = document.getElementById('sad-file-shield');
  const sadFileIcon = document.getElementById('sad-file-icon');
  const targetElement = sadFileShield || sadFileWrapper || sadFileIcon;

  if (!targetElement) return;

  // 1. Native dblclick event
  targetElement.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    showPasswordPromptModal();
  });

  // 2. Rapid two-click tracker (500ms threshold for trackpads/touch/iframes)
  let lastClickTime = 0;
  targetElement.addEventListener('click', (event) => {
    const now = Date.now();
    if (now - lastClickTime < 500) {
      event.preventDefault();
      event.stopPropagation();
      lastClickTime = 0;
      showPasswordPromptModal();
    } else {
      lastClickTime = now;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTrapdoor);
} else {
  initTrapdoor();
}
