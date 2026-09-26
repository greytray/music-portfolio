// Shared Fake Chrome Error HTML template
// Intercepts unauthenticated /admin* visits so zero editor modules are sent to the client

export const FAKE_CHROME_ERROR_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="Site Error">
  <title>This site can’t be reached</title>
  <style id="fake-chrome-error-styles">
    :root {
      color-scheme: light dark;
      --error-bg: #ffffff;
      --error-text: #202124;
      --error-secondary: #5f6368;
      --error-btn-bg: #ffffff;
      --error-btn-border: #5f6368;
      --error-btn-color: #5f6368;
      --error-btn-hover-bg: #f8f9fa;
      --error-btn-hover-border: #202124;
      --error-btn-hover-color: #202124;
      --error-icon-filter: none;
      --dialog-bg: #ffffff;
      --dialog-text: #202124;
      --dialog-input-bg: #ffffff;
      --dialog-input-border: #dadce0;
      --dialog-input-text: #202124;
      --dialog-cancel-color: #1a73e8;
      --dialog-submit-bg: #1a73e8;
      --dialog-submit-color: #ffffff;
      --dialog-err-color: #d93025;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --error-bg: #202124;
        --error-text: #e8eaed;
        --error-secondary: #9aa0a6;
        --error-btn-bg: #202124;
        --error-btn-border: #5f6368;
        --error-btn-color: #8ab4f8;
        --error-btn-hover-bg: #303134;
        --error-btn-hover-border: #8ab4f8;
        --error-btn-hover-color: #8ab4f8;
        --error-icon-filter: grayscale(1) brightness(1.6) contrast(1.1);
        --dialog-bg: #292a2d;
        --dialog-text: #e8eaed;
        --dialog-input-bg: #202124;
        --dialog-input-border: #5f6368;
        --dialog-input-text: #e8eaed;
        --dialog-cancel-color: #8ab4f8;
        --dialog-submit-bg: #8ab4f8;
        --dialog-submit-color: #202124;
        --dialog-err-color: #f28b82;
      }
    }

    [data-theme="dark"],
    .theme-dark {
      --error-bg: #202124 !important;
      --error-text: #e8eaed !important;
      --error-secondary: #9aa0a6 !important;
      --error-btn-bg: #202124 !important;
      --error-btn-border: #5f6368 !important;
      --error-btn-color: #8ab4f8 !important;
      --error-btn-hover-bg: #303134 !important;
      --error-btn-hover-border: #8ab4f8 !important;
      --error-btn-hover-color: #8ab4f8 !important;
      --error-icon-filter: grayscale(1) brightness(1.6) contrast(1.1) !important;
      --dialog-bg: #292a2d !important;
      --dialog-text: #e8eaed !important;
      --dialog-input-bg: #202124 !important;
      --dialog-input-border: #5f6368 !important;
      --dialog-input-text: #e8eaed !important;
      --dialog-cancel-color: #8ab4f8 !important;
      --dialog-submit-bg: #8ab4f8 !important;
      --dialog-submit-color: #202124 !important;
      --dialog-err-color: #f28b82 !important;
    }

    [data-theme="light"],
    .theme-light {
      --error-bg: #ffffff !important;
      --error-text: #202124 !important;
      --error-secondary: #5f6368 !important;
      --error-btn-bg: #ffffff !important;
      --error-btn-border: #5f6368 !important;
      --error-btn-color: #5f6368 !important;
      --error-btn-hover-bg: #f8f9fa !important;
      --error-btn-hover-border: #202124 !important;
      --error-btn-hover-color: #202124 !important;
      --error-icon-filter: none !important;
      --dialog-bg: #ffffff !important;
      --dialog-text: #202124 !important;
      --dialog-input-bg: #ffffff !important;
      --dialog-input-border: #dadce0 !important;
      --dialog-input-text: #202124 !important;
      --dialog-cancel-color: #1a73e8 !important;
      --dialog-submit-bg: #1a73e8 !important;
      --dialog-submit-color: #ffffff !important;
      --dialog-err-color: #d93025 !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: var(--error-bg);
      color: var(--error-text);
      font-family: Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
      box-sizing: border-box;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    *, *::before, *::after {
      box-sizing: inherit;
    }
    .chrome-error-wrapper {
      min-height: 100vh;
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      background-color: var(--error-bg);
      padding: 16vh 24px 60px 24px;
      box-sizing: border-box;
      transition: background-color 0.15s ease;
    }
    @media (max-width: 768px) {
      .chrome-error-wrapper {
        padding: 12vh 20px 40px 20px;
      }
    }
    .chrome-error-container {
      max-width: 560px;
      width: 100%;
      margin: 0 auto;
      text-align: left;
    }
    .sad-file-wrapper {
      position: relative;
      margin-bottom: 34px;
      display: inline-block;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-drag: none;
      -webkit-touch-callout: none;
      cursor: default;
    }
    #sad-file-icon {
      display: block;
      width: 49.5px;
      height: 57px;
      cursor: default;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      shape-rendering: crispEdges;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-user-drag: none;
      filter: var(--error-icon-filter);
      transition: opacity 0.15s ease, filter 0.2s ease;
    }
    .sad-file-shield {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      pointer-events: auto;
      cursor: default;
      user-select: none;
      -webkit-user-select: none;
      -webkit-user-drag: none;
      -webkit-touch-callout: none;
      z-index: 10;
    }
    .sad-file-wrapper:active #sad-file-icon {
      opacity: 0.85;
    }
    .chrome-error-title {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 24px;
      font-weight: 500;
      line-height: 1.33;
      color: var(--error-text);
      margin: 0 0 16px 0;
      letter-spacing: -0.2px;
      -webkit-font-smoothing: antialiased;
    }
    .chrome-error-message {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: var(--error-secondary);
      margin: 0 0 32px 0;
      word-break: break-word;
      -webkit-font-smoothing: antialiased;
    }
    .chrome-error-code {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: var(--error-secondary);
      letter-spacing: 0.25px;
      margin: 0;
      user-select: all;
      -webkit-font-smoothing: antialiased;
    }
    .chrome-button-row {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      margin-top: 36px;
    }
    .chrome-btn-back {
      background-color: var(--error-btn-bg);
      color: var(--error-btn-color);
      border: 1px solid var(--error-btn-border);
      border-radius: 100px;
      padding: 7px 18px;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
      cursor: pointer;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      box-shadow: none;
      outline: none;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .chrome-btn-back:hover {
      background-color: var(--error-btn-hover-bg);
      border-color: var(--error-btn-hover-border);
      color: var(--error-btn-hover-color);
      box-shadow: none;
    }
    .chrome-btn-back:active {
      opacity: 0.85;
    }
  </style>
  <script>
    (function() {
      function syncSystemTheme() {
        try {
          var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          var theme = isDark ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', theme);
          document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
          if (document.body) {
            document.body.setAttribute('data-theme', theme);
          }
        } catch (_) {}
      }
      syncSystemTheme();
      if (window.matchMedia) {
        try {
          var mql = window.matchMedia('(prefers-color-scheme: dark)');
          if (mql.addEventListener) {
            mql.addEventListener('change', syncSystemTheme);
          } else if (mql.addListener) {
            mql.addListener(syncSystemTheme);
          }
        } catch (_) {}
      }
    })();
  </script>
</head>
<body class="fake-error-body">
  <div id="fake-chrome-error-screen" class="chrome-error-wrapper">
    <div class="chrome-error-container">
      <div class="sad-file-wrapper" id="sad-file-trigger" oncontextmenu="return false;" ondragstart="return false;" onselectstart="return false;" title="">
        <!-- Using icon from assets/icons/sad_file_fixed.svg -->
        <img id="sad-file-icon" src="/assets/icons/sad_file_fixed.svg" alt="" width="50" height="57" draggable="false" oncontextmenu="return false;" ondragstart="return false;" />
        <div id="sad-file-shield" class="sad-file-shield" oncontextmenu="return false;" ondragstart="return false;" onselectstart="return false;"></div>
      </div>
      <h1 class="chrome-error-title">This site can’t be reached</h1>
      <p class="chrome-error-message">The webpage at https://pages.dev might be temporarily down or it may have moved permanently to a new web address.</p>
      <p class="chrome-error-code">ERR_ADDRESS_UNREACHABLE</p>
      <div class="chrome-button-row">
        <button type="button" class="chrome-btn-back" id="chrome-back-btn" onclick="handleChromeBack(event)">Back</button>
      </div>
    </div>
  </div>

  <script>
    function handleChromeBack(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (document.referrer && document.referrer !== window.location.href) {
        try {
          var refUrl = new URL(document.referrer);
          if (refUrl.origin === window.location.origin) {
            window.location.replace(document.referrer);
            return;
          }
        } catch (_) {}
      }
      if (window.history && window.history.length > 1) {
        window.history.back();
        setTimeout(function() { window.location.href = '/'; }, 250);
      } else {
        window.location.href = '/';
      }
    }
    window.handleChromeBack = handleChromeBack;

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

      modal = document.createElement('div');
      modal.id = 'trapdoor-prompt-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:9999999;font-family:Arial,Helvetica,sans-serif;';

      modal.innerHTML = \`
        <div id="trapdoor-dialog-box" style="
          background: var(--dialog-bg, #ffffff);
          border-radius: 8px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.15);
          width: 90%;
          max-width: 440px;
          padding: 24px 28px;
          box-sizing: border-box;
          color: var(--dialog-text, #202124);
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
          <div style="font-size: 15px; font-weight: 500; color: var(--dialog-text, #202124); margin-bottom: 14px; line-height: 1.4;">
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
              border: 1px solid var(--dialog-input-border, #dadce0);
              border-radius: 4px;
              background: var(--dialog-input-bg, #ffffff);
              color: var(--dialog-input-text, #202124);
              outline: none;
              transition: border-color 0.15s ease;
            "
          />
          <div id="trapdoor-error-msg" style="
            display: none;
            color: var(--dialog-err-color, #d93025);
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
              color: var(--dialog-cancel-color, #1a73e8);
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
              color: var(--dialog-submit-color, #ffffff);
              background: var(--dialog-submit-bg, #1a73e8);
              border: none;
              border-radius: 4px;
              cursor: pointer;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
              transition: background 0.15s ease;
            ">OK</button>
          </div>
        </div>
      \`;

      document.body.appendChild(modal);

      const input = modal.querySelector('#trapdoor-password-input');
      const submitBtn = modal.querySelector('#trapdoor-submit-btn');
      const cancelBtn = modal.querySelector('#trapdoor-cancel-btn');
      const errorMsg = modal.querySelector('#trapdoor-error-msg');

      async function handleVerify() {
        const val = input.value.trim();
        if (!val) {
          input.focus();
          return;
        }

        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.textContent = 'Verifying...';

        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: val }),
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success) {
            submitBtn.textContent = 'Authorized';
            submitBtn.style.background = '#1e8e3e';

            if (data.token) {
              try {
                sessionStorage.setItem('eko_admin_token', data.token);
              } catch (_) {}

              // Navigate with auth parameter so edge/server middleware unlocks natively
              window.location.href = '/admin?auth=' + encodeURIComponent(data.token);
            } else {
              window.location.reload();
            }
          } else {
            errorMsg.textContent = data.error || 'ERR_ADDRESS_UNREACHABLE: Invalid administrative password.';
            errorMsg.style.display = 'block';
            input.value = '';
            input.focus();
          }
        } catch (err) {
          errorMsg.textContent = 'Connection error. Please try again.';
          errorMsg.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          if (submitBtn.textContent === 'Verifying...') {
            submitBtn.textContent = 'OK';
          }
        }
      }

      function handleClose() {
        modal.style.display = 'none';
        input.value = '';
        errorMsg.style.display = 'none';
      }

      submitBtn.addEventListener('click', handleVerify);
      cancelBtn.addEventListener('click', handleClose);

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
        if (e.target === modal) handleClose();
      });

      setTimeout(() => input.focus(), 60);
    }

    function initTrapdoor() {
      const elements = [
        document.getElementById('sad-file-trigger'),
        document.getElementById('sad-file-icon'),
        document.getElementById('sad-file-shield'),
      ].filter(Boolean);

      elements.forEach((el) => {
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); return false; });
        el.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); return false; });
        el.addEventListener('selectstart', (e) => { e.preventDefault(); return false; });
        el.addEventListener('copy', (e) => { e.preventDefault(); return false; });
      });

      const sadFileShield = document.getElementById('sad-file-shield');
      const sadFileWrapper = document.getElementById('sad-file-trigger');
      const sadFileIcon = document.getElementById('sad-file-icon');
      const targetElement = sadFileShield || sadFileWrapper || sadFileIcon;

      if (!targetElement) return;

      // 1. Native dblclick
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
      // Cleanup: on fake error page load, scrub query tokens from URL and clear stale tokens
      try {
        if (window.location.search.includes('auth') || window.location.search.includes('token')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        sessionStorage.removeItem('eko_admin_token');
        localStorage.removeItem('eko_admin_token');
      } catch (_) {}
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTrapdoor);
    } else {
      initTrapdoor();
    }
  </script>
</body>
</html>`;
