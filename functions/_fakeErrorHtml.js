// Shared Fake Chrome Error HTML template
// Intercepts unauthenticated /admin* visits so zero editor modules are sent to the client

export const FAKE_CHROME_ERROR_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Site Error">
  <title>This site can’t be reached</title>
  <style id="fake-chrome-error-styles">
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #ffffff;
      color: #202124;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
      box-sizing: border-box;
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
      background-color: #ffffff;
      padding: 16vh 24px 60px 24px;
      box-sizing: border-box;
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
      transition: opacity 0.15s ease;
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
      color: #202124;
      margin: 0 0 16px 0;
      letter-spacing: -0.2px;
      -webkit-font-smoothing: antialiased;
    }
    .chrome-error-message {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: #5f6368;
      margin: 0 0 32px 0;
      word-break: break-word;
      -webkit-font-smoothing: antialiased;
    }
    .chrome-error-code {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #5f6368;
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
      background-color: #ffffff;
      color: #5F6368;
      border: 1px solid #5F6368;
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
      background-color: #f8f9fa;
      border-color: #202124;
      color: #202124;
      box-shadow: none;
    }
    .chrome-btn-back:active {
      background-color: #f1f3f4;
    }
  </style>
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
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.45);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:9999999;font-family:Arial,Helvetica,sans-serif;';

      modal.innerHTML = \`
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
              transition: border-color 0.15s ease;
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
