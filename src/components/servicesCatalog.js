/**
 * servicesCatalog.js
 * MotionSites AI "Projects Catalog" component interactions
 * - Scroll-driven sticky card stacking animation with scale-down depth effect
 * - In-card audio preview players with animated waveforms
 * - Quick category filter pills
 * - Action triggers linking directly to booking, stem upload, beat store, and contact pre-fill
 */

import { fastSmoothScrollTo } from '../utils/scroll.js';
import { pauseMainLandingAudio } from '../main.js';
import { getMediaUrl } from '../utils/media.js';

let catalogAudioInstance = null;
let currentPlayingButton = null;

export function initServicesCatalog() {
  const section = document.querySelector('#services');
  if (!section) return;

  initCardStacking(section);
  initCatalogAudio(section);
  initCatalogFilterPills(section);
  initCatalogActions(section);
}

/**
 * Scroll-driven card stacking & scale transform effect
 * MotionSites behavior: cards stack stickily, earlier cards scale down slightly
 */
function initCardStacking(section) {
  const stack = section.querySelector('.services-catalog-stack');
  const wrappers = section.querySelectorAll('.services-card-wrapper');
  if (!stack || wrappers.length === 0) return;

  function calculateCardTops() {
    const vh = window.innerHeight;
    const isMobile = window.innerWidth <= 768;
    const navH = isMobile ? 64 : 84; // Space below the top navigation bar

    wrappers.forEach((wrap, i) => {
      wrap.style.setProperty('--card-index', i);
      wrap.style.zIndex = `${i + 1}`;
      const card = wrap.querySelector('.services-catalog-card');
      const cardH = card ? card.offsetHeight : 580;

      // Position cards with comfortable breathing room below top navbar
      const availableSpace = vh - navH - cardH;
      const idealTop = availableSpace > 0 
        ? Math.round(navH + (availableSpace / 2)) 
        : navH + 12;

      // Ensure all cards dock at the exact identical top position so they sit perfectly on top of each other
      const minTop = navH + 10;
      const maxTop = Math.max(minTop, vh - cardH - 16);
      const targetTop = Math.min(Math.max(minTop, idealTop), maxTop);
      wrap.style.top = `${Math.round(targetTop)}px`;
    });
  }

  calculateCardTops();

  let ticking = false;

  function updateCardTransforms() {
    wrappers.forEach((wrap, i) => {
      const card = wrap.querySelector('.services-catalog-card');
      if (!card) return;

      // Check if current card is being covered by the next card (i + 1) to apply tactile depth scaling
      const nextWrap = wrappers[i + 1];
      if (nextWrap) {
        const nextRect = nextWrap.getBoundingClientRect();
        const currentCardRect = card.getBoundingClientRect();
        const nextStickyTop = parseFloat(nextWrap.style.top) || 24;

        if (nextRect.top < currentCardRect.bottom && nextRect.top > nextStickyTop + 1) {
          // In-flight transition: next card is actively moving over this card
          card.style.visibility = 'visible';
          card.style.opacity = '1';
          card.style.pointerEvents = 'none';

          const overlapDistance = currentCardRect.bottom - nextRect.top;
          const totalTravel = Math.max(currentCardRect.height, 1);
          const stackProgress = Math.min(Math.max(overlapDistance / totalTravel, 0), 1);
          const scale = 1 - stackProgress * 0.035;
          const brightness = 1 - stackProgress * 0.12;
          card.style.transform = `scale(${scale.toFixed(4)})`;
          card.style.filter = `brightness(${brightness.toFixed(3)})`;
        } else if (nextRect.top <= nextStickyTop + 1) {
          // Fully covered: hide underlying card so it never peeks through or creates background artifacts
          card.style.visibility = 'hidden';
          card.style.opacity = '0';
          card.style.pointerEvents = 'none';
          card.style.transform = 'scale(0.965)';
          card.style.filter = 'brightness(0.88)';
        } else {
          // Fully uncovered and active
          card.style.visibility = 'visible';
          card.style.opacity = '1';
          card.style.pointerEvents = 'auto';
          card.style.transform = 'scale(1)';
          card.style.filter = 'brightness(1)';
        }
      } else {
        // Top-most card (e.g. Card 06): always fully active and visible
        card.style.visibility = 'visible';
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
        card.style.transform = 'scale(1)';
        card.style.filter = 'brightness(1)';
      }
    });

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateCardTransforms);
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    calculateCardTops();
    if (!ticking) {
      requestAnimationFrame(updateCardTransforms);
      ticking = true;
    }
  }, { passive: true });

  // Initial calculation and observer after layout render
  setTimeout(() => {
    calculateCardTops();
    requestAnimationFrame(updateCardTransforms);
  }, 100);

  window.addEventListener('load', () => {
    calculateCardTops();
    requestAnimationFrame(updateCardTransforms);
  });

  if (window.ResizeObserver && stack) {
    const ro = new ResizeObserver(() => {
      calculateCardTops();
      if (!ticking) {
        requestAnimationFrame(updateCardTransforms);
        ticking = true;
      }
    });
    ro.observe(stack);
  }
}

/**
 * Dedicated in-card audio sample previews with animated waveforms
 */
function initCatalogAudio(section) {
  const playButtons = section.querySelectorAll('.catalog-play-btn');
  if (playButtons.length === 0) return;

  if (!catalogAudioInstance) {
    catalogAudioInstance = new Audio();
    catalogAudioInstance.crossOrigin = 'anonymous';
    catalogAudioInstance.preload = 'none';

    catalogAudioInstance.addEventListener('ended', () => {
      stopCurrentAudio();
    });

    catalogAudioInstance.addEventListener('error', () => {
      stopCurrentAudio();
    });
  }

  function stopCurrentAudio() {
    if (currentPlayingButton) {
      currentPlayingButton.classList.remove('is-playing');
      const track = currentPlayingButton.closest('.catalog-audio-track');
      if (track) track.classList.remove('is-playing');
      const card = currentPlayingButton.closest('.services-catalog-card');
      if (card) card.classList.remove('is-playing');
      currentPlayingButton = null;
    }
    if (catalogAudioInstance) {
      catalogAudioInstance.pause();
    }
  }

  playButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const audioSrc = btn.getAttribute('data-audio');
      if (!audioSrc) return;

      const isSameButton = currentPlayingButton === btn;

      if (isSameButton && !catalogAudioInstance.paused) {
        // Pause current
        stopCurrentAudio();
      } else {
        // Stop any currently playing audio on landing page & catalog
        pauseMainLandingAudio();
        stopCurrentAudio();

        catalogAudioInstance.src = getMediaUrl(audioSrc);
        catalogAudioInstance.play().then(() => {
          btn.classList.add('is-playing');
          const track = btn.closest('.catalog-audio-track');
          if (track) track.classList.add('is-playing');
          const card = btn.closest('.services-catalog-card');
          if (card) card.classList.add('is-playing');
          currentPlayingButton = btn;
        }).catch(err => {
          console.warn('Catalog audio preview error:', err);
          stopCurrentAudio();
        });
      }
    });
  });

  // Listen to external pause requests
  window.addEventListener('pauseCatalogAudio', () => {
    stopCurrentAudio();
  });
}

/**
 * Filter pills at the top of the Projects Catalog section
 */
function initCatalogFilterPills(section) {
  const pills = section.querySelectorAll('.services-filter-pill');
  if (pills.length === 0) return;

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.getAttribute('data-filter');
      if (filter === 'all') {
        const firstCard = section.querySelector('.services-card-wrapper');
        if (firstCard) {
          firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        const targetCard = section.querySelector(`.services-card-wrapper[data-category="${filter}"]`);
        if (targetCard) {
          const rect = targetCard.getBoundingClientRect();
          const scrollTop = window.scrollY || window.pageYOffset;
          const targetY = scrollTop + rect.top - 100;
          window.scrollTo({ top: targetY, behavior: 'smooth' });

          // Flash highlight
          const cardInner = targetCard.querySelector('.services-catalog-card');
          if (cardInner) {
            cardInner.style.borderColor = '#ffffff';
            cardInner.style.outline = '2px solid rgba(255,255,255,0.7)';
            setTimeout(() => {
              cardInner.style.borderColor = '';
              cardInner.style.outline = '';
            }, 1200);
          }
        }
      }
    });
  });
}

/**
 * Card action buttons:
 * - Direct contact form prefill & smooth scroll
 * - Dynamic view triggers
 */
function initCatalogActions(section) {
  // Service request buttons with data-service
  const requestButtons = section.querySelectorAll('[data-action="request"]');
  requestButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const serviceName = btn.getAttribute('data-service');
      if (!serviceName) return;

      // Select in native & custom dropdown if present
      const customSelect = document.querySelector('#custom-service-select');
      const customSelectLabel = document.querySelector('#custom-service-label');
      const nativeSelect = document.querySelector('#native-service-select');

      if (nativeSelect) {
        nativeSelect.value = serviceName;
      }
      if (customSelectLabel) {
        customSelectLabel.textContent = serviceName;
        customSelectLabel.classList.remove('is-placeholder');
      }
      if (customSelect) {
        customSelect.querySelectorAll('.custom-select-option').forEach(opt => {
          opt.classList.toggle('is-selected', opt.getAttribute('data-value') === serviceName);
        });
      }

      // Smooth scroll to contact form
      fastSmoothScrollTo('contact');
    });
  });
}
