import { cartStore } from './store/cartStore.js';

// Dynamic modules registry for on-demand lazy loading
const VIEW_LOADERS = {
  beats: () => import('./views/buy-beats.js'),
  'buy-beats': () => import('./views/buy-beats.js'),
  sessions: () => import('./views/sessions.js'),
  'send-audio': () => import('./views/send-audio.js'),
  audio: () => import('./views/send-audio.js'),
  sendaudio: () => import('./views/send-audio.js'),
  orders: () => import('./views/orders.js'),
  cart: () => import('./views/cart.js')
};

// Canonical view keys and display titles
const VIEW_CONFIG = {
  beats: { id: 'beats', hash: 'beats', title: 'Buy Beats', factory: 'createBuyBeatsView' },
  'buy-beats': { id: 'beats', hash: 'beats', title: 'Buy Beats', factory: 'createBuyBeatsView' },
  sessions: { id: 'sessions', hash: 'sessions', title: 'Sessions', factory: 'createSessionsView' },
  'send-audio': { id: 'send-audio', hash: 'send-audio', title: 'Send Audio', factory: 'createSendAudioView' },
  audio: { id: 'send-audio', hash: 'send-audio', title: 'Send Audio', factory: 'createSendAudioView' },
  sendaudio: { id: 'send-audio', hash: 'send-audio', title: 'Send Audio', factory: 'createSendAudioView' },
  orders: { id: 'orders', hash: 'orders', title: 'Orders', factory: 'createOrdersView' },
  cart: { id: 'cart', hash: 'cart', title: 'Studio Cart', factory: 'createCartView' }
};

// In-memory cache for loaded view elements so reopening is instant without reloading
const loadedViews = new Map();
let currentOpenViewId = null;

// Audio hook: pause main landing page player if playing
export function pauseMainLandingAudio() {
  if (typeof window.pauseLandingPlayer === 'function') {
    window.pauseLandingPlayer();
  }
  const landingAudio = document.querySelector('#audio');
  if (landingAudio && !landingAudio.paused) {
    landingAudio.pause();
    const mainPlay = document.querySelector('#main-play');
    if (mainPlay) mainPlay.classList.remove('is-playing');
    document.querySelectorAll('.track').forEach(t => t.classList.remove('is-playing'));
  }
}

// Expose on window for easy access
window.pauseMainLandingAudio = pauseMainLandingAudio;

// Initialize the Navigation & Hidden Page Architecture
export function initHiddenPageArchitecture() {
  const overlay = document.getElementById('fullscreen-view-container');
  const viewBody = document.getElementById('fullscreen-view-body');
  const btnBack = document.getElementById('btn-back-to-studio');
  const viewTitle = document.getElementById('fullscreen-view-title');
  const topbarCartBtn = document.getElementById('topbar-cart-btn');
  const topbarCartBadge = document.getElementById('topbar-cart-badge');
  const navCartBadge = document.getElementById('nav-cart-badge');

  // Update Cart Badges
  cartStore.subscribe(items => {
    const count = cartStore.getCount();
    if (navCartBadge) {
      navCartBadge.textContent = count;
      navCartBadge.classList.toggle('has-items', count > 0);
    }
    if (topbarCartBadge) {
      topbarCartBadge.textContent = count;
    }
  });

  if (topbarCartBtn) {
    topbarCartBtn.addEventListener('click', () => {
      openView('cart');
    });
  }

  // Back to Studio button handler
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      closeCurrentView();
    });
  }

  // Keyboard shortcut Esc to close view
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentOpenViewId) {
      closeCurrentView();
    }
  });

  // Open a full screen view on demand
  async function openView(requestedKey, pushHistory = true) {
    const config = VIEW_CONFIG[requestedKey];
    if (!config) return;

    const viewId = config.id;
    currentOpenViewId = viewId;

    // 1. Hook: automatically pause/fade any background music playing on main landing page
    pauseMainLandingAudio();

    // 2. Lock body scroll
    document.body.classList.add('modal-open');

    // 3. Update topbar title
    if (viewTitle) {
      viewTitle.textContent = config.title;
    }

    // 4. Update address bar hash cleanly without reloading
    if (pushHistory) {
      const targetHash = '#' + config.hash;
      if (window.location.hash !== targetHash) {
        window.history.pushState({ view: viewId }, '', targetHash);
      }
    }

    // 5. Open overlay container
    overlay.classList.add('is-open');
    overlay.scrollTop = 0;

    // 6. Check if view was already loaded in memory (on-demand cache)
    if (loadedViews.has(viewId)) {
      // Instant switch: hide all other cached views, show this one
      Array.from(viewBody.children).forEach(child => {
        child.style.display = 'none';
      });
      const cachedView = loadedViews.get(viewId);
      cachedView.style.display = 'block';
      if (!viewBody.contains(cachedView)) {
        viewBody.appendChild(cachedView);
      }
      return;
    }

    // 7. On-demand dynamic module import (only when first clicked)
    // Show smooth loading state
    viewBody.innerHTML = `
      <div class="view-loading-state">
        <div class="view-loading-spinner"></div>
        <p>Loading ${config.title}...</p>
      </div>
    `;

    try {
      const moduleLoader = VIEW_LOADERS[viewId];
      if (!moduleLoader) throw new Error('No loader for ' + viewId);

      const module = await moduleLoader();
      const factoryFn = module[config.factory];
      if (typeof factoryFn !== 'function') {
        throw new Error(`Factory function ${config.factory} not found in module`);
      }

      // Create view element passing navigation helper
      const viewElement = factoryFn({
        navigateTo: (dest) => {
          if (dest === 'top' || dest === 'showcase' || dest === 'contact' || dest === 'services' || dest === 'process') {
            scrollToSection(dest);
          } else {
            openView(dest);
          }
        }
      });

      // Cache in memory
      loadedViews.set(viewId, viewElement);

      // Hide other children and append
      Array.from(viewBody.children).forEach(child => {
        child.style.display = 'none';
      });
      viewElement.style.display = 'block';
      viewBody.appendChild(viewElement);

    } catch (err) {
      console.error('Failed to load view:', err);
      viewBody.innerHTML = `
        <div class="empty-state">
          <p style="color: #ff6b6b;">Failed to load view. Please check network connection.</p>
          <button type="button" class="btn-primary-sm" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  // Close full-screen view and return cleanly to studio landing page
  function closeCurrentView(clearHash = true) {
    if (!currentOpenViewId) return;

    // Pause any playback inside active views
    if (loadedViews.has(currentOpenViewId)) {
      const activeEl = loadedViews.get(currentOpenViewId);
      if (typeof activeEl.pausePlayback === 'function') {
        activeEl.pausePlayback();
      }
    }

    currentOpenViewId = null;
    overlay.classList.remove('is-open');
    document.body.classList.remove('modal-open');

    // Cleanly clear hash in address bar without scrolling
    if (clearHash) {
      window.history.pushState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }
  }

  // Smooth scroll handler for landing page sections without adding hash to URL
  function scrollToSection(targetId) {
    if (!targetId) return;

    // 1. If a full-screen view is open, close it cleanly without hash
    if (currentOpenViewId) {
      closeCurrentView(true);
    }

    // 2. Perform smooth scrolling to the target section
    if (targetId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      const header = document.querySelector('.site-header');
      const headerOffset = header ? header.offsetHeight + 16 : 64;
      const elementTop = targetEl.getBoundingClientRect().top + window.pageYOffset;
      const scrollDestination = Math.max(0, elementTop - headerOffset);

      window.scrollTo({
        top: scrollDestination,
        behavior: 'smooth'
      });
    }
  }

  // Expose on window for components or external triggers
  window.scrollToSection = scrollToSection;
  window.closeCurrentView = closeCurrentView;
  window.openStudioView = openView;

  // Attach smooth scroll buttons (Showcase, Services, Contact, Brand Home, CTAs)
  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.dataset.scrollTo;
      scrollToSection(targetId);
    });
  });

  // Attach nav dynamic view triggers (Buy Beats, Sessions, Send Audio, Orders, Cart)
  document.querySelectorAll('[data-view-trigger]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const viewKey = btn.dataset.viewTrigger;
      openView(viewKey);
    });
  });

  // Handle URL hash changes (Back / Forward buttons)
  window.addEventListener('popstate', handleHashRouting);
  window.addEventListener('hashchange', handleHashRouting);

  function handleHashRouting() {
    const rawHash = window.location.hash.replace(/^#/, '').toLowerCase();
    if (!rawHash) {
      if (currentOpenViewId) {
        closeCurrentView(false);
      }
      return;
    }

    // Check if hash is one of our dynamic views
    if (VIEW_CONFIG[rawHash]) {
      openView(rawHash, false);
    } else if (currentOpenViewId) {
      // Hash changed to landing section like #showcase, #services, #contact
      closeCurrentView(false);
    }
  }

  // Direct visit or bookmarked URL detection on page load:
  // Automatically detects hash on load and instantly opens that full-screen view!
  const initialHash = window.location.hash.replace(/^#/, '').toLowerCase();
  if (initialHash && VIEW_CONFIG[initialHash]) {
    openView(initialHash, false);
  }

  return {
    openView,
    closeCurrentView
  };
}

// Auto-run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHiddenPageArchitecture);
} else {
  initHiddenPageArchitecture();
}
