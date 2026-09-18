/**
 * Sanity CMS Client & Fluid Dynamic Engine for Eko Music Portfolio
 * Project ID: m5gxdv12
 * Dataset: production
 */

import { createClient } from '@sanity/client';

export const SANITY_CONFIG = {
  projectId: 'm5gxdv12',
  dataset: 'production',
  apiVersion: '2023-08-01',
  useCdn: false, // Disables CDN edge caching to force direct live fetching from the Sanity database pool
};

// Authenticated Editor Configuration with Update & Write Permissions for Studio/Admin Panel Mutations
export const SANITY_EDITOR_CONFIG = {
  projectId: 'm5gxdv12',
  dataset: 'production',
  apiVersion: '2023-08-01',
  useCdn: false,
  token: 'skenQXm87pA1BHNhZ5WnOuzZzwOfZk7whf40scAhIXBYIDhZl2LOkBiczPKawQSW58VHZ6RI1mgd9ceqEG0orSreONc9tpDsIXopQA2No720ztH8oL4K3Ou37T0QAa5C4Qtgnek2MfLeyus6pSkbRKDyz7GdI2LcP60emeatjIgFArXJaVra'
};

// Initialize Public Read-Only Sanity Client
let clientInstance = null;
export function getSanityClient() {
  if (!clientInstance) {
    // Check if loaded globally via CDN script or ESM
    const factory = (typeof window !== 'undefined' && window.SanityClient?.createClient) || createClient;
    clientInstance = factory(SANITY_CONFIG);
  }
  return clientInstance;
}

// Initialize Authenticated Editor Sanity Client with Update Permissions
let editorClientInstance = null;
export function getSanityEditorClient() {
  if (!editorClientInstance) {
    const factory = (typeof window !== 'undefined' && window.SanityClient?.createClient) || createClient;
    editorClientInstance = factory(SANITY_EDITOR_CONFIG);
  }
  return editorClientInstance;
}

/**
 * Commits visual tuning settings directly to Sanity Content Lake
 * Executes explicit client.createOrReplace() mutations for desktopSettings, mobileSettings, unifiedSettings using Editor Token.
 */
export async function commitSettingsToSanity(settings) {
  const client = getSanityEditorClient();
  if (!client) throw new Error('Sanity editor client is not initialized');

  const desktopPayload = {
    _id: 'desktopSettings',
    _type: 'desktopSettings',
    desktopPageGutter: Number(settings.desktopPageGutter ?? 48),
    desktopSectionPadding: Number(settings.desktopSectionPadding ?? 112),
    desktopCardPadding: Number(settings.desktopCardPadding ?? 34),
    desktopCardGap: Number(settings.desktopCardGap ?? 24),
    desktopButtonPaddingV: Number(settings.desktopButtonPaddingV ?? 14),
    desktopButtonPaddingH: Number(settings.desktopButtonPaddingH ?? 28),
    desktopHeroTitleSize: Number(settings.desktopHeroTitleSize ?? 11.5),
    desktopH2Size: Number(settings.desktopH2Size ?? 9.2),
    desktopBaseFontSize: Number(settings.desktopBaseFontSize ?? 16),
    headingWeight: String(settings.headingWeight ?? '400'),
    enableItalicAccents: Boolean(settings.enableItalicAccents),
    heroEyebrow: settings.heroEyebrow || '',
    heroTitle: settings.heroTitle || '',
    heroLine1: settings.heroLine1 || '',
    heroLine2: settings.heroLine2 || '',
    heroCtaText: settings.heroCtaText || '',
    showcaseTitle: settings.showcaseTitle || '',
    showcaseDescription: settings.showcaseDescription || '',
    processTitle: settings.processTitle || '',
    processTrustline: settings.processTrustline || '',
    processClosingTitle: settings.processClosingTitle || '',
    processClosingCopy: settings.processClosingCopy || '',
    servicesTitle: settings.servicesTitle || '',
    servicesDescription: settings.servicesDescription || '',
    deliveryTitle: settings.deliveryTitle || 'Delivery & Payments',
    deliveryDescription: settings.deliveryDescription || 'A straightforward handoff with the important details clear before work begins.',
    turnaroundBeats: settings.turnaroundBeats || 'Beats — within 24 hours',
    turnaroundMixing: settings.turnaroundMixing || 'Mixing — 24–48 hours',
    turnaroundEdits: settings.turnaroundEdits || 'Edits — same day (in most cases)',
    contactTitle: settings.contactTitle || "Let's Work",
    contactLead: settings.contactLead || 'Available for collaborations & ongoing projects',
    contactDmNote: settings.contactDmNote || 'DM for quick response',
    copyrightText: settings.copyrightText || '© 2026 Eko. All rights reserved.',
  };

  const mobilePayload = {
    _id: 'mobileSettings',
    _type: 'mobileSettings',
    mobilePageGutter: Number(settings.mobilePageGutter ?? 20),
    mobileSectionPadding: Number(settings.mobileSectionPadding ?? 64),
    mobileCardPadding: Number(settings.mobileCardPadding ?? 20),
    mobileCardGap: Number(settings.mobileCardGap ?? 14),
    mobileHeroTitleSize: Number(settings.mobileHeroTitleSize ?? 5.0),
    mobileH2Size: Number(settings.mobileH2Size ?? 4.5),
    mobileBaseFontSize: Number(settings.mobileBaseFontSize ?? 15),
  };

  const unifiedPayload = {
    _id: 'unifiedSettings',
    _type: 'unifiedSettings',
    siteBrand: settings.siteBrand || 'EKO',
    primarySignalColor: settings.primarySignalColor || '#6c63e5',
    signalBrightColor: settings.signalBrightColor || '#007fff',
    darkCanvasColor: settings.darkCanvasColor || '#0b0b0e',
    displayFont: settings.displayFont || 'Dela Gothic One',
    bodyFont: settings.bodyFont || 'DM Sans',
    emailAddress: settings.emailAddress || 'hello@eko.com',
    beatLicensePricing: {
      mp3Price: Number(settings.mp3Price ?? 49),
      wavPrice: Number(settings.wavPrice ?? 99),
      stemsPrice: Number(settings.stemsPrice ?? 199),
      exclusivePrice: Number(settings.exclusivePrice ?? 599),
    },
    servicesPricing: {
      customProductionPrice: Number(settings.customProductionPrice ?? 350),
      mixingMasteringPrice: Number(settings.mixingMasteringPrice ?? 150),
      vocalTuningPrice: Number(settings.vocalTuningPrice ?? 80),
      consultationHourlyRate: Number(settings.consultationHourlyRate ?? 75),
    },
  };

  // Perform concurrent mutations targeting Sanity Content Lake database
  const [desktopDoc, mobileDoc, unifiedDoc] = await Promise.all([
    client.createOrReplace(desktopPayload),
    client.createOrReplace(mobilePayload),
    client.createOrReplace(unifiedPayload),
  ]);

  if (!desktopDoc?._id || !mobileDoc?._id || !unifiedDoc?._id) {
    throw new Error('Sanity API failed to return committed document IDs');
  }

  return {
    success: true,
    documents: {
      desktop: desktopDoc,
      mobile: mobileDoc,
      unified: unifiedDoc,
    },
    committedAt: new Date().toISOString(),
  };
}

/**
 * Patches an individual document property in real-time using Editor Token
 */
export async function patchSanityDocument(documentId, patchFields) {
  const client = getSanityEditorClient();
  if (!client) throw new Error('Sanity editor client is not initialized');
  return await client.patch(documentId).set(patchFields).commit();
}

// Single GROQ Query fetching all Beats, Audio Arsenal, Desktop Settings, Mobile Settings, and Unified Settings in 1 network request
export const SINGLE_SANITY_GROQ = `{
  "beats": *[_type in ["beat", "audioArsenal"] && isArchived != true] | order(trackNumber asc, _updatedAt desc) {
    _id,
    _type,
    title,
    genre,
    bpm,
    key,
    duration,
    description,
    tags,
    prices,
    trackNumber,
    isFeaturedInLandingPlayer,
    assignedSlot,
    isArchived,
    "audioUrl": coalesce(audioFile.asset->url, audioUrl)
  },
  "desktop": *[_type == "desktopSettings"] | order(_updatedAt desc)[0],
  "mobile": *[_type == "mobileSettings"] | order(_updatedAt desc)[0],
  "unified": *[_type == "unifiedSettings"] | order(_updatedAt desc)[0]
}`;

// Default Baseline Typography & Layout values (used as graceful defaults before/until CMS updates)
export const BASELINE_DESIGN = {
  desktop: {
    pageGutter: 48,
    sectionPadding: 112,
    heroTitleSize: 11.5,
    h2Size: 9.2,
    cardPadding: 34,
    cardGap: 24,
    baseFontSize: 16,
    signalColor: '#6c63e5',
    signalBrightColor: '#007fff',
  },
  mobile: {
    pageGutter: 20,
    sectionPadding: 64,
    heroTitleSize: 5.0,
    h2Size: 4.5,
    cardPadding: 20,
    cardGap: 14,
    baseFontSize: 15,
  }
};

let cachedSanityData = null;
let currentIsMobile = false;

/**
 * Applies mathematical fluid CSS Custom Properties (CSS variables) to :root
 * Smoothly interpolates between Mobile and Desktop without hard pixel snapping.
 */
export function applyFluidDesignVariables(desktop = {}, mobile = {}) {
  const root = document.documentElement;

  // Resolve values merged with baseline defaults
  const dGutter = desktop.desktopPageGutter ?? BASELINE_DESIGN.desktop.pageGutter;
  const mGutter = mobile.mobilePageGutter ?? BASELINE_DESIGN.mobile.pageGutter;

  const dPadding = desktop.desktopSectionPadding ?? BASELINE_DESIGN.desktop.sectionPadding;
  const mPadding = mobile.mobileSectionPadding ?? BASELINE_DESIGN.mobile.sectionPadding;

  const dCardPad = desktop.desktopCardPadding ?? BASELINE_DESIGN.desktop.cardPadding;
  const mCardPad = mobile.mobileCardPadding ?? BASELINE_DESIGN.mobile.cardPadding;

  const dCardGap = desktop.desktopCardGap ?? BASELINE_DESIGN.desktop.cardGap;
  const mCardGap = mobile.mobileCardGap ?? BASELINE_DESIGN.mobile.cardGap;

  const dFontSize = desktop.desktopBaseFontSize ?? BASELINE_DESIGN.desktop.baseFontSize;
  const mFontSize = mobile.mobileBaseFontSize ?? BASELINE_DESIGN.mobile.baseFontSize;

  // 1. Store raw values for reference
  root.style.setProperty('--desktop-page-gutter', `${dGutter}px`);
  root.style.setProperty('--mobile-page-gutter', `${mGutter}px`);
  root.style.setProperty('--desktop-section-padding', `${dPadding}px`);
  root.style.setProperty('--mobile-section-padding', `${mPadding}px`);
  root.style.setProperty('--desktop-card-padding', `${dCardPad}px`);
  root.style.setProperty('--mobile-card-padding', `${mCardPad}px`);
  root.style.setProperty('--desktop-card-gap', `${dCardGap}px`);
  root.style.setProperty('--mobile-card-gap', `${mCardGap}px`);

  // 2. Set Mathematical Fluid Variables across 360px -> 1440px viewport range
  // Formula: clamp(min, min + (max - min) * ((100vw - 360px) / (1440 - 360)), max)
  const minVp = 360;
  const maxVp = 1440;
  const vpRange = maxVp - minVp; // 1080

  const fluidFormulaPx = (min, max) =>
    `clamp(${Math.min(min, max)}px, calc(${min}px + (${max - min}) * ((100vw - ${minVp}px) / ${vpRange})), ${Math.max(min, max)}px)`;

  const fluidFormulaRem = (min, max) =>
    `clamp(${Math.min(min, max)}rem, calc(${min}rem + (${max - min}) * ((100vw - ${minVp}px) / ${vpRange})), ${Math.max(min, max)}rem)`;

  root.style.setProperty('--page-gutter', fluidFormulaPx(mGutter, dGutter));
  root.style.setProperty('--section-padding', fluidFormulaPx(mPadding, dPadding));
  root.style.setProperty('--card-padding', fluidFormulaPx(mCardPad, dCardPad));
  root.style.setProperty('--card-gap', fluidFormulaPx(mCardGap, dCardGap));
  root.style.setProperty('--base-font-size', fluidFormulaPx(mFontSize, dFontSize));

  root.style.removeProperty('--desktop-h2-size');
  root.style.removeProperty('--mobile-h2-size');
  root.style.removeProperty('--heading-2-size');

  if (desktop.desktopHeroTitleSize || mobile.mobileHeroTitleSize) {
    const dHeroSize = desktop.desktopHeroTitleSize ?? BASELINE_DESIGN.desktop.heroTitleSize;
    const mHeroSize = mobile.mobileHeroTitleSize ?? BASELINE_DESIGN.mobile.heroTitleSize;
    root.style.setProperty('--desktop-hero-title-size', `${dHeroSize}rem`);
    root.style.setProperty('--mobile-hero-title-size', `${mHeroSize}rem`);
    root.style.setProperty('--hero-title-size', fluidFormulaRem(mHeroSize, dHeroSize));
  } else {
    root.style.removeProperty('--desktop-hero-title-size');
    root.style.removeProperty('--mobile-hero-title-size');
    root.style.removeProperty('--hero-title-size');
  }

  // 3. Apply Brand Colors & Fonts if configured
  if (desktop.primarySignalColor) {
    root.style.setProperty('--signal', desktop.primarySignalColor);
  }
  if (desktop.signalBrightColor) {
    root.style.setProperty('--signal-bright', desktop.signalBrightColor);
  }
  if (desktop.darkCanvasColor) {
    root.style.setProperty('--ink', desktop.darkCanvasColor);
  }
  if (desktop.displayFont) {
    const fontVal = desktop.displayFont === 'Dela Gothic One' ? '"Dela Gothic One", "Dela-Fallback", sans-serif' : desktop.displayFont;
    root.style.setProperty('--font-display', fontVal);
  }
  if (desktop.bodyFont) {
    const fontVal = desktop.bodyFont === 'DM Sans' ? '"DM Sans", "DMSans-Fallback", sans-serif' : desktop.bodyFont;
    root.style.setProperty('--font-body', fontVal);
  }
  if (desktop.headingWeight) {
    root.style.setProperty('--heading-weight', desktop.headingWeight);
  }
  if (desktop.desktopButtonPaddingV != null) {
    root.style.setProperty('--button-padding-v', `${desktop.desktopButtonPaddingV}px`);
  }
  if (desktop.desktopButtonPaddingH != null) {
    root.style.setProperty('--button-padding-h', `${desktop.desktopButtonPaddingH}px`);
  }
}

/**
 * Maps all Sanity text content into existing DOM elements
 * Dynamically switches between Desktop and Mobile-specific overrides using fluid responsive hooks
 */
export function applyPageContent(desktop = {}, mobile = {}) {
  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  currentIsMobile = isMobile;

  // Site Brand
  if (desktop.siteBrand) {
    document.querySelectorAll('.brand').forEach(el => {
      el.textContent = desktop.siteBrand;
    });
  }

  // Hero Section
  const heroEyebrow = document.querySelector('.hero-eyebrow');
  if (heroEyebrow && desktop.heroEyebrow) {
    heroEyebrow.textContent = desktop.heroEyebrow;
  }

  const heroTitle = document.querySelector('#hero-title');
  if (heroTitle) {
    if (isMobile && mobile.useMobileShortHero && mobile.mobileShortHeroTitle) {
      heroTitle.textContent = mobile.mobileShortHeroTitle;
    } else if (desktop.heroTitle) {
      heroTitle.textContent = desktop.heroTitle;
    }
  }

  const heroLine1 = document.querySelector('.hero-copy-line1');
  const heroLine2 = document.querySelector('.hero-copy-line2');
  if (isMobile && mobile.useMobileShortHero && mobile.mobileShortHeroSub) {
    if (heroLine1) heroLine1.textContent = mobile.mobileShortHeroSub;
    if (heroLine2) heroLine2.textContent = '';
  } else {
    if (heroLine1 && desktop.heroLine1) heroLine1.textContent = desktop.heroLine1;
    if (heroLine2 && desktop.heroLine2) heroLine2.textContent = desktop.heroLine2;
  }

  const heroCta = document.querySelector('.hero-cta');
  if (heroCta && desktop.heroCtaText) {
    heroCta.innerHTML = `${desktop.heroCtaText} <span aria-hidden="true">›</span>`;
  }

  // Showcase Section
  const beatsTitle = document.querySelector('#beats-title');
  if (beatsTitle && desktop.showcaseTitle) {
    beatsTitle.innerHTML = desktop.showcaseTitle.includes(' ')
      ? desktop.showcaseTitle.replace(/(\w+)$/, '<em>$1</em>')
      : desktop.showcaseTitle;
  }

  const showcaseDesc = document.querySelector('#showcase .section-heading > p');
  if (showcaseDesc) {
    if (isMobile && mobile.useMobileShortShowcase && mobile.mobileShortShowcaseDescription) {
      showcaseDesc.textContent = mobile.mobileShortShowcaseDescription;
    } else if (desktop.showcaseDescription) {
      showcaseDesc.textContent = desktop.showcaseDescription;
    }
  }

  // Process Section
  const processTitle = document.querySelector('#process-title');
  if (processTitle && desktop.processTitle) {
    processTitle.innerHTML = desktop.processTitle.includes(' ')
      ? desktop.processTitle.replace(/(\w+)$/, '<em>$1</em>')
      : desktop.processTitle;
  }

  const processTrust = document.querySelector('.process-trust-line');
  if (processTrust && desktop.processTrustline) {
    processTrust.textContent = desktop.processTrustline;
  }

  const processClosingTitle = document.querySelector('.process-closing h3');
  if (processClosingTitle && desktop.processClosingTitle) {
    processClosingTitle.textContent = desktop.processClosingTitle;
  }

  const processClosingCopy = document.querySelector('.process-closing p');
  if (processClosingCopy && desktop.processClosingCopy) {
    processClosingCopy.textContent = desktop.processClosingCopy;
  }

  // Services Section
  const servicesTitle = document.querySelector('#services-title');
  if (servicesTitle && desktop.servicesTitle) {
    servicesTitle.innerHTML = desktop.servicesTitle.includes(' ')
      ? desktop.servicesTitle.replace(/\s(\w+)$/, '<br><em>$1</em>')
      : desktop.servicesTitle;
  }

  const servicesDesc = document.querySelector('#services .section-heading > p');
  if (servicesDesc && desktop.servicesDescription) {
    servicesDesc.textContent = desktop.servicesDescription;
  }

  // Dynamic Service Cards Pricing
  const servicesPricing = desktop.servicesPricing || {};
  const beatLicensePricing = desktop.beatLicensePricing || {};

  if (servicesPricing.customProductionPrice) {
    const chip = document.querySelector('#service-card-01 .card-price-chip');
    if (chip) chip.textContent = `From $${servicesPricing.customProductionPrice}`;
  }
  if (servicesPricing.mixingMasteringPrice) {
    const chip = document.querySelector('#service-card-02 .card-price-chip');
    if (chip) chip.textContent = `From $${servicesPricing.mixingMasteringPrice}`;
  }
  if (servicesPricing.vocalTuningPrice) {
    const chip = document.querySelector('#service-card-03 .card-price-chip');
    if (chip) chip.textContent = `From $${servicesPricing.vocalTuningPrice}`;
  }
  if (beatLicensePricing.mp3Price) {
    const chip = document.querySelector('#service-card-04 .card-price-chip');
    if (chip) chip.textContent = `From $${beatLicensePricing.mp3Price}`;
  }
  if (servicesPricing.consultationHourlyRate) {
    const chip = document.querySelector('#service-card-05 .card-price-chip');
    if (chip) chip.textContent = `From $${servicesPricing.consultationHourlyRate} / hr`;
  }

  // Delivery Section
  const deliveryTitle = document.querySelector('#delivery-title');
  if (deliveryTitle && desktop.deliveryTitle) {
    deliveryTitle.innerHTML = desktop.deliveryTitle.includes(' ')
      ? desktop.deliveryTitle.replace(/\s(\w+)$/, ' <em>&amp;</em><br>$1')
      : desktop.deliveryTitle;
  }

  const deliveryDesc = document.querySelector('#delivery .section-heading > p');
  if (deliveryDesc && desktop.deliveryDescription) {
    deliveryDesc.textContent = desktop.deliveryDescription;
  }

  // Delivery Turnarounds
  const methodItems = document.querySelectorAll('.payment-method');
  if (methodItems.length >= 3) {
    if (desktop.turnaroundBeats) methodItems[0].textContent = desktop.turnaroundBeats;
    if (desktop.turnaroundMixing) methodItems[1].textContent = desktop.turnaroundMixing;
    if (desktop.turnaroundEdits) methodItems[2].textContent = desktop.turnaroundEdits;
  }

  // Contact Section
  const contactTitle = document.querySelector('#contact-title');
  if (contactTitle && desktop.contactTitle) {
    contactTitle.innerHTML = desktop.contactTitle.includes(' ')
      ? desktop.contactTitle.replace(/(\w+)$/, '<em>$1</em>')
      : desktop.contactTitle;
  }

  const contactLead = document.querySelector('.contact-intro-lead');
  if (contactLead) {
    if (isMobile && mobile.useMobileShortContact && mobile.mobileShortContactLead) {
      contactLead.textContent = mobile.mobileShortContactLead;
    } else if (desktop.contactLead) {
      contactLead.textContent = desktop.contactLead;
    }
  }

  const contactDm = document.querySelector('.contact-intro-dm');
  if (contactDm && desktop.contactDmNote) {
    contactDm.textContent = desktop.contactDmNote;
  }

  const copyrightEl = document.querySelector('.contact-copyright');
  if (copyrightEl && desktop.copyrightText) {
    copyrightEl.innerHTML = desktop.copyrightText;
  }

  // Social Links
  const instagramLink = document.querySelector('#social-link-instagram') || document.querySelector('a[aria-label*="Instagram"]');
  if (instagramLink && desktop.instagramUrl) {
    instagramLink.href = desktop.instagramUrl;
    instagramLink.target = '_blank';
    instagramLink.rel = 'noopener noreferrer';
  }

  const emailLink = document.querySelector('#social-link-email') || document.querySelector('a[aria-label*="Email"]');
  if (emailLink && desktop.emailAddress) {
    emailLink.href = desktop.emailAddress.startsWith('mailto:') ? desktop.emailAddress : `mailto:${desktop.emailAddress}`;
  }

  const signalLink = document.querySelector('#social-link-signal') || document.querySelector('a[aria-label*="Signal"]');
  if (signalLink && desktop.signalUrl) {
    signalLink.href = desktop.signalUrl;
    signalLink.target = '_blank';
    signalLink.rel = 'noopener noreferrer';
  }
}

/**
 * Dynamically renders Beats Showcase into the landing page player and store state
 */
export function applyBeatsShowcase(beats = []) {
  if (!Array.isArray(beats) || beats.length === 0) return;

  // Filter beats with audio and map to store shape
  const validBeats = beats.filter(b => b.title && (b.audioUrl || b.src));
  if (validBeats.length === 0) return;

  const mappedBeats = validBeats.map((b, idx) => ({
    id: b._id || `sanity-beat-${idx + 1}`,
    title: b.title,
    genre: b.genre || 'Original production',
    bpm: b.bpm || 120,
    key: b.key || 'C Maj',
    duration: b.duration || '0:45',
    src: b.audioUrl || b.src,
    tags: Array.isArray(b.tags) && b.tags.length ? b.tags : ['Original', 'Mastered'],
    description: b.description || 'Crafted in studio with analog processing and release-ready mastering.',
    prices: {
      mp3: b.prices?.mp3 ?? 49,
      wav: b.prices?.wav ?? 99,
      stems: b.prices?.stems ?? 199,
      exclusive: b.prices?.exclusive ?? 599,
    },
    isFeatured: b.isFeaturedInLandingPlayer !== false,
  }));

  // Store globally so the Buy Beats view immediately consumes it
  window.__SANITY_BEATS__ = mappedBeats;

  // Update landing page playlist
  const playlist = document.querySelector('#playlist');
  if (playlist) {
    const featuredTracks = mappedBeats.filter(b => b.isFeatured);
    const tracksToDisplay = featuredTracks.length > 0 ? featuredTracks : mappedBeats;

    playlist.innerHTML = '';
    tracksToDisplay.forEach((track, idx) => {
      const btn = document.createElement('button');
      btn.className = `track ${idx === 0 ? 'active' : ''}`;
      btn.type = 'button';
      btn.dataset.src = track.src;
      btn.dataset.title = track.title;
      btn.dataset.style = track.genre;
      btn.setAttribute('aria-label', `Play ${track.title}`);

      const num = String(idx + 1).padStart(2, '0');
      btn.innerHTML = `
        <span class="track-number">${num}</span>
        <span class="track-name">${track.title}<small>${track.genre}</small></span>
        <span class="track-tap-prompt" aria-hidden="true">
          <span class="tap-gesture-box">
            <svg class="tap-hand-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 13v-7.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 11a1.5 1.5 0 0 1 3 0v1.5"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.66-4L5 13.5a1.5 1.5 0 0 1 2.5-1.5L8 13"/>
            </svg>
            <span class="tap-ripple-effect"></span>
          </span>
          <span class="tap-action-wrap">
            <span class="tap-action-state action-play">Play</span>
            <span class="tap-action-state action-pause">Pause</span>
          </span>
        </span>
        <span class="track-length">${track.duration}</span>
      `;
      playlist.appendChild(btn);
    });

    // Update active player labels with the first track
    const firstTrack = tracksToDisplay[0];
    const currentTitle = document.querySelector('#current-title');
    const currentStyle = document.querySelector('#current-style');
    const durationEl = document.querySelector('#duration');
    const audioEl = document.querySelector('#audio');

    if (currentTitle) currentTitle.textContent = firstTrack.title;
    if (currentStyle) currentStyle.textContent = firstTrack.genre;
    if (durationEl) durationEl.textContent = firstTrack.duration;
    if (audioEl && !audioEl.src.includes(firstTrack.src)) {
      audioEl.src = firstTrack.src;
    }

    // Re-bind interactive player events
    if (typeof window.rebindLandingTracks === 'function') {
      window.rebindLandingTracks();
    }
  }

  // Dispatch custom event for dynamic views (like Buy Beats)
  window.dispatchEvent(new CustomEvent('sanity:beats-updated', { detail: { beats: mappedBeats } }));
}

/**
 * Executes the single GROQ query upon page load and updates the entire application
 */
export async function fetchAndApplySanity() {
  try {
    const client = getSanityClient();
    // Force direct uncached query to bypass any edge CDN or browser caching
    const data = await client.fetch(SINGLE_SANITY_GROQ, {}, { cache: 'no-store' });

    cachedSanityData = data;
    window.__SANITY_DATA__ = data;

    const { desktop = {}, mobile = {}, unified = {}, beats = [] } = data || {};

    // Merge unified settings (brand, primary signal color, fonts, pricing, etc.) into desktop & mobile
    const mergedDesktop = { ...unified, ...desktop };
    const mergedMobile = { ...unified, ...mobile };

    const applyDataToDOM = () => {
      // 1. Fluid CSS Variables
      applyFluidDesignVariables(mergedDesktop, mergedMobile);

      // 2. DOM Page Content
      applyPageContent(mergedDesktop, mergedMobile);

      // 3. Beats Showcase
      if (beats && beats.length > 0) {
        applyBeatsShowcase(beats);
      }

      // 4. Dispatch ready event
      window.dispatchEvent(new CustomEvent('sanity:data-ready', { detail: data }));
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyDataToDOM, { once: true });
    }
    // Also apply immediately to whatever DOM nodes currently exist
    applyDataToDOM();

    return data;
  } catch (err) {
    console.warn('Sanity fetch notice (using offline baseline defaults):', err.message || err);
    // Apply baseline fluid styles even if remote dataset is empty
    applyFluidDesignVariables({}, {});
    return null;
  }
}

// Fluid resize observer & matchMedia listener for real-time mobile/desktop content switching
export function initFluidResponsiveEngine() {
  const mediaQuery = window.matchMedia('(max-width: 640px)');

  const handleViewportChange = () => {
    if (cachedSanityData) {
      applyPageContent(cachedSanityData.desktop || {}, cachedSanityData.mobile || {});
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleViewportChange);
  } else {
    mediaQuery.addListener(handleViewportChange);
  }

  // Also smoothly update CSS custom properties on window resize with rAF throttle
  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      if (cachedSanityData) {
        applyFluidDesignVariables(cachedSanityData.desktop || {}, cachedSanityData.mobile || {});
      }
    });
  }, { passive: true });
}

let liveSubscription = null;
let listenerRetryCount = 0;

/**
 * Attaches the Sanity real-time listener (SSE mutation stream)
 * Ensures instant update propagation when any document is saved or published in Sanity Studio.
 */
export function setupSanityLiveListener() {
  try {
    const client = getSanityClient();
    if (!client || typeof client.listen !== 'function') return;

    if (liveSubscription) {
      if (typeof liveSubscription.unsubscribe === 'function') {
        try { liveSubscription.unsubscribe(); } catch {}
      }
      liveSubscription = null;
    }

    const query = `*[_type in ["beat", "audioArsenal", "desktopSettings", "mobileSettings", "unifiedSettings"]]`;
    liveSubscription = client.listen(query, {}, {
      includeResult: false,
      visibility: 'query',
      events: ['mutation', 'welcome', 'reconnect']
    }).subscribe({
      next: (update) => {
        listenerRetryCount = 0;
        if (update.type === 'mutation' || update.transition) {
          fetchAndApplySanity();
        }
      },
      error: (err) => {
        if (listenerRetryCount < 2) {
          listenerRetryCount++;
          setTimeout(() => setupSanityLiveListener(), 10000);
        } else {
          // If SSE is unavailable or restricted, gracefully rely on postMessage and initial GROQ
          if (liveSubscription) {
            try { liveSubscription.unsubscribe(); } catch {}
            liveSubscription = null;
          }
        }
      }
    });
  } catch (err) {
    // Gracefully ignore if EventSource is not supported
  }
}

// Auto-run on initialization
if (typeof window !== 'undefined') {
  initFluidResponsiveEngine();
  
  // Listen for explicit save confirmation messages from Sanity Studio iframe/parent
  window.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'SANITY_SAVED' || event.data.type === 'SANITY_DOCUMENT_MUTATION')) {
      fetchAndApplySanity();
    }
  });

  // Attach live listener & fetch initial state on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fetchAndApplySanity();
      setupSanityLiveListener();
    });
  } else {
    fetchAndApplySanity();
    setupSanityLiveListener();
  }
}
