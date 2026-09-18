import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useClient } from 'sanity';
import { ImagesPanel } from './ImagesPanel.jsx';
import { AudioPanel } from './AudioPanel.jsx';
import { getSanityClient, getSanityEditorClient, commitSettingsToSanity, patchSanityDocument } from '../../src/sanity/client.js';

// Default configuration settings definitions
const DEFAULT_VALUES = {
  // Page Content: Hero
  heroEyebrow: 'Producer · Engineer · Sound Designer',
  heroTitle: 'Music Producer',
  heroLine1: 'Beats, Mixing & Vocal Production',
  heroLine2: 'Focused on clean, impactful sound with fast delivery',
  heroCtaText: 'Listen to Tracks',

  // Page Content: Showcase
  showcaseTitle: 'The Work',
  showcaseDescription: 'Explore a curated selection of original productions. Headphones recommended.',

  // Page Content: Process
  processTitle: 'The Process',
  processTrustline: '100% Original · No AI Used',
  processClosingTitle: '100% Original Build For You. Each Time.',
  processClosingCopy: 'No templates. No shortcuts. Just honest music, crafted to tell your story.',

  // Page Content: Services & Pricing
  servicesTitle: 'Studio Services',
  servicesDescription: 'Professional sound, straightforward pricing, and a process built around your vision.',
  customProductionPrice: 350,
  mixingMasteringPrice: 150,
  vocalTuningPrice: 80,
  mp3Price: 49,
  wavPrice: 99,
  stemsPrice: 199,
  exclusivePrice: 599,

  // Layout & Spacing
  desktopPageGutter: 48,
  desktopSectionPadding: 112,
  desktopCardPadding: 34,
  desktopCardGap: 24,
  desktopButtonPaddingV: 14,
  desktopButtonPaddingH: 28,
  mobilePageGutter: 20,
  mobileSectionPadding: 64,
  mobileCardPadding: 20,
  mobileCardGap: 14,

  // Typography
  displayFont: 'Dela Gothic One',
  bodyFont: 'DM Sans',
  desktopHeroTitleSize: 11.5,
  desktopH2Size: 9.2,
  desktopBaseFontSize: 16,
  mobileHeroTitleSize: 5.0,
  mobileH2Size: 4.5,
  mobileBaseFontSize: 15,
  headingWeight: '400',
  enableItalicAccents: false,

  // Branding & Theme Colors
  siteBrand: 'EKO',
  primarySignalColor: '#6c63e5',
  signalBrightColor: '#007fff',
  darkCanvasColor: '#0b0b0e',

  // Contact & Footer
  contactTitle: "Let's Work",
  contactLead: 'Available for collaborations & ongoing projects',
  contactDmNote: 'DM for quick response',
  emailAddress: 'hello@eko.com',
  copyrightText: '© 2026 Eko. All rights reserved.',
};

// Helper: Convert CSS rgb(...) or rgba(...) strings to clean #RRGGBB Hex
function rgbToHex(rgbStr) {
  if (!rgbStr || rgbStr === 'transparent' || rgbStr === 'rgba(0, 0, 0, 0)') return '';
  if (rgbStr.startsWith('#')) return rgbStr;
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return '';
  const r = parseInt(match[0], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[2], 10).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// Figma-style vector SVG icons
const Icons = {
  Pencil: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Desktop: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  Mobile: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  Globe: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Layout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  Reset: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  Settings: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Inspector: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Audio: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  Save: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Layers: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Type: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  Palette: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="7" r="1.5" />
      <circle cx="7.5" cy="11.5" r="1.5" />
      <circle cx="16.5" cy="11.5" r="1.5" />
      <circle cx="12" cy="16.5" r="1.5" />
    </svg>
  ),
  AlignLeft: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="15" y1="12" x2="3" y2="12" />
      <line x1="19" y1="18" x2="3" y2="18" />
    </svg>
  ),
  AlignCenter: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="17" y1="12" x2="7" y2="12" />
      <line x1="19" y1="18" x2="5" y2="18" />
    </svg>
  ),
  AlignRight: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="12" x2="9" y2="12" />
      <line x1="21" y1="18" x2="5" y2="18" />
    </svg>
  ),
  AlignJustify: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="12" x2="3" y2="12" />
      <line x1="21" y1="18" x2="3" y2="18" />
    </svg>
  ),
  Sparkles: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  ),
  Copy: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  Image: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  Disc: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Close: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

const DEFAULT_SITE_IMAGES = [
  {
    id: 'card-01-photo-1',
    title: 'Card 01 - Digital MIDI Pattern Sequencer',
    section: 'Services: Custom Beat & Instrumental',
    category: 'services',
    selector: '#service-card-01 .catalog-stacked-col .catalog-tile:nth-child(1) img',
    src: '/assets/images/midi_beat_arranger_1789337019783.jpg',
    originalSrc: '/assets/images/midi_beat_arranger_1789337019783.jpg',
    alt: 'Digital MIDI Pattern Sequencer',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-01-photo-2',
    title: 'Card 01 - Digital Sound Design & Reverb',
    section: 'Services: Custom Beat & Instrumental',
    category: 'services',
    selector: '#service-card-01 .catalog-stacked-col .catalog-tile:nth-child(2) img',
    src: '/assets/images/digital_reverb_dsp_1789337033441.jpg',
    originalSrc: '/assets/images/digital_reverb_dsp_1789337033441.jpg',
    alt: 'Digital Sound Design & Reverb',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-01-hero',
    title: 'Card 01 - Curved DAW Multitrack Arrangement',
    section: 'Services: Custom Beat & Instrumental',
    category: 'services',
    selector: '#service-card-01 .catalog-hero-img-wrap img',
    src: '/assets/images/curved_daw_monitor_1789336964825.jpg',
    originalSrc: '/assets/images/curved_daw_monitor_1789336964825.jpg',
    alt: 'Curved DAW Multitrack Arrangement',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-02-photo-1',
    title: 'Card 02 - Digital EQ & Multiband Compressor',
    section: 'Services: Mixing & Mastering',
    category: 'services',
    selector: '#service-card-02 .catalog-stacked-col .catalog-tile:nth-child(1) img',
    src: '/assets/images/digital_eq_compressor_1789337007076.jpg',
    originalSrc: '/assets/images/digital_eq_compressor_1789337007076.jpg',
    alt: 'Digital EQ & Multiband Compressor',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-02-photo-2',
    title: 'Card 02 - Master Spectrum Frequency Analyzer',
    section: 'Services: Mixing & Mastering',
    category: 'services',
    selector: '#service-card-02 .catalog-stacked-col .catalog-tile:nth-child(2) img',
    src: '/assets/images/spectral_cleanup_dsp_1789336993282.jpg',
    originalSrc: '/assets/images/spectral_cleanup_dsp_1789336993282.jpg',
    alt: 'Master Spectrum Frequency Analyzer',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-02-hero',
    title: 'Card 02 - Curved Display Digital Mixing Station',
    section: 'Services: Mixing & Mastering',
    category: 'services',
    selector: '#service-card-02 .catalog-hero-img-wrap img',
    src: '/assets/images/curved_daw_monitor_1789336964825.jpg',
    originalSrc: '/assets/images/curved_daw_monitor_1789336964825.jpg',
    alt: 'Curved Display Digital Mixing Station',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-03-photo-1',
    title: 'Card 03 - Vocal Pitch & Formant Tuning DSP',
    section: 'Services: Vocal Mixing & Tuning',
    category: 'services',
    selector: '#service-card-03 .catalog-stacked-col .catalog-tile:nth-child(1) img',
    src: '/assets/images/vocal_tuning_plugin_1789336979208.jpg',
    originalSrc: '/assets/images/vocal_tuning_plugin_1789336979208.jpg',
    alt: 'Vocal Pitch & Formant Tuning DSP',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-03-photo-2',
    title: 'Card 03 - Vocal Plate Reverb & Spatial Width',
    section: 'Services: Vocal Mixing & Tuning',
    category: 'services',
    selector: '#service-card-03 .catalog-stacked-col .catalog-tile:nth-child(2) img',
    src: '/assets/images/digital_reverb_dsp_1789337033441.jpg',
    originalSrc: '/assets/images/digital_reverb_dsp_1789337033441.jpg',
    alt: 'Vocal Plate Reverb & Spatial Width',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-03-hero',
    title: 'Card 03 - Digital Vocal Alignment & Processing Suite',
    section: 'Services: Vocal Mixing & Tuning',
    category: 'services',
    selector: '#service-card-03 .catalog-hero-img-wrap img',
    src: '/assets/images/vocal_tuning_plugin_1789336979208.jpg',
    originalSrc: '/assets/images/vocal_tuning_plugin_1789336979208.jpg',
    alt: 'Digital Vocal Alignment & Processing Suite',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-04-photo-1',
    title: 'Card 04 - Commercial Beat Production',
    section: 'Services: Beat Store & Leasing',
    category: 'services',
    selector: '#service-card-04 .catalog-stacked-col .catalog-tile:nth-child(1) img',
    src: '/assets/images/midi_beat_arranger_1789337019783.jpg',
    originalSrc: '/assets/images/midi_beat_arranger_1789337019783.jpg',
    alt: 'Commercial Beat Production',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-04-photo-2',
    title: 'Card 04 - Mastered High Quality Beat Files',
    section: 'Services: Beat Store & Leasing',
    category: 'services',
    selector: '#service-card-04 .catalog-stacked-col .catalog-tile:nth-child(2) img',
    src: '/assets/images/digital_eq_compressor_1789337007076.jpg',
    originalSrc: '/assets/images/digital_eq_compressor_1789337007076.jpg',
    alt: 'Mastered High Quality Beat Files',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-04-hero',
    title: 'Card 04 - Instant Untagged Beat Download Library',
    section: 'Services: Beat Store & Leasing',
    category: 'services',
    selector: '#service-card-04 .catalog-hero-img-wrap img',
    src: '/assets/images/curved_daw_monitor_1789336964825.jpg',
    originalSrc: '/assets/images/curved_daw_monitor_1789336964825.jpg',
    alt: 'Instant Untagged Beat Download Library',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-05-photo-1',
    title: 'Card 05 - Online DAW Project Coaching',
    section: 'Services: 1-on-1 Production Lessons',
    category: 'services',
    selector: '#service-card-05 .catalog-stacked-col .catalog-tile:nth-child(1) img',
    src: '/assets/images/curved_daw_monitor_1789336964825.jpg',
    originalSrc: '/assets/images/curved_daw_monitor_1789336964825.jpg',
    alt: 'Online DAW Project Coaching',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-05-photo-2',
    title: 'Card 05 - Plugin Technique & Compression Analysis',
    section: 'Services: 1-on-1 Production Lessons',
    category: 'services',
    selector: '#service-card-05 .catalog-stacked-col .catalog-tile:nth-child(2) img',
    src: '/assets/images/digital_eq_compressor_1789337007076.jpg',
    originalSrc: '/assets/images/digital_eq_compressor_1789337007076.jpg',
    alt: 'Plugin Technique & Compression Analysis',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-05-hero',
    title: 'Card 05 - Arrangement & Beatmaking Breakdown',
    section: 'Services: 1-on-1 Production Lessons',
    category: 'services',
    selector: '#service-card-05 .catalog-hero-img-wrap img',
    src: '/assets/images/midi_beat_arranger_1789337019783.jpg',
    originalSrc: '/assets/images/midi_beat_arranger_1789337019783.jpg',
    alt: 'Arrangement & Beatmaking Breakdown',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-06-photo-1',
    title: 'Card 06 - Spectral Noise Removal & Cleanup',
    section: 'Services: Audio Editing & Cleanup',
    category: 'services',
    selector: '#service-card-06 .catalog-stacked-col .catalog-tile:nth-child(1) img',
    src: '/assets/images/spectral_cleanup_dsp_1789336993282.jpg',
    originalSrc: '/assets/images/spectral_cleanup_dsp_1789336993282.jpg',
    alt: 'Spectral Noise Removal & Cleanup',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-06-photo-2',
    title: 'Card 06 - De-Click & Sibilance Repair',
    section: 'Services: Audio Editing & Cleanup',
    category: 'services',
    selector: '#service-card-06 .catalog-stacked-col .catalog-tile:nth-child(2) img',
    src: '/assets/images/vocal_tuning_plugin_1789336979208.jpg',
    originalSrc: '/assets/images/vocal_tuning_plugin_1789336979208.jpg',
    alt: 'De-Click & Sibilance Repair',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'card-06-hero',
    title: 'Card 06 - Precision Spectral Frequency Repair',
    section: 'Services: Audio Editing & Cleanup',
    category: 'services',
    selector: '#service-card-06 .catalog-hero-img-wrap img',
    src: '/assets/images/spectral_cleanup_dsp_1789336993282.jpg',
    originalSrc: '/assets/images/spectral_cleanup_dsp_1789336993282.jpg',
    alt: 'Precision Spectral Frequency Repair',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'contact-bg-gif',
    title: 'Contact Section Animated Backdrop',
    section: 'Footer & Contact',
    category: 'backgrounds',
    selector: '.contact, section.contact',
    src: '/assets/backgrounds/gif2.gif',
    originalSrc: '/assets/backgrounds/gif2.gif',
    alt: 'Animated Visual Atmosphere',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
];

const DEFAULT_AUDIO_ITEMS = [
  // Showcase Beats
  {
    id: 'showcase-track-1',
    title: 'Aiobahn - Last Mixdown (Demo)',
    category: 'Master Production',
    type: 'showcase',
    section: 'Main Showcase Player Slot 1',
    selector: '#showcase button[data-audio*="Aiobahn"]',
    audioUrl: '/assets/audio/Aiobahn maybe last mix.mp3',
    originalAudioUrl: '/assets/audio/Aiobahn maybe last mix.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'showcase-track-2',
    title: 'Feeling Mello (Lo-Fi Chillhop)',
    category: 'Lo-Fi / Chill Beat',
    type: 'showcase',
    section: 'Main Showcase Player Slot 2',
    selector: '#showcase button[data-audio*="feeling mello"]',
    audioUrl: '/assets/audio/feeling mello.mp3',
    originalAudioUrl: '/assets/audio/feeling mello.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'showcase-track-3',
    title: 'Broken Jar (Trap / Hard Mix)',
    category: 'Commercial Master',
    type: 'showcase',
    section: 'Main Showcase Player Slot 3',
    selector: '#showcase button[data-audio*="broken jar"]',
    audioUrl: '/assets/audio/broken jar mastered.mp3',
    originalAudioUrl: '/assets/audio/broken jar mastered.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'showcase-track-4',
    title: 'Neon Sunset (K-Pop & Dance)',
    category: 'Dance Instrumental',
    type: 'showcase',
    section: 'Main Showcase Player Slot 4',
    selector: '#showcase button[data-audio*="Kpop beat"]',
    audioUrl: '/assets/audio/Kpop beat.mp3',
    originalAudioUrl: '/assets/audio/Kpop beat.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },

  // Service Before & After Stems
  {
    id: 'service-01-before',
    title: 'Card 01 - Custom Production (Before: Raw Idea)',
    category: 'Custom Production',
    type: 'services',
    section: 'Service Card 01 Before Stem',
    selector: '#service-card-01 button[data-audio*="Kensuke"]',
    audioUrl: '/assets/audio/Kensuke.mp3',
    originalAudioUrl: '/assets/audio/Kensuke.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'service-01-after',
    title: 'Card 01 - Custom Production (After: Polished Master)',
    category: 'Custom Production',
    type: 'services',
    section: 'Service Card 01 After Master',
    selector: '#service-card-01 button[data-audio*="feeling mello"]',
    audioUrl: '/assets/audio/feeling mello.mp3',
    originalAudioUrl: '/assets/audio/feeling mello.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'service-02-before',
    title: 'Card 02 - Mixing & Mastering (Before: Unmixed Stems)',
    category: 'Mixing & Mastering',
    type: 'services',
    section: 'Service Card 02 Before Stem',
    selector: '#service-card-02 button[data-audio*="Kensuke"]',
    audioUrl: '/assets/audio/Kensuke.mp3',
    originalAudioUrl: '/assets/audio/Kensuke.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'service-02-after',
    title: 'Card 02 - Mixing & Mastering (After: Mastered WAV)',
    category: 'Mixing & Mastering',
    type: 'services',
    section: 'Service Card 02 After Master',
    selector: '#service-card-02 button[data-audio*="broken jar"]',
    audioUrl: '/assets/audio/broken jar mastered.mp3',
    originalAudioUrl: '/assets/audio/broken jar mastered.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'service-03-before',
    title: 'Card 03 - Vocal Tuning (Before: Raw Dry Vocal)',
    category: 'Vocal Tuning',
    type: 'services',
    section: 'Service Card 03 Before Stem',
    selector: '#service-card-03 button[data-audio*="K-Pop post fx"]',
    audioUrl: '/assets/audio/K-Pop post fx.mp3',
    originalAudioUrl: '/assets/audio/K-Pop post fx.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'service-03-after',
    title: 'Card 03 - Vocal Tuning (After: Saturated & Tuned)',
    category: 'Vocal Tuning',
    type: 'services',
    section: 'Service Card 03 After Master',
    selector: '#service-card-03 button[data-audio*="K-Pop post fx"]',
    audioUrl: '/assets/audio/K-Pop post fx.mp3',
    originalAudioUrl: '/assets/audio/K-Pop post fx.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'service-04-before',
    title: 'Card 04 - Beat Store (Tagged Web Stream Preview)',
    category: 'Beat Store & Licenses',
    type: 'services',
    section: 'Service Card 04 Before Preview',
    selector: '#service-card-04 button[data-audio*="Kpop beat"]',
    audioUrl: '/assets/audio/Kpop beat.mp3',
    originalAudioUrl: '/assets/audio/Kpop beat.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'service-04-after',
    title: 'Card 04 - Beat Store (Untagged Clean Master WAV)',
    category: 'Beat Store & Licenses',
    type: 'services',
    section: 'Service Card 04 After Master',
    selector: '#service-card-04 button[data-audio*="feeling mello"]',
    audioUrl: '/assets/audio/feeling mello.mp3',
    originalAudioUrl: '/assets/audio/feeling mello.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'service-05-before',
    title: 'Card 05 - 1-on-1 Lessons (Student Initial Draft)',
    category: 'Mentorship & Lessons',
    type: 'services',
    section: 'Service Card 05 Before Draft',
    selector: '#service-card-05 button[data-audio*="Kensuke"]',
    audioUrl: '/assets/audio/Kensuke.mp3',
    originalAudioUrl: '/assets/audio/Kensuke.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'service-05-after',
    title: 'Card 05 - 1-on-1 Lessons (Post-Coaching Final Mix)',
    category: 'Mentorship & Lessons',
    type: 'services',
    section: 'Service Card 05 After Coached',
    selector: '#service-card-05 button[data-audio*="Aiobahn"]',
    audioUrl: '/assets/audio/Aiobahn maybe last mix.mp3',
    originalAudioUrl: '/assets/audio/Aiobahn maybe last mix.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },

  // Raw Audio Library
  {
    id: 'raw-aiobahn',
    title: 'Raw Asset: Aiobahn maybe last mix.mp3',
    category: 'Raw Audio Assets',
    type: 'raw',
    section: 'Storage Pool (/assets/audio/)',
    selector: '',
    audioUrl: '/assets/audio/Aiobahn maybe last mix.mp3',
    originalAudioUrl: '/assets/audio/Aiobahn maybe last mix.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'raw-kpop-fx',
    title: 'Raw Asset: K-Pop post fx.mp3',
    category: 'Raw Audio Assets',
    type: 'raw',
    section: 'Storage Pool (/assets/audio/)',
    selector: '',
    audioUrl: '/assets/audio/K-Pop post fx.mp3',
    originalAudioUrl: '/assets/audio/K-Pop post fx.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'raw-kensuke',
    title: 'Raw Asset: Kensuke.mp3',
    category: 'Raw Audio Assets',
    type: 'raw',
    section: 'Storage Pool (/assets/audio/)',
    selector: '',
    audioUrl: '/assets/audio/Kensuke.mp3',
    originalAudioUrl: '/assets/audio/Kensuke.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'raw-kpop-beat',
    title: 'Raw Asset: Kpop beat.mp3',
    category: 'Raw Audio Assets',
    type: 'raw',
    section: 'Storage Pool (/assets/audio/)',
    selector: '',
    audioUrl: '/assets/audio/Kpop beat.mp3',
    originalAudioUrl: '/assets/audio/Kpop beat.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'raw-broken-jar',
    title: 'Raw Asset: broken jar mastered.mp3',
    category: 'Raw Audio Assets',
    type: 'raw',
    section: 'Storage Pool (/assets/audio/)',
    selector: '',
    audioUrl: '/assets/audio/broken jar mastered.mp3',
    originalAudioUrl: '/assets/audio/broken jar mastered.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
  {
    id: 'raw-feeling-mello',
    title: 'Raw Asset: feeling mello.mp3',
    category: 'Raw Audio Assets',
    type: 'raw',
    section: 'Storage Pool (/assets/audio/)',
    selector: '',
    audioUrl: '/assets/audio/feeling mello.mp3',
    originalAudioUrl: '/assets/audio/feeling mello.mp3',
    isRemoved: false,
    isReplaced: false,
    isSwapped: false,
  },
];

export function VisualTuningTool() {
  const client = useClient({ apiVersion: '2023-01-01' });

  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const previewContainerRef = useRef(null);
  const selectedNodeRef = useRef(null);

  // Active side panel tab: 'general' | 'inspector' (Default 'general')
  const [activeTab, setActiveTab] = useState('general');

  // View state: 'desktop' | 'mobile'
  const [deviceView, setDeviceView] = useState('desktop');

  // Edit scope mode: 'universal' | 'device'
  const [editScope, setEditScope] = useState('universal');

  // Requirement 3: Keep text edit and layout OFF by default
  const [inspectorActive, setInspectorActive] = useState(false);
  const [showLayoutGuides, setShowLayoutGuides] = useState(false);
  const [layoutDragState, setLayoutDragState] = useState(null); // 'gutter-left' | 'gutter-right' | 'section-top' | 'section-bottom'

  // Settings State initialized with DEFAULT_VALUES
  const [settings, setSettings] = useState({ ...DEFAULT_VALUES });
  const [tracks, setTracks] = useState([]);

  // Accordion collapsed state for all categories (Collapsed by default)
  const [collapsedCategories, setCollapsedCategories] = useState({
    hero: true,
    showcase: true,
    process: true,
    services: true,
    typography: true,
    layout: true,
    brand: true,
    contact: true,
    imagesAudio: false,
    audio: true,
  });

  // Selected element for Inspector tab
  const [selectedElementTag, setSelectedElementTag] = useState('');
  const [selectedElementSelector, setSelectedElementSelector] = useState('');
  const [selectedElementText, setSelectedElementText] = useState('');

  // Initial reference styles of the inspected element (for showing changes & functional resets)
  const [initialElementState, setInitialElementState] = useState({
    text: '',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'left',
    color: '#ffffff',
    backgroundColor: '',
    opacity: 100,
    letterSpacing: 0,
    lineHeight: '1.5',
    textTransform: 'none',
    boxShadow: 'none',
    borderRadius: 0,
    padding: 0,
    margin: 0,
    initialInlineStyle: '',
  });

  // Active editable styles of the inspected element
  const [elementStyles, setElementStyles] = useState({
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'left',
    color: '#ffffff',
    backgroundColor: '',
    opacity: 100,
    letterSpacing: 0,
    lineHeight: '1.5',
    textTransform: 'none',
    boxShadow: 'none',
    borderRadius: 0,
    padding: 0,
    margin: 0,
  });

  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState('');
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Requirement: Images and Audio sections beside Text Edit
  const [imageModeActive, setImageModeActive] = useState(false);
  const [audioModeActive, setAudioModeActive] = useState(false);
  const [siteImages, setSiteImages] = useState(DEFAULT_SITE_IMAGES);
  const [selectedImage, setSelectedImage] = useState(null);
  const [audioItems, setAudioItems] = useState(DEFAULT_AUDIO_ITEMS);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // Image Management Handlers
  const handleSelectImage = (img) => {
    setSelectedImage(img);
    setActiveTab('images');
  };

  const handleRemoveImage = (imgId) => {
    setSiteImages((prev) =>
      prev.map((img) => (img.id === imgId ? { ...img, isRemoved: true } : img))
    );
    if (selectedImage?.id === imgId) {
      setSelectedImage((prev) => ({ ...prev, isRemoved: true }));
    }

    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (iframeDoc) {
        const targetImg = siteImages.find((i) => i.id === imgId);
        let el = iframeDoc.querySelector(`[data-sanity-img-id="${imgId}"]`);
        if (!el && targetImg?.selector) {
          try { el = iframeDoc.querySelector(targetImg.selector); } catch (e) {}
        }
        if (!el && targetImg?.originalSrc) {
          try {
            const cleanSrc = targetImg.originalSrc.replace(/^(\.\/|\/)/, '');
            el = iframeDoc.querySelector(`img[src*="${cleanSrc}"]`);
          } catch (e) {}
        }
        if (el) {
          const isImageElement = el.tagName.toLowerCase() === 'img';
          const tile = isImageElement ? el.closest('.catalog-tile, .catalog-hero-img-wrap, .hero-photo, .hero-img') : null;
          if (isImageElement) {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('opacity', '0', 'important');
            if (tile) tile.style.setProperty('display', 'none', 'important');
          } else {
            el.style.setProperty('background-image', 'none', 'important');
          }
        }
      }
    } catch (e) {
      console.warn('Immediate image remove caught:', e);
    }
  };

  const handleRestoreImage = (imgId) => {
    setSiteImages((prev) =>
      prev.map((img) => (img.id === imgId ? { ...img, isRemoved: false } : img))
    );
    if (selectedImage?.id === imgId) {
      setSelectedImage((prev) => ({ ...prev, isRemoved: false }));
    }

    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (iframeDoc) {
        const targetImg = siteImages.find((i) => i.id === imgId);
        let el = iframeDoc.querySelector(`[data-sanity-img-id="${imgId}"]`);
        if (!el && targetImg?.selector) {
          try { el = iframeDoc.querySelector(targetImg.selector); } catch (e) {}
        }
        if (!el && targetImg?.originalSrc) {
          try {
            const cleanSrc = targetImg.originalSrc.replace(/^(\.\/|\/)/, '');
            el = iframeDoc.querySelector(`img[src*="${cleanSrc}"]`);
          } catch (e) {}
        }
        if (el) {
          const isImageElement = el.tagName.toLowerCase() === 'img';
          const tile = isImageElement ? el.closest('.catalog-tile, .catalog-hero-img-wrap, .hero-photo, .hero-img') : null;
          if (isImageElement) {
            el.style.removeProperty('display');
            el.style.removeProperty('visibility');
            el.style.removeProperty('opacity');
            if (tile) tile.style.removeProperty('display');
          } else {
            el.style.removeProperty('background-image');
            if (targetImg?.isReplaced || targetImg?.isSwapped) {
              el.style.setProperty('background-image', `url("${targetImg.src}")`, 'important');
            }
          }
        }
      }
    } catch (e) {
      console.warn('Immediate image restore caught:', e);
    }
  };

  const handleReplaceImage = (imgId, newSrc, fileName) => {
    setSiteImages((prev) =>
      prev.map((img) =>
        img.id === imgId ? { ...img, src: newSrc, isReplaced: true, customFileName: fileName } : img
      )
    );
    if (selectedImage?.id === imgId) {
      setSelectedImage((prev) => ({ ...prev, src: newSrc, isReplaced: true, customFileName: fileName }));
    }
  };

  const handleSwapImage = (imgIdA, imgIdB) => {
    setSiteImages((prev) => {
      const imgA = prev.find((i) => i.id === imgIdA);
      const imgB = prev.find((i) => i.id === imgIdB);
      if (!imgA || !imgB) return prev;
      const srcA = imgA.src;
      const srcB = imgB.src;
      return prev.map((i) => {
        if (i.id === imgIdA) return { ...i, src: srcB, isSwapped: true, swappedWithTitle: imgB.title };
        if (i.id === imgIdB) return { ...i, src: srcA, isSwapped: true, swappedWithTitle: imgA.title };
        return i;
      });
    });
    if (selectedImage?.id === imgIdA || selectedImage?.id === imgIdB) {
      const targetId = selectedImage.id;
      setTimeout(() => {
        setSiteImages((latest) => {
          const updated = latest.find((i) => i.id === targetId);
          if (updated) setSelectedImage(updated);
          return latest;
        });
      }, 50);
    }
  };

  const handleResetImage = (imgId) => {
    setSiteImages((prev) =>
      prev.map((img) =>
        img.id === imgId
          ? { ...img, src: img.originalSrc, isRemoved: false, isReplaced: false, isSwapped: false, customFileName: undefined, swappedWithTitle: undefined }
          : img
      )
    );
    if (selectedImage?.id === imgId) {
      setSelectedImage((prev) => ({
        ...prev,
        src: prev.originalSrc,
        isRemoved: false,
        isReplaced: false,
        isSwapped: false,
        customFileName: undefined,
        swappedWithTitle: undefined,
      }));
    }
  };

  const handleResetAllImages = () => {
    setSiteImages((prev) =>
      prev.map((img) => ({
        ...img,
        src: img.originalSrc,
        isRemoved: false,
        isReplaced: false,
        isSwapped: false,
        customFileName: undefined,
        swappedWithTitle: undefined,
      }))
    );
    if (selectedImage) {
      setSelectedImage((prev) => ({
        ...prev,
        src: prev.originalSrc,
        isRemoved: false,
        isReplaced: false,
        isSwapped: false,
        customFileName: undefined,
        swappedWithTitle: undefined,
      }));
    }
  };

  const handleFocusImageOnPage = (img) => {
    const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
    if (!iframeDoc) return;
    let el = img.selector ? iframeDoc.querySelector(img.selector) : null;
    if (!el && img.src) {
      el = iframeDoc.querySelector(`img[src="${img.src}"]`);
    }
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const origOutline = el.style.outline;
      const origTransition = el.style.transition;
      el.style.transition = 'all 0.3s ease';
      el.style.outline = '4px solid #0019ff';
      setTimeout(() => {
        el.style.outline = origOutline;
        el.style.transition = origTransition;
      }, 2000);
      showToast(`Located "${img.title}" on preview canvas`);
    }
  };

  // Audio Management Handlers
  const handleRemoveAudio = (audioId) => {
    setAudioItems((prev) =>
      prev.map((item) => (item.id === audioId ? { ...item, isRemoved: true } : item))
    );
  };

  const handleRestoreAudio = (audioId) => {
    setAudioItems((prev) =>
      prev.map((item) => (item.id === audioId ? { ...item, isRemoved: false } : item))
    );
  };

  const handleReplaceAudio = (audioId, newAudioUrl, fileName) => {
    setAudioItems((prev) =>
      prev.map((item) =>
        item.id === audioId ? { ...item, audioUrl: newAudioUrl, isReplaced: true, customFileName: fileName } : item
      )
    );
  };

  const handleSwapAudio = (audioIdA, audioIdB) => {
    setAudioItems((prev) => {
      const itemA = prev.find((i) => i.id === audioIdA);
      const itemB = prev.find((i) => i.id === audioIdB);
      if (!itemA || !itemB) return prev;
      const urlA = itemA.audioUrl;
      const urlB = itemB.audioUrl;
      return prev.map((i) => {
        if (i.id === audioIdA) return { ...i, audioUrl: urlB, isSwapped: true, swappedWithTitle: itemB.title };
        if (i.id === audioIdB) return { ...i, audioUrl: urlA, isSwapped: true, swappedWithTitle: itemA.title };
        return i;
      });
    });
  };

  const handleResetAudio = (audioId) => {
    setAudioItems((prev) =>
      prev.map((item) =>
        item.id === audioId
          ? { ...item, audioUrl: item.originalAudioUrl, isRemoved: false, isReplaced: false, isSwapped: false, customFileName: undefined, swappedWithTitle: undefined }
          : item
      )
    );
  };

  const handleResetAllAudio = () => {
    setAudioItems((prev) =>
      prev.map((item) => ({
        ...item,
        audioUrl: item.originalAudioUrl,
        isRemoved: false,
        isReplaced: false,
        isSwapped: false,
        customFileName: undefined,
        swappedWithTitle: undefined,
      }))
    );
  };

  const handleAddNewAudio = (audioUrl, fileName, title, category) => {
    const newItem = {
      id: `custom-audio-${Date.now()}`,
      title: title || fileName,
      category: category || 'Uploaded Raw Audio',
      type: 'raw',
      section: 'Storage Pool (Custom Upload)',
      selector: '',
      audioUrl: audioUrl,
      originalAudioUrl: audioUrl,
      isRemoved: false,
      isReplaced: true,
      isSwapped: false,
      customFileName: fileName,
    };
    setAudioItems((prev) => [newItem, ...prev]);
  };

  // Toggle category expansion
  const toggleCategory = (catKey) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  // Expand / Collapse all categories at once
  const toggleAllCategories = (collapseState) => {
    setCollapsedCategories({
      hero: collapseState,
      showcase: collapseState,
      process: collapseState,
      services: collapseState,
      typography: collapseState,
      layout: collapseState,
      brand: collapseState,
      contact: collapseState,
      audio: collapseState,
    });
  };

  // Track fields explicitly modified by the user in this session
  const [userModifiedFields, setUserModifiedFields] = useState(() => new Set());

  // Check if a specific general setting is modified from its default value
  const isFieldModified = useCallback((fieldKey) => {
    return userModifiedFields.has(fieldKey);
  }, [userModifiedFields]);

  // Reset a specific general field to its default value
  const resetField = (fieldKey) => {
    if (DEFAULT_VALUES[fieldKey] !== undefined) {
      setSettings((prev) => ({
        ...prev,
        [fieldKey]: DEFAULT_VALUES[fieldKey],
      }));
      setUserModifiedFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
      showToast(`Reverted ${fieldKey} to default`);
    }
  };

  // Reset all fields within a specific category back to default
  const resetCategory = (catKey) => {
    const categoryFields = {
      hero: ['heroEyebrow', 'heroTitle', 'heroLine1', 'heroLine2', 'heroCtaText'],
      showcase: ['showcaseTitle', 'showcaseDescription'],
      process: ['processTitle', 'processTrustline', 'processClosingTitle', 'processClosingCopy'],
      services: ['servicesTitle', 'servicesDescription', 'customProductionPrice', 'mixingMasteringPrice', 'vocalTuningPrice', 'mp3Price', 'wavPrice', 'stemsPrice', 'exclusivePrice'],
      typography: ['displayFont', 'bodyFont', 'desktopHeroTitleSize', 'desktopH2Size', 'desktopBaseFontSize', 'mobileHeroTitleSize', 'mobileH2Size', 'mobileBaseFontSize', 'headingWeight'],
      layout: ['desktopPageGutter', 'desktopSectionPadding', 'desktopCardPadding', 'desktopCardGap', 'mobilePageGutter', 'mobileSectionPadding', 'mobileCardPadding', 'mobileCardGap'],
      brand: ['siteBrand', 'primarySignalColor', 'signalBrightColor', 'darkCanvasColor'],
      contact: ['contactTitle', 'contactLead', 'emailAddress', 'copyrightText'],
    };

    const fieldsToReset = categoryFields[catKey] || [];
    setSettings((prev) => {
      const next = { ...prev };
      fieldsToReset.forEach((f) => {
        if (DEFAULT_VALUES[f] !== undefined) {
          next[f] = DEFAULT_VALUES[f];
        }
      });
      return next;
    });
    setUserModifiedFields((prev) => {
      const next = new Set(prev);
      fieldsToReset.forEach((f) => next.delete(f));
      return next;
    });
    showToast(`Reset ${catKey} section to default`);
  };

  // Reset ALL general settings back to initial defaults
  const resetAllGeneralSettings = () => {
    setSettings({ ...DEFAULT_VALUES });
    setUserModifiedFields(new Set());
    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (iframeDoc) {
        const dynamicStyleTag = iframeDoc.getElementById('live-edit-dynamic-override-styles');
        if (dynamicStyleTag) {
          dynamicStyleTag.textContent = '';
        }
      }
    } catch (err) {
      console.warn('Reset style tag error:', err);
    }
    showToast('Reset all general settings to default');
  };

  // Update a general field value according to editScope
  const updateField = (fieldKey, value) => {
    setUserModifiedFields((prev) => {
      const next = new Set(prev);
      if (value === DEFAULT_VALUES[fieldKey]) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });

    setSettings((prev) => {
      const updated = { ...prev, [fieldKey]: value };

      // In Universal mode, synchronize related desktop and mobile counterparts if applicable
      if (editScope === 'universal') {
        if (fieldKey === 'desktopPageGutter') {
          updated.mobilePageGutter = Math.max(12, Math.round(value * 0.45));
          setUserModifiedFields((m) => new Set(m).add('mobilePageGutter'));
        }
        if (fieldKey === 'mobilePageGutter') {
          updated.desktopPageGutter = Math.round(value / 0.45);
          setUserModifiedFields((m) => new Set(m).add('desktopPageGutter'));
        }
        if (fieldKey === 'desktopSectionPadding') {
          updated.mobileSectionPadding = Math.max(32, Math.round(value * 0.58));
          setUserModifiedFields((m) => new Set(m).add('mobileSectionPadding'));
        }
        if (fieldKey === 'mobileSectionPadding') {
          updated.desktopSectionPadding = Math.round(value / 0.58);
          setUserModifiedFields((m) => new Set(m).add('desktopSectionPadding'));
        }
      }

      return updated;
    });
  };

  // Fetch saved settings and audio tracks from Sanity
  useEffect(() => {
    let isMounted = true;
    const fetchAllData = async () => {
      try {
        const sanityClient = getSanityEditorClient() || client;
        const [desktopDoc, mobileDoc, unifiedDoc, trackList] = await Promise.all([
          sanityClient.fetch(`*[_type == "desktopSettings"][0]`).catch(() => null),
          sanityClient.fetch(`*[_type == "mobileSettings"][0]`).catch(() => null),
          sanityClient.fetch(`*[_type == "unifiedSettings"][0]`).catch(() => null),
          sanityClient.fetch(`*[_type == "audioArsenal"] | order(_createdAt desc)`).catch(() => []),
        ]);

        if (!isMounted) return;

        if (Array.isArray(trackList)) {
          setTracks(trackList);
        }

        setSettings((prev) => ({
          ...prev,
          ...(desktopDoc || {}),
          ...(mobileDoc || {}),
          ...(unifiedDoc || {}),
          ...(unifiedDoc?.beatLicensePricing || {}),
          ...(unifiedDoc?.servicesPricing || {}),
        }));
      } catch (err) {
        console.warn('Initial Sanity data fetch fallback:', err);
      }
    };

    fetchAllData();
    return () => { isMounted = false; };
  }, [client]);

  // Apply all CSS variables, typography, layout rules, text modifications and prices directly into the live preview iframe
  const applyLiveChangesToIframe = useCallback(() => {
    if (!iframeRef.current) return;
    try {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (!iframeDoc) return;

      const isMobile = deviceView === 'mobile';

      const isGutterModified = isMobile ? isFieldModified('mobilePageGutter') : isFieldModified('desktopPageGutter');
      const isSecPaddingModified = isMobile ? isFieldModified('mobileSectionPadding') : isFieldModified('desktopSectionPadding');
      const isCardPaddingModified = isMobile ? isFieldModified('mobileCardPadding') : isFieldModified('desktopCardPadding');
      const isCardGapModified = isMobile ? isFieldModified('mobileCardGap') : isFieldModified('desktopCardGap');

      const isHeroTitleModified = isMobile ? isFieldModified('mobileHeroTitleSize') : isFieldModified('desktopHeroTitleSize');
      const isH2Modified = isMobile ? isFieldModified('mobileH2Size') : isFieldModified('desktopH2Size');
      const isBaseFontModified = isMobile ? isFieldModified('mobileBaseFontSize') : isFieldModified('desktopBaseFontSize');
      const isHeadingWeightModified = isFieldModified('headingWeight');
      const isDisplayFontModified = isFieldModified('displayFont');
      const isBodyFontModified = isFieldModified('bodyFont');

      const isSignalModified = isFieldModified('primarySignalColor');
      const isSignalBrightModified = isFieldModified('signalBrightColor');
      const isCanvasBgModified = isFieldModified('darkCanvasColor');

      const gutter = isMobile ? (settings.mobilePageGutter || 20) : (settings.desktopPageGutter || 48);
      const secPadding = isMobile ? (settings.mobileSectionPadding || 64) : (settings.desktopSectionPadding || 112);
      const cardPadding = isMobile ? (settings.mobileCardPadding || 20) : (settings.desktopCardPadding || 34);
      const cardGap = isMobile ? (settings.mobileCardGap || 14) : (settings.desktopCardGap || 24);

      const heroTitleSize = isMobile ? (settings.mobileHeroTitleSize || 5.0) : (settings.desktopHeroTitleSize || 11.5);
      const h2Size = isMobile ? (settings.mobileH2Size || 4.5) : (settings.desktopH2Size || 9.2);
      const baseFontSize = isMobile ? (settings.mobileBaseFontSize || 15) : (settings.desktopBaseFontSize || 16);
      const headingWeight = settings.headingWeight || '400';

      const signalColor = settings.primarySignalColor || '#6c63e5';
      const signalBright = settings.signalBrightColor || '#007fff';
      const canvasBg = settings.darkCanvasColor || '#0d0d11';
      const displayFont = settings.displayFont || 'Dela Gothic One';
      const bodyFont = settings.bodyFont || 'DM Sans';

      // 1. INJECT / UPDATE DYNAMIC OVERRIDE STYLESHEET
      let dynamicStyleTag = iframeDoc.getElementById('live-edit-dynamic-override-styles');
      if (!dynamicStyleTag) {
        dynamicStyleTag = iframeDoc.createElement('style');
        dynamicStyleTag.id = 'live-edit-dynamic-override-styles';
        iframeDoc.head.appendChild(dynamicStyleTag);
      }

      // Build CSS rules dynamically so default sizes & typography are 100% untouched unless customized
      let rootVars = [];
      if (isGutterModified || showLayoutGuides) rootVars.push(`--page-gutter: ${gutter}px !important;`);
      if (isSecPaddingModified || showLayoutGuides) rootVars.push(`--section-padding: ${secPadding}px !important;`);
      if (isCardPaddingModified) rootVars.push(`--card-padding: ${cardPadding}px !important;`);
      if (isCardGapModified) rootVars.push(`--card-gap: ${cardGap}px !important;`);
      if (isSignalModified) {
        rootVars.push(`--signal: ${signalColor} !important;`);
        rootVars.push(`--signal-accent: ${signalColor} !important;`);
        rootVars.push(`--brand-deep: ${signalColor} !important;`);
      }
      if (isSignalBrightModified) rootVars.push(`--signal-bright: ${signalBright} !important;`);
      if (isCanvasBgModified) {
        rootVars.push(`--ink: ${canvasBg} !important;`);
        rootVars.push(`--canvas-bg: ${canvasBg} !important;`);
      }
      if (isDisplayFontModified) rootVars.push(`--font-display: "${displayFont}", sans-serif !important;`);
      if (isBodyFontModified) rootVars.push(`--font-body: "${bodyFont}", sans-serif !important;`);
      if (isBaseFontModified) rootVars.push(`--base-font-size: ${baseFontSize}px !important;`);

      let customCSS = '';
      if (rootVars.length > 0) {
        customCSS += `:root { ${rootVars.join(' ')} }\n`;
      }

      if (isBodyFontModified || isBaseFontModified || isCanvasBgModified) {
        let bodyProps = [];
        if (isBodyFontModified) bodyProps.push(`font-family: "${bodyFont}", sans-serif !important;`);
        if (isBaseFontModified) bodyProps.push(`font-size: ${baseFontSize}px !important;`);
        if (isCanvasBgModified) bodyProps.push(`background-color: ${canvasBg} !important;`);
        if (bodyProps.length > 0) {
          customCSS += `body { ${bodyProps.join(' ')} }\n`;
        }
      }

      // Hero Title Override ONLY when modified by user
      if (isHeroTitleModified || isDisplayFontModified || isHeadingWeightModified) {
        let heroProps = [];
        if (isDisplayFontModified) heroProps.push(`font-family: "${displayFont}", sans-serif !important;`);
        if (isHeroTitleModified) heroProps.push(`font-size: ${heroTitleSize}rem !important;`);
        if (isHeadingWeightModified) heroProps.push(`font-weight: ${headingWeight} !important;`);
        if (heroProps.length > 0) {
          customCSS += `#hero-title, .hero-title, .hero h1 { ${heroProps.join(' ')} }\n`;
        }
      }

      // Section H2 Override ONLY when modified by user
      if (isH2Modified || isDisplayFontModified || isHeadingWeightModified) {
        let h2Props = [];
        if (isDisplayFontModified) h2Props.push(`font-family: "${displayFont}", sans-serif !important;`);
        if (isH2Modified) h2Props.push(`font-size: ${h2Size}rem !important;`);
        if (isHeadingWeightModified) h2Props.push(`font-weight: ${headingWeight} !important;`);
        if (h2Props.length > 0) {
          customCSS += `h2, .section-heading h2, #beats-title, #process-title, #services-title, #delivery-title, #contact-title { ${h2Props.join(' ')} }\n`;
        }
      }

      if (isDisplayFontModified) {
        customCSS += `h3, .service-card h3, .process-card h3, .process-closing h3, .delivery-step h3, .card-name, .brand, .site-header .brand {
          font-family: "${displayFont}", sans-serif !important;
        }\n`;
      }

      if (isSecPaddingModified) {
        customCSS += `.section, .services, .process-section, .delivery-section {
          padding-block: ${secPadding}px !important;
        }\n`;
      }

      if (isCardPaddingModified) {
        customCSS += `.service-card, .process-card, .delivery-panel, .services-catalog-card {
          padding: ${cardPadding}px !important;
        }\n`;
      }

      if (isCardGapModified) {
        customCSS += `.service-grid, .process-grid, .playlist, .services-catalog-stack {
          gap: ${cardGap}px !important;
        }\n`;
      }

      dynamicStyleTag.textContent = customCSS;

      // Helper function to update element text if not currently focused
      const updateElText = (selector, newText) => {
        if (newText === undefined || newText === null) return;
        const els = iframeDoc.querySelectorAll(selector);
        els.forEach((el) => {
          if (!el.matches(':focus')) {
            el.innerText = newText;
          }
        });
      };

      // Helper function to update HTML (for headings with <em>)
      const updateElHtml = (selector, newHtml) => {
        if (!newHtml) return;
        const els = iframeDoc.querySelectorAll(selector);
        els.forEach((el) => {
          if (!el.matches(':focus')) {
            el.innerHTML = newHtml;
          }
        });
      };

      // 2. HERO SECTION TEXT UPDATES
      if (settings.heroEyebrow) updateElText('.hero-eyebrow, .hero .eyebrow', settings.heroEyebrow);
      if (settings.heroTitle) updateElText('#hero-title, .hero-title, .hero h1', settings.heroTitle);
      if (settings.heroLine1) updateElText('.hero-copy-line1', settings.heroLine1);
      if (settings.heroLine2) updateElText('.hero-copy-line2', settings.heroLine2);
      if (settings.heroCtaText) {
        const ctaBtn = iframeDoc.querySelector('.hero-cta, .hero-content button.cta-button');
        if (ctaBtn && !ctaBtn.matches(':focus')) {
          ctaBtn.innerHTML = `${settings.heroCtaText} <span aria-hidden="true">›</span>`;
        }
      }

      // 3. SHOWCASE / THE WORK SECTION
      if (settings.showcaseTitle) {
        const titleVal = settings.showcaseTitle.includes('<em>') || settings.showcaseTitle.includes('<span>')
          ? settings.showcaseTitle
          : settings.showcaseTitle.replace(/Work/i, '<em>Work</em>');
        updateElHtml('#beats-title', titleVal);
      }
      if (settings.showcaseDescription) updateElText('#showcase .section-heading > p, .beats .section-heading > p', settings.showcaseDescription);

      // 4. PROCESS SECTION
      if (settings.processTitle) {
        const pTitleVal = settings.processTitle.includes('<em>') || settings.processTitle.includes('<span>')
          ? settings.processTitle
          : settings.processTitle.replace(/Process/i, '<em>Process</em>');
        updateElHtml('#process-title', pTitleVal);
      }
      if (settings.processTrustline) updateElText('.process-trust-line', settings.processTrustline);
      if (settings.processClosingTitle) updateElText('.process-closing h3', settings.processClosingTitle);
      if (settings.processClosingCopy) updateElText('.process-closing > p', settings.processClosingCopy);

      // 5. SERVICES & PRICING SECTION
      if (settings.servicesTitle) {
        const sTitleVal = settings.servicesTitle.includes('<em>') || settings.servicesTitle.includes('<span>') || settings.servicesTitle.includes('<br>')
          ? settings.servicesTitle
          : settings.servicesTitle.replace(/Services/i, '<br><em>Services</em>');
        updateElHtml('#services-title', sTitleVal);
      }
      if (settings.servicesDescription) updateElText('#services .section-heading > p, .services .section-heading p', settings.servicesDescription);

      // Pricing chips in service catalog cards
      if (settings.customProductionPrice !== undefined) {
        updateElText('#service-card-01 .card-price-chip', `From $${settings.customProductionPrice}`);
      }
      if (settings.mixingMasteringPrice !== undefined) {
        updateElText('#service-card-02 .card-price-chip', `From $${settings.mixingMasteringPrice}`);
      }
      if (settings.vocalTuningPrice !== undefined) {
        updateElText('#service-card-03 .card-price-chip', `From $${settings.vocalTuningPrice}`);
      }
      if (settings.mp3Price !== undefined) {
        updateElText('#service-card-04 .card-price-chip', `From $${settings.mp3Price}`);
      }
      if (settings.stemsPrice !== undefined) {
        updateElText('#service-card-05 .card-price-chip', `From $${settings.stemsPrice} / hr`);
      }
      if (settings.exclusivePrice !== undefined) {
        updateElText('#service-card-06 .card-price-chip', `From $${settings.exclusivePrice}`);
      }

      // 6. BRAND NAME
      if (settings.siteBrand) updateElText('.site-header .brand, .brand', settings.siteBrand);

      // 7. CONTACT & FOOTER SECTION
      if (settings.contactTitle) {
        const cTitleVal = settings.contactTitle.includes('<em>') || settings.contactTitle.includes('<span>')
          ? settings.contactTitle
          : settings.contactTitle.replace(/Work/i, '<em>Work</em>');
        updateElHtml('#contact-title', cTitleVal);
      }
      if (settings.contactLead) updateElText('.contact-intro-lead, .contact-copy > p:not(.eyebrow)', settings.contactLead);
      if (settings.emailAddress) {
        const emailLink = iframeDoc.querySelector('#social-link-email');
        if (emailLink) emailLink.setAttribute('href', `mailto:${settings.emailAddress}`);
      }
      if (settings.copyrightText) updateElText('.contact-copyright', settings.copyrightText);

    } catch (e) {
      console.warn('Live iframe style and design sync error:', e);
    }
  }, [deviceView, settings, showLayoutGuides]);

  useEffect(() => {
    if (iframeLoaded) {
      applyLiveChangesToIframe();
    }
  }, [iframeLoaded, applyLiveChangesToIframe]);

  // Wire up Chrome DevTools style inspector & element selector
  useEffect(() => {
    if (!iframeRef.current) return;
    try {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (!iframeDoc) return;

      if (inspectorActive) {
        iframeDoc.designMode = 'on';

        const handleIframeClick = (e) => {
          const target = e.target;
          if (target && target !== iframeDoc.body && target !== iframeDoc.documentElement) {
            selectedNodeRef.current = target;
            const tagName = target.tagName.toLowerCase();
            const text = target.innerText || target.textContent || '';
            const id = target.id ? `#${target.id}` : '';
            const className = target.className && typeof target.className === 'string'
              ? `.${target.className.trim().split(/\s+/).slice(0, 2).join('.')}`
              : '';
            
            setSelectedElementTag(tagName);
            setSelectedElementSelector(id || className || tagName);
            setSelectedElementText(text);

            const computed = iframeDoc.defaultView?.getComputedStyle(target);
            if (computed) {
              const fontSizeNum = parseFloat(computed.fontSize) || 16;
              const opacityNum = Math.round((parseFloat(computed.opacity) || 1) * 100);
              const radiusNum = parseFloat(computed.borderRadius) || 0;
              const paddingNum = parseFloat(computed.paddingTop) || 0;
              const marginNum = parseFloat(computed.marginTop) || 0;
              const letterSpacingNum = parseFloat(computed.letterSpacing) || 0;
              const hexColor = rgbToHex(computed.color) || '#ffffff';
              const hexBg = rgbToHex(computed.backgroundColor) || '';

              const extracted = {
                text: text,
                fontSize: fontSizeNum,
                fontWeight: computed.fontWeight || '400',
                textAlign: computed.textAlign || 'left',
                color: hexColor,
                backgroundColor: hexBg,
                opacity: opacityNum,
                letterSpacing: letterSpacingNum,
                lineHeight: computed.lineHeight || '1.5',
                textTransform: computed.textTransform || 'none',
                boxShadow: computed.boxShadow !== 'none' ? computed.boxShadow : 'none',
                borderRadius: radiusNum,
                padding: paddingNum,
                margin: marginNum,
                initialInlineStyle: target.getAttribute('style') || '',
              };

              setInitialElementState(extracted);
              setElementStyles({
                fontSize: extracted.fontSize,
                fontWeight: extracted.fontWeight,
                textAlign: extracted.textAlign,
                color: extracted.color,
                backgroundColor: extracted.backgroundColor,
                opacity: extracted.opacity,
                letterSpacing: extracted.letterSpacing,
                lineHeight: extracted.lineHeight,
                textTransform: extracted.textTransform,
                boxShadow: extracted.boxShadow,
                borderRadius: extracted.borderRadius,
                padding: extracted.padding,
                margin: extracted.margin,
              });
            }

            setActiveTab('inspector');
          }
        };

        const handleIframeInput = (e) => {
          const target = e.target;
          if (target) {
            selectedNodeRef.current = target;
            setSelectedElementText(target.innerText || target.textContent || '');
          }
        };

        iframeDoc.addEventListener('click', handleIframeClick);
        iframeDoc.addEventListener('input', handleIframeInput);

        return () => {
          iframeDoc.removeEventListener('click', handleIframeClick);
          iframeDoc.removeEventListener('input', handleIframeInput);
        };
      } else {
        iframeDoc.designMode = 'off';
      }
    } catch (e) {
      console.warn('Inspector setup caught:', e);
    }
  }, [inspectorActive, iframeLoaded]);

  // Image Mode: Enable clicking on any image to select, inspect, replace, or swap
  useEffect(() => {
    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (!iframeDoc) return;

      const styleId = 'live-edit-image-mode-styles';
      let imgStyleTag = iframeDoc.getElementById(styleId);

      if (imageModeActive) {
        if (!imgStyleTag) {
          imgStyleTag = iframeDoc.createElement('style');
          imgStyleTag.id = styleId;
          iframeDoc.head.appendChild(imgStyleTag);
        }
        imgStyleTag.textContent = `
          img, .catalog-photo, .hero-photo img, .catalog-hero-img-wrap img {
            cursor: pointer !important;
            outline: 2px dashed #0019ff !important;
            outline-offset: 3px !important;
            transition: all 0.15s ease !important;
          }
          img:hover, .catalog-photo:hover, .hero-photo img:hover, .catalog-hero-img-wrap img:hover {
            outline: 3px solid #0019ff !important;
            filter: brightness(1.08) !important;
            transform: scale(1.01) !important;
          }
        `;

        const handleImageClick = (e) => {
          let target = e.target;
          if (!target) return;

          // If clicked within an image container or img element
          let imgEl = null;
          if (target.tagName.toLowerCase() === 'img') {
            imgEl = target;
          } else if (target.querySelector('img')) {
            imgEl = target.querySelector('img');
          } else {
            const closestWrap = target.closest('.catalog-tile, .catalog-hero-img-wrap, .hero-photo, .hero-img');
            if (closestWrap) {
              imgEl = closestWrap.querySelector('img');
            }
          }

          if (imgEl) {
            e.preventDefault();
            e.stopPropagation();

            const imgSrc = imgEl.getAttribute('src') || imgEl.src;
            const imgAlt = imgEl.getAttribute('alt') || 'Website Image';
            const existingTagId = imgEl.getAttribute('data-sanity-img-id');

            // Find matching item in siteImages
            let matched = siteImages.find((img) => {
              if (existingTagId && img.id === existingTagId) return true;
              if (img.selector) {
                try {
                  const queryTarget = iframeDoc.querySelector(img.selector);
                  if (queryTarget === imgEl) return true;
                } catch (e) {}
              }
              return false;
            });

            if (!matched) {
              matched = siteImages.find((img) => {
                if (img.src === imgSrc || img.originalSrc === imgSrc) return true;
                return false;
              });
            }

            if (matched) {
              imgEl.setAttribute('data-sanity-img-id', matched.id);
              setSelectedImage(matched);
            } else {
              // Create dynamic image entry
              const dynamicId = `img-dynamic-${Date.now()}`;
              imgEl.setAttribute('data-sanity-img-id', dynamicId);

              // Derive selector
              let selector = '';
              const card = imgEl.closest('[id]');
              if (card && card.id) {
                const isHero = !!imgEl.closest('.catalog-hero-img-wrap');
                const tile = imgEl.closest('.catalog-tile');
                if (isHero) {
                  selector = `#${card.id} .catalog-hero-img-wrap img`;
                } else if (tile && tile.parentElement) {
                  const tileIdx = Array.from(tile.parentElement.children).indexOf(tile) + 1;
                  selector = `#${card.id} .catalog-stacked-col .catalog-tile:nth-child(${tileIdx}) img`;
                }
              }

              const newEntry = {
                id: dynamicId,
                title: imgAlt || `Image (${imgEl.naturalWidth || 600}x${imgEl.naturalHeight || 400})`,
                section: 'Live Page Canvas',
                category: 'services',
                selector: selector,
                src: imgSrc,
                originalSrc: imgSrc,
                alt: imgAlt,
                isRemoved: false,
                isReplaced: false,
                isSwapped: false,
              };
              setSiteImages((prev) => [newEntry, ...prev]);
              setSelectedImage(newEntry);
            }

            setActiveTab('images');
            showToast(`Selected image: ${imgAlt || 'Image'}`);

            // Visual flash feedback
            imgEl.style.outline = '4px solid #0019ff';
            setTimeout(() => {
              if (imgEl) imgEl.style.outline = '';
            }, 1000);
          }
        };

        iframeDoc.addEventListener('click', handleImageClick, true);

        return () => {
          if (imgStyleTag && imgStyleTag.parentNode) {
            imgStyleTag.parentNode.removeChild(imgStyleTag);
          }
          iframeDoc.removeEventListener('click', handleImageClick, true);
        };
      } else {
        if (imgStyleTag && imgStyleTag.parentNode) {
          imgStyleTag.parentNode.removeChild(imgStyleTag);
        }
      }
    } catch (e) {
      console.warn('Image mode setup caught:', e);
    }
  }, [imageModeActive, siteImages, iframeLoaded]);

  // Audio Mode: Visual cues on all audio playback triggers in iframe
  useEffect(() => {
    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (!iframeDoc) return;

      const styleId = 'live-edit-audio-mode-styles';
      let audioStyleTag = iframeDoc.getElementById(styleId);

      if (audioModeActive) {
        if (!audioStyleTag) {
          audioStyleTag = iframeDoc.createElement('style');
          audioStyleTag.id = styleId;
          iframeDoc.head.appendChild(audioStyleTag);
        }
        audioStyleTag.textContent = `
          .catalog-play-btn, .main-play, .track, .catalog-audio-track {
            outline: 2px dashed #16a34a !important;
            outline-offset: 3px !important;
            animation: liveAudioPulse 2s infinite ease-in-out !important;
          }
          @keyframes liveAudioPulse {
            0%, 100% { outline-color: #16a34a; }
            50% { outline-color: #4ade80; }
          }
        `;

        return () => {
          if (audioStyleTag && audioStyleTag.parentNode) {
            audioStyleTag.parentNode.removeChild(audioStyleTag);
          }
        };
      } else {
        if (audioStyleTag && audioStyleTag.parentNode) {
          audioStyleTag.parentNode.removeChild(audioStyleTag);
        }
      }
    } catch (e) {
      console.warn('Audio mode setup caught:', e);
    }
  }, [audioModeActive, iframeLoaded]);

  // Tag known images in preview iframe on load
  useEffect(() => {
    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (!iframeDoc) return;

      siteImages.forEach((img) => {
        if (img.selector) {
          try {
            const el = iframeDoc.querySelector(img.selector);
            if (el && img.id) {
              el.setAttribute('data-sanity-img-id', img.id);
            }
          } catch (e) {}
        }
      });
    } catch (e) {
      console.warn('Image tagging error:', e);
    }
  }, [iframeLoaded, siteImages]);

  // Live Synchronize Image Modifications to Preview Iframe DOM
  useEffect(() => {
    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (!iframeDoc) return;

      siteImages.forEach((img) => {
        let el = null;
        if (img.id) {
          try {
            el = iframeDoc.querySelector(`[data-sanity-img-id="${img.id}"]`);
          } catch (err) {}
        }
        if (!el && img.selector) {
          try {
            el = iframeDoc.querySelector(img.selector);
            if (el && img.id) {
              el.setAttribute('data-sanity-img-id', img.id);
            }
          } catch (err) {}
        }
        if (!el && img.originalSrc) {
          try {
            const cleanSrc = img.originalSrc.replace(/^(\.\/|\/)/, '');
            const candidates = iframeDoc.querySelectorAll(`img[src*="${cleanSrc}"]`);
            for (const cand of candidates) {
              const existingId = cand.getAttribute('data-sanity-img-id');
              if (!existingId || existingId === img.id) {
                el = cand;
                if (img.id) el.setAttribute('data-sanity-img-id', img.id);
                break;
              }
            }
          } catch (err) {}
        }

        if (el) {
          const isImageElement = el.tagName.toLowerCase() === 'img';
          const tileWrapper = isImageElement ? el.closest('.catalog-tile, .catalog-hero-img-wrap, .hero-photo, .hero-img') : null;

          if (img.isRemoved) {
            if (isImageElement) {
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('opacity', '0', 'important');
              if (tileWrapper) {
                tileWrapper.style.setProperty('display', 'none', 'important');
              }
            } else {
              el.style.setProperty('background-image', 'none', 'important');
            }
          } else {
            if (isImageElement) {
              el.style.removeProperty('display');
              el.style.removeProperty('visibility');
              el.style.removeProperty('opacity');
              if (tileWrapper) {
                tileWrapper.style.removeProperty('display');
              }
              if (el.src !== img.src && !el.src.endsWith(img.src)) {
                el.src = img.src;
              }
            } else {
              el.style.removeProperty('background-image');
              if (img.isReplaced || img.isSwapped) {
                el.style.setProperty('background-image', `url("${img.src}")`, 'important');
              }
            }
          }
        }
      });
    } catch (e) {
      console.warn('Live image sync error:', e);
    }
  }, [siteImages, iframeLoaded]);

  // Live Synchronize Audio Modifications to Preview Iframe DOM
  useEffect(() => {
    try {
      const iframeDoc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (!iframeDoc) return;

      audioItems.forEach((item) => {
        let btn = null;
        if (item.selector) {
          btn = iframeDoc.querySelector(item.selector);
        }
        if (!btn && item.originalAudioUrl) {
          btn = iframeDoc.querySelector(`[data-audio*="${item.originalAudioUrl.replace(/^(\.\/|\/)/, '')}"]`);
        }

        if (btn) {
          if (item.isRemoved) {
            btn.setAttribute('data-audio', '');
            btn.style.opacity = '0.35';
            btn.style.pointerEvents = 'none';
          } else {
            btn.setAttribute('data-audio', item.audioUrl);
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
          }
        }
      });
    } catch (e) {
      console.warn('Live audio sync error:', e);
    }
  }, [audioItems, iframeLoaded]);

  // Handle live text editing in the inspector textarea
  const handleInspectorTextChange = (newText) => {
    setSelectedElementText(newText);
    if (selectedNodeRef.current) {
      try {
        selectedNodeRef.current.innerText = newText;
      } catch (e) {
        console.warn('Could not update live text node:', e);
      }
    }

    // Smartly map inspected DOM element updates to the corresponding settings field
    const sel = (selectedElementSelector || '').toLowerCase();
    if (sel.includes('hero-title') || sel.includes('hero h1') || sel.includes('#hero-title')) {
      updateField('heroTitle', newText);
    } else if (sel.includes('hero-eyebrow') || sel.includes('.hero-eyebrow')) {
      updateField('heroEyebrow', newText);
    } else if (sel.includes('hero-copy-line1')) {
      updateField('heroLine1', newText);
    } else if (sel.includes('hero-copy-line2')) {
      updateField('heroLine2', newText);
    } else if (sel.includes('hero-cta') || sel.includes('.hero .btn')) {
      updateField('heroCtaText', newText);
    } else if (sel.includes('#beats-title') || sel.includes('.beats-section h2')) {
      updateField('showcaseTitle', newText);
    } else if (sel.includes('.beats-section .section-desc')) {
      updateField('showcaseDescription', newText);
    } else if (sel.includes('#process-title') || sel.includes('.process-section h2')) {
      updateField('processTitle', newText);
    } else if (sel.includes('#services-title') || sel.includes('.services-section h2')) {
      updateField('servicesTitle', newText);
    } else if (sel.includes('#delivery-title') || sel.includes('.delivery-section h2')) {
      updateField('deliveryTitle', newText);
    } else if (sel.includes('#contact-title') || sel.includes('.contact-section h2')) {
      updateField('contactTitle', newText);
    } else if (sel.includes('.contact-intro-lead')) {
      updateField('contactLead', newText);
    } else if (sel.includes('.contact-copyright')) {
      updateField('copyrightText', newText);
    } else if (sel.includes('.brand')) {
      updateField('siteBrand', newText);
    }
  };

  // Update a single style property on the inspected element in real-time
  const updateElementStyle = (property, value) => {
    setElementStyles((prev) => ({ ...prev, [property]: value }));

    if (selectedNodeRef.current) {
      try {
        const node = selectedNodeRef.current;
        switch (property) {
          case 'fontSize':
            node.style.fontSize = `${value}px`;
            break;
          case 'fontWeight':
            node.style.fontWeight = String(value);
            break;
          case 'textAlign':
            node.style.textAlign = value;
            break;
          case 'color':
            node.style.color = value;
            break;
          case 'backgroundColor':
            node.style.backgroundColor = value || 'transparent';
            break;
          case 'opacity':
            node.style.opacity = String(value / 100);
            break;
          case 'letterSpacing':
            node.style.letterSpacing = `${value}px`;
            break;
          case 'textTransform':
            node.style.textTransform = value;
            break;
          case 'borderRadius':
            node.style.borderRadius = `${value}px`;
            break;
          case 'boxShadow':
            node.style.boxShadow = value === 'none' ? '' : value;
            break;
          case 'padding':
            node.style.padding = `${value}px`;
            break;
          case 'margin':
            node.style.margin = `${value}px`;
            break;
          default:
            node.style[property] = value;
        }
      } catch (err) {
        console.warn('Could not apply style directly to element:', err);
      }
    }
  };

  // Reset a specific style property on the inspected element back to its initial value
  const resetElementProperty = (property) => {
    if (!initialElementState) return;

    if (property === 'text') {
      handleInspectorTextChange(initialElementState.text);
      showToast('Reverted element text content');
      return;
    }

    const initialVal = initialElementState[property];
    updateElementStyle(property, initialVal);
    showToast(`Reverted ${property} to original`);
  };

  // Reset all changes made to the currently inspected element
  const resetAllElementChanges = () => {
    if (!selectedNodeRef.current || !initialElementState) return;
    try {
      const node = selectedNodeRef.current;
      if (initialElementState.initialInlineStyle) {
        node.setAttribute('style', initialElementState.initialInlineStyle);
      } else {
        node.removeAttribute('style');
      }
      node.innerText = initialElementState.text;
      setSelectedElementText(initialElementState.text);
      setElementStyles({
        fontSize: initialElementState.fontSize,
        fontWeight: initialElementState.fontWeight,
        textAlign: initialElementState.textAlign,
        color: initialElementState.color,
        backgroundColor: initialElementState.backgroundColor,
        opacity: initialElementState.opacity,
        letterSpacing: initialElementState.letterSpacing,
        lineHeight: initialElementState.lineHeight,
        textTransform: initialElementState.textTransform,
        boxShadow: initialElementState.boxShadow,
        borderRadius: initialElementState.borderRadius,
        padding: initialElementState.padding,
        margin: initialElementState.margin,
      });
      showToast('Reset all element properties to original state');
    } catch (err) {
      console.warn('Reset element error:', err);
    }
  };

  // Check if an inspected element property is modified from initial
  const isElementPropModified = (prop) => {
    if (prop === 'text') return selectedElementText !== initialElementState.text;
    return elementStyles[prop] !== initialElementState[prop];
  };

  // Count modified properties on the inspected element
  const elementModifiedCount = useMemo(() => {
    const styleProps = ['fontSize', 'fontWeight', 'textAlign', 'color', 'backgroundColor', 'opacity', 'letterSpacing', 'textTransform', 'boxShadow', 'borderRadius', 'padding', 'margin'];
    let count = styleProps.filter((p) => elementStyles[p] !== initialElementState[p]).length;
    if (selectedElementText !== initialElementState.text) count++;
    return count;
  }, [elementStyles, initialElementState, selectedElementText]);

  // Handle track slot assignment change
  const handleAssignSlot = async (trackId, newSlot) => {
    showToast(`Updating track slot to ${newSlot}...`);
    try {
      const res = await patchSanityDocument(trackId, { assignedSlot: newSlot });
      if (res?._id) {
        setTracks((prev) =>
          prev.map((t) => (t._id === trackId ? { ...t, assignedSlot: newSlot } : t))
        );
        showToast('Track slot assignment committed to Sanity');
      }
    } catch (err) {
      console.error('Track slot update error:', err);
      showToast(`Failed to update track slot: ${err.message || 'API error'}`);
    }
  };

  // Save and commit all current settings to Sanity Content Lake database
  const handleSaveToSanity = async () => {
    setSyncing(true);
    try {
      // Execute explicit real mutations against Sanity Content Lake with authenticated token
      const commitResult = await commitSettingsToSanity(settings);

      // ONLY trigger success notification after confirming HTTP 200 / valid document IDs returned from Sanity API
      if (commitResult && commitResult.success) {
        try {
          localStorage.setItem('sanity_settings_cache', JSON.stringify(settings));
        } catch (e) {
          console.warn('LocalStorage save warning:', e);
        }

        // Re-apply live changes to iframe document
        applyLiveChangesToIframe();

        // Notify live preview iframe
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'SANITY_SAVED',
            timestamp: Date.now(),
            settings: settings,
          }, '*');
        }

        showToast('All changes successfully committed to Sanity Content Lake');
      } else {
        throw new Error('Sanity mutation did not return confirmation from server');
      }
    } catch (err) {
      console.error('Real Sanity database save error:', err);
      showToast(`Failed to commit changes to Sanity: ${err.message || 'Database error'}`);
    } finally {
      setSyncing(false);
    }
  };

  // Calculate modified counts for each general category
  const categoryModifiedCounts = useMemo(() => {
    return {
      hero: ['heroEyebrow', 'heroTitle', 'heroLine1', 'heroLine2', 'heroCtaText'].filter(isFieldModified).length,
      showcase: ['showcaseTitle', 'showcaseDescription'].filter(isFieldModified).length,
      process: ['processTitle', 'processTrustline', 'processClosingTitle', 'processClosingCopy'].filter(isFieldModified).length,
      services: ['servicesTitle', 'servicesDescription', 'customProductionPrice', 'mixingMasteringPrice', 'vocalTuningPrice', 'mp3Price', 'wavPrice', 'stemsPrice', 'exclusivePrice'].filter(isFieldModified).length,
      typography: ['displayFont', 'bodyFont', 'desktopHeroTitleSize', 'desktopH2Size', 'desktopBaseFontSize', 'mobileHeroTitleSize', 'mobileH2Size', 'mobileBaseFontSize', 'headingWeight'].filter(isFieldModified).length,
      layout: ['desktopPageGutter', 'desktopSectionPadding', 'desktopCardPadding', 'desktopCardGap', 'mobilePageGutter', 'mobileSectionPadding', 'mobileCardPadding', 'mobileCardGap'].filter(isFieldModified).length,
      brand: ['siteBrand', 'primarySignalColor', 'signalBrightColor', 'darkCanvasColor'].filter(isFieldModified).length,
      contact: ['contactTitle', 'contactLead', 'emailAddress', 'copyrightText'].filter(isFieldModified).length,
      audio: 0,
    };
  }, [isFieldModified]);

  // Current active spacing values for layout guide overlays
  const currentGutter = deviceView === 'desktop' ? settings.desktopPageGutter : settings.mobilePageGutter;
  const currentSectionPadding = deviceView === 'desktop' ? settings.desktopSectionPadding : settings.mobileSectionPadding;

  // Single Click View Toggle
  const handleViewToggleClick = () => {
    if (editScope !== 'device') {
      setEditScope('device');
      showToast(`Device Mode Active (${deviceView === 'desktop' ? 'Desktop' : 'Mobile'})`);
    } else {
      const nextView = deviceView === 'desktop' ? 'mobile' : 'desktop';
      setDeviceView(nextView);
      showToast(`Switched to ${nextView === 'desktop' ? 'Desktop View' : 'Mobile View (390px)'}`);
    }
  };

  // Universal Mode Button Click
  const handleUniversalClick = () => {
    setEditScope('universal');
    if (deviceView === 'mobile') {
      setDeviceView('desktop');
    }
    showToast('Universal Mode Active (Applies to Desktop & Mobile)');
  };

  // Interactive Draggable Layout Guides (Mirror-synced gutters, horizontal section paddings)
  useEffect(() => {
    if (!layoutDragState) return;

    const handleMouseMove = (e) => {
      if (!previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const isMobile = deviceView === 'mobile';
      const gutterField = isMobile ? 'mobilePageGutter' : 'desktopPageGutter';
      const secPaddingField = isMobile ? 'mobileSectionPadding' : 'desktopSectionPadding';

      if (layoutDragState === 'gutter-left') {
        const clientX = e.clientX;
        const newGutter = Math.round(Math.max(8, Math.min(rect.width / 2 - 24, clientX - rect.left)));
        updateField(gutterField, newGutter);
      } else if (layoutDragState === 'gutter-right') {
        const clientX = e.clientX;
        const newGutter = Math.round(Math.max(8, Math.min(rect.width / 2 - 24, rect.right - clientX)));
        updateField(gutterField, newGutter);
      } else if (layoutDragState === 'section-top') {
        const clientY = e.clientY;
        const newSec = Math.round(Math.max(16, Math.min(rect.height - 40, clientY - rect.top)));
        updateField(secPaddingField, newSec);
      } else if (layoutDragState === 'section-bottom') {
        const clientY = e.clientY;
        const newSec = Math.round(Math.max(16, Math.min(rect.height - 40, rect.bottom - clientY)));
        updateField(secPaddingField, newSec);
      }
    };

    const handleMouseUp = () => {
      setLayoutDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [layoutDragState, deviceView]);

  return (
    <div style={{
      background: '#f5f5f7',
      color: '#1e1e1e',
      height: 'calc(100vh - 54px)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 12,
      userSelect: 'none',
      overflow: 'hidden',
    }}>
      {/* TOAST NOTIFICATION */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#1e1e1e',
          color: '#ffffff',
          padding: '10px 16px',
          borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          fontWeight: 500,
          fontSize: 12,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0019ff' }} />
          {notification}
        </div>
      )}

      {/* TOP FIGMA-STYLE TOOLBAR */}
      <div style={{
        height: 48,
        minHeight: 48,
        background: '#ffffff',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 16px',
        zIndex: 50,
      }}>
        {/* Left: App Title + Quick Action Symbols */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#1e1e1e', fontSize: 13 }}>
            <span style={{ color: '#0019ff', display: 'flex' }}><Icons.Pencil /></span>
            <span>Live Edit</span>
          </div>

          <div style={{ width: 1, height: 18, background: '#e5e5e5' }} />

          {/* Layout Guides Overlay Toggle (Requirement 3: Off by default) */}
          <button
            onClick={() => {
              const next = !showLayoutGuides;
              setShowLayoutGuides(next);
              showToast(next ? 'Layout Guides: ON' : 'Layout Guides: OFF');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: showLayoutGuides ? '#e6edff' : '#f5f5f5',
              color: showLayoutGuides ? '#0019ff' : '#616161',
              border: showLayoutGuides ? '1px solid #b8ccff' : '1px solid transparent',
              padding: '5px 10px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title="Toggle visual layout alignment guides on website"
          >
            <Icons.Layout />
            <span>Layout</span>
            {showLayoutGuides && (
              <span style={{ fontSize: 10, background: '#0019ff', color: '#fff', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>
                ON
              </span>
            )}
          </button>

          {/* Text Edit Toggle (Requirement 3: Off by default) */}
          <button
            onClick={() => {
              const next = !inspectorActive;
              setInspectorActive(next);
              showToast(next ? 'Text Edit: ON (Click website element to inspect & edit)' : 'Text Edit: OFF');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: inspectorActive ? '#f3e8ff' : '#f5f5f5',
              color: inspectorActive ? '#7e22ce' : '#616161',
              border: inspectorActive ? '1px solid #e9d5ff' : '1px solid transparent',
              padding: '5px 10px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title="Click and edit any text or style directly on the live website"
          >
            <Icons.Pencil />
            <span>Text Edit</span>
            {inspectorActive && (
              <span style={{ fontSize: 10, background: '#7e22ce', color: '#fff', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>
                ON
              </span>
            )}
          </button>

          {/* Images Management Toggle Box */}
          <button
            onClick={() => {
              const next = !(imageModeActive || activeTab === 'images');
              setImageModeActive(next);
              if (next) {
                setAudioModeActive(false);
                setActiveTab('images');
                showToast('Images Mode: ON');
              } else {
                setActiveTab('general');
                showToast('Images Mode: OFF');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: (imageModeActive || activeTab === 'images') ? '#ecfdf5' : '#f5f5f5',
              color: (imageModeActive || activeTab === 'images') ? '#059669' : '#616161',
              border: (imageModeActive || activeTab === 'images') ? '1px solid #a7f3d0' : '1px solid transparent',
              padding: '5px 9px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title="Open Images management in full sidebar"
          >
            <Icons.Image />
            <span>Images</span>
          </button>

          {/* Audio Management Toggle Box */}
          <button
            onClick={() => {
              const next = !(audioModeActive || activeTab === 'audio');
              setAudioModeActive(next);
              if (next) {
                setImageModeActive(false);
                setActiveTab('audio');
                showToast('Audio Mode: ON');
              } else {
                setActiveTab('general');
                showToast('Audio Mode: OFF');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: (audioModeActive || activeTab === 'audio') ? '#eff6ff' : '#f5f5f5',
              color: (audioModeActive || activeTab === 'audio') ? '#0019ff' : '#616161',
              border: (audioModeActive || activeTab === 'audio') ? '1px solid #bfdbfe' : '1px solid transparent',
              padding: '5px 9px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title="Open Audio management in full sidebar"
          >
            <Icons.Audio />
            <span>Audio</span>
          </button>
        </div>

        {/* Center: Figma-style Segmented Mode & View Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: '#f5f5f5',
          padding: '3px',
          borderRadius: 7,
          border: '1px solid #e5e5e5',
        }}>
          {/* Universal Mode Button */}
          <button
            onClick={handleUniversalClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: editScope === 'universal' ? '#ffffff' : 'transparent',
              color: editScope === 'universal' ? '#0019ff' : '#757575',
              border: editScope === 'universal' ? '1px solid #e0e0e0' : '1px solid transparent',
              boxShadow: editScope === 'universal' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              padding: '5px 12px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: editScope === 'universal' ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title="Universal Mode: Changes update text, padding, font styles and colors globally for both mobile and desktop"
          >
            <Icons.Globe />
            <span>Universal</span>
            {editScope === 'universal' && (
              <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: '#0019ff' }} />
            )}
          </button>

          {/* Single View Change Button */}
          <button
            onClick={handleViewToggleClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: editScope === 'device' ? '#ffffff' : 'transparent',
              color: editScope === 'device' ? '#1e1e1e' : '#757575',
              border: editScope === 'device' ? '1px solid #e0e0e0' : '1px solid transparent',
              boxShadow: editScope === 'device' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              padding: '5px 12px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: editScope === 'device' ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title={`Click to switch between Desktop and Mobile views. Currently: ${deviceView === 'desktop' ? 'Desktop' : 'Mobile'}`}
          >
            {deviceView === 'desktop' ? <Icons.Desktop /> : <Icons.Mobile />}
            <span>{deviceView === 'desktop' ? 'Desktop View' : 'Mobile View'}</span>
            <span style={{
              fontSize: 10,
              color: editScope === 'device' ? '#0019ff' : '#8c8c8c',
              background: editScope === 'device' ? '#e6edff' : 'transparent',
              padding: '1px 4px',
              borderRadius: 3,
              fontWeight: 600,
            }}>
              {deviceView === 'desktop' ? '100%' : '390px'}
            </span>
          </button>
        </div>

        {/* Right: Save & Commit Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleSaveToSanity}
            disabled={syncing}
            style={{
              background: '#0019ff',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 600,
              cursor: syncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 4px rgba(0, 25, 255, 0.3)',
              transition: 'all 0.12s ease',
              opacity: syncing ? 0.7 : 1,
            }}
          >
            <Icons.Save />
            <span>{syncing ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA: FIGMA-STYLE SIDEBAR + LIVE PREVIEW */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* LEFT FIGMA-STYLE SIDEBAR */}
        <div style={{
          width: 390,
          minWidth: 390,
          maxWidth: 390,
          background: '#f8fafc',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          zIndex: 20,
        }}>
          {/* FIGMA-STYLE TAB HEADER (Design vs Inspect) - Only shown in Design/Inspect modes */}
          {(activeTab === 'general' || activeTab === 'inspector') && (
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              {/* Tab pill group: [Design] / [Inspect] */}
              <div style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '2px 3px',
                borderRadius: 6,
                gap: 2,
                alignItems: 'center',
                border: '1px solid transparent',
              }}>
                <button
                  onClick={() => setActiveTab('general')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 5,
                    border: 'none',
                    background: activeTab === 'general' ? '#ffffff' : 'transparent',
                    color: activeTab === 'general' ? '#0f172a' : '#64748b',
                    fontWeight: activeTab === 'general' ? 600 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    boxShadow: activeTab === 'general' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.12s ease',
                  }}
                >
                  Design
                </button>

                <button
                  onClick={() => setActiveTab('inspector')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 5,
                    border: 'none',
                    background: activeTab === 'inspector' ? '#ffffff' : 'transparent',
                    color: activeTab === 'inspector' ? '#0f172a' : '#64748b',
                    fontWeight: activeTab === 'inspector' ? 600 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    boxShadow: activeTab === 'inspector' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span>Inspect</span>
                  {elementModifiedCount > 0 ? (
                    <span style={{ fontSize: 9.5, fontWeight: 700, background: '#0019ff', color: '#fff', padding: '0.5px 4px', borderRadius: 8 }}>
                      {elementModifiedCount}
                    </span>
                  ) : selectedElementTag ? (
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#0019ff' }} />
                  ) : null}
                </button>
              </div>

              {/* Top Right Header Controls */}
              {activeTab === 'general' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {Object.values(categoryModifiedCounts).reduce((a, b) => a + b, 0) > 0 && (
                    <>
                      <button
                        onClick={resetAllGeneralSettings}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '3px 7px',
                          borderRadius: 5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                        title="Reset all design settings to default"
                      >
                        <Icons.Reset />
                        <span>Reset All</span>
                      </button>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                    </>
                  )}
                  <button
                    onClick={() => toggleAllCategories(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '3px 6px',
                      borderRadius: 4,
                    }}
                    title="Expand all sections"
                  >
                    Expand all
                  </button>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <button
                    onClick={() => toggleAllCategories(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '3px 6px',
                      borderRadius: 4,
                    }}
                    title="Collapse all sections"
                  >
                    Collapse
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* COLUMN 1: GENERAL PAGE SETTINGS WITH FIGMA ACCORDIONS */}
          {activeTab === 'general' && (
            <div style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '14px 14px 90px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxSizing: 'border-box',
              WebkitOverflowScrolling: 'touch',
            }}>
              {/* Compact Scope Info Indicator */}
              <div style={{
                background: editScope === 'universal' ? '#f0f7ff' : '#fffbeb',
                border: editScope === 'universal' ? '1px solid #d4e8ff' : '1px solid #fed7aa',
                padding: '4px 8px',
                borderRadius: 5,
                fontSize: 11,
                color: editScope === 'universal' ? '#0369a1' : '#9a3412',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: editScope === 'universal' ? '#0284c7' : '#ea580c', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 11, color: editScope === 'universal' ? '#0369a1' : '#92400e' }}>
                    {editScope === 'universal' ? 'Universal Mode' : `${deviceView === 'desktop' ? 'Desktop' : 'Mobile'} Only`}
                  </span>
                  <span style={{ color: editScope === 'universal' ? '#64748b' : '#78716c', fontSize: 10.5 }}>
                    {editScope === 'universal' ? '• Global Sync' : `• ${deviceView}`}
                  </span>
                </div>
              </div>

              {/* 1. HERO SECTION */}
              <FigmaSection
                title="Hero Section"
                icon={<Icons.Pencil />}
                isCollapsed={collapsedCategories.hero}
                onToggle={() => toggleCategory('hero')}
                modifiedCount={categoryModifiedCounts.hero}
                onResetSection={() => resetCategory('hero')}
              >
                <FigmaInput
                  label="Eyebrow Tagline"
                  value={settings.heroEyebrow}
                  onChange={(v) => updateField('heroEyebrow', v)}
                  isModified={isFieldModified('heroEyebrow')}
                  onReset={() => resetField('heroEyebrow')}
                />
                <FigmaInput
                  label="Main Headline (H1)"
                  value={settings.heroTitle}
                  onChange={(v) => updateField('heroTitle', v)}
                  isModified={isFieldModified('heroTitle')}
                  onReset={() => resetField('heroTitle')}
                />
                <FigmaInput
                  label="Subtitle Line 1"
                  value={settings.heroLine1}
                  onChange={(v) => updateField('heroLine1', v)}
                  isModified={isFieldModified('heroLine1')}
                  onReset={() => resetField('heroLine1')}
                />
                <FigmaInput
                  label="Subtitle Line 2"
                  value={settings.heroLine2}
                  onChange={(v) => updateField('heroLine2', v)}
                  isModified={isFieldModified('heroLine2')}
                  onReset={() => resetField('heroLine2')}
                />
                <FigmaInput
                  label="CTA Button Text"
                  value={settings.heroCtaText}
                  onChange={(v) => updateField('heroCtaText', v)}
                  isModified={isFieldModified('heroCtaText')}
                  onReset={() => resetField('heroCtaText')}
                />
              </FigmaSection>

              {/* 2. SHOWCASE / THE WORK */}
              <FigmaSection
                title="Showcase & Tracks"
                icon={<Icons.Audio />}
                isCollapsed={collapsedCategories.showcase}
                onToggle={() => toggleCategory('showcase')}
                modifiedCount={categoryModifiedCounts.showcase}
                onResetSection={() => resetCategory('showcase')}
              >
                <FigmaInput
                  label="Section Title (H2)"
                  value={settings.showcaseTitle}
                  onChange={(v) => updateField('showcaseTitle', v)}
                  isModified={isFieldModified('showcaseTitle')}
                  onReset={() => resetField('showcaseTitle')}
                />
                <FigmaTextarea
                  label="Section Subtitle"
                  value={settings.showcaseDescription}
                  onChange={(v) => updateField('showcaseDescription', v)}
                  isModified={isFieldModified('showcaseDescription')}
                  onReset={() => resetField('showcaseDescription')}
                />
              </FigmaSection>

              {/* 3. PROCESS & TRUST */}
              <FigmaSection
                title="Process & Statements"
                icon={<Icons.Layers />}
                isCollapsed={collapsedCategories.process}
                onToggle={() => toggleCategory('process')}
                modifiedCount={categoryModifiedCounts.process}
                onResetSection={() => resetCategory('process')}
              >
                <FigmaInput
                  label="Process Title (H2)"
                  value={settings.processTitle}
                  onChange={(v) => updateField('processTitle', v)}
                  isModified={isFieldModified('processTitle')}
                  onReset={() => resetField('processTitle')}
                />
                <FigmaInput
                  label="Trustline Tag"
                  value={settings.processTrustline}
                  onChange={(v) => updateField('processTrustline', v)}
                  isModified={isFieldModified('processTrustline')}
                  onReset={() => resetField('processTrustline')}
                />
                <FigmaInput
                  label="Closing Statement Heading"
                  value={settings.processClosingTitle}
                  onChange={(v) => updateField('processClosingTitle', v)}
                  isModified={isFieldModified('processClosingTitle')}
                  onReset={() => resetField('processClosingTitle')}
                />
                <FigmaTextarea
                  label="Closing Description"
                  value={settings.processClosingCopy}
                  onChange={(v) => updateField('processClosingCopy', v)}
                  isModified={isFieldModified('processClosingCopy')}
                  onReset={() => resetField('processClosingCopy')}
                />
              </FigmaSection>

              {/* 4. SERVICES & PRICING */}
              <FigmaSection
                title="Services & Pricing"
                icon={<Icons.Settings />}
                isCollapsed={collapsedCategories.services}
                onToggle={() => toggleCategory('services')}
                modifiedCount={categoryModifiedCounts.services}
                onResetSection={() => resetCategory('services')}
              >
                <FigmaInput
                  label="Services Title (H2)"
                  value={settings.servicesTitle}
                  onChange={(v) => updateField('servicesTitle', v)}
                  isModified={isFieldModified('servicesTitle')}
                  onReset={() => resetField('servicesTitle')}
                />
                <FigmaTextarea
                  label="Services Description"
                  value={settings.servicesDescription}
                  onChange={(v) => updateField('servicesDescription', v)}
                  isModified={isFieldModified('servicesDescription')}
                  onReset={() => resetField('servicesDescription')}
                />

                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '7px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginTop: 6,
                }}>
                  Beat Licenses ($ USD)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <FigmaNumber
                    label="MP3 Lease"
                    prefix="$"
                    value={settings.mp3Price}
                    onChange={(v) => updateField('mp3Price', v)}
                    isModified={isFieldModified('mp3Price')}
                    onReset={() => resetField('mp3Price')}
                  />
                  <FigmaNumber
                    label="WAV Lease"
                    prefix="$"
                    value={settings.wavPrice}
                    onChange={(v) => updateField('wavPrice', v)}
                    isModified={isFieldModified('wavPrice')}
                    onReset={() => resetField('wavPrice')}
                  />
                  <FigmaNumber
                    label="Stems Trackout"
                    prefix="$"
                    value={settings.stemsPrice}
                    onChange={(v) => updateField('stemsPrice', v)}
                    isModified={isFieldModified('stemsPrice')}
                    onReset={() => resetField('stemsPrice')}
                  />
                  <FigmaNumber
                    label="Exclusive"
                    prefix="$"
                    value={settings.exclusivePrice}
                    onChange={(v) => updateField('exclusivePrice', v)}
                    isModified={isFieldModified('exclusivePrice')}
                    onReset={() => resetField('exclusivePrice')}
                  />
                </div>

                <div style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '7px 10px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginTop: 8,
                }}>
                  Studio Engineering ($ USD)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <FigmaNumber
                    label="Production"
                    prefix="$"
                    value={settings.customProductionPrice}
                    onChange={(v) => updateField('customProductionPrice', v)}
                    isModified={isFieldModified('customProductionPrice')}
                    onReset={() => resetField('customProductionPrice')}
                  />
                  <FigmaNumber
                    label="Mix & Master"
                    prefix="$"
                    value={settings.mixingMasteringPrice}
                    onChange={(v) => updateField('mixingMasteringPrice', v)}
                    isModified={isFieldModified('mixingMasteringPrice')}
                    onReset={() => resetField('mixingMasteringPrice')}
                  />
                  <FigmaNumber
                    label="Vocal Tuning"
                    prefix="$"
                    value={settings.vocalTuningPrice}
                    onChange={(v) => updateField('vocalTuningPrice', v)}
                    isModified={isFieldModified('vocalTuningPrice')}
                    onReset={() => resetField('vocalTuningPrice')}
                  />
                </div>
              </FigmaSection>

              {/* 5. TYPOGRAPHY & FONTS */}
              <FigmaSection
                title="Typography"
                icon={<Icons.Type />}
                isCollapsed={collapsedCategories.typography}
                onToggle={() => toggleCategory('typography')}
                modifiedCount={categoryModifiedCounts.typography}
                onResetSection={() => resetCategory('typography')}
              >
                <FigmaSelect
                  label="Display Font"
                  value={settings.displayFont}
                  options={[
                    { label: 'Dela Gothic One (Bold Brutalist)', value: 'Dela Gothic One' },
                    { label: 'Work Sans (Refined Modern)', value: 'Work Sans' },
                    { label: 'DM Sans (Geometric Clean)', value: 'DM Sans' },
                    { label: 'System Default', value: 'system-ui' },
                  ]}
                  onChange={(v) => updateField('displayFont', v)}
                  isModified={isFieldModified('displayFont')}
                  onReset={() => resetField('displayFont')}
                />

                <FigmaSelect
                  label="Body Font"
                  value={settings.bodyFont}
                  options={[
                    { label: 'DM Sans (Standard)', value: 'DM Sans' },
                    { label: 'Work Sans (Editorial)', value: 'Work Sans' },
                    { label: 'System Sans', value: '-apple-system, sans-serif' },
                  ]}
                  onChange={(v) => updateField('bodyFont', v)}
                  isModified={isFieldModified('bodyFont')}
                  onReset={() => resetField('bodyFont')}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <FigmaSlider
                    label="Desktop Hero Title"
                    value={settings.desktopHeroTitleSize}
                    min={3}
                    max={16}
                    step={0.5}
                    unit="rem"
                    onChange={(v) => updateField('desktopHeroTitleSize', v)}
                    isModified={isFieldModified('desktopHeroTitleSize')}
                    onReset={() => resetField('desktopHeroTitleSize')}
                  />
                  <FigmaSlider
                    label="Mobile Hero Title"
                    value={settings.mobileHeroTitleSize}
                    min={2}
                    max={8}
                    step={0.5}
                    unit="rem"
                    onChange={(v) => updateField('mobileHeroTitleSize', v)}
                    isModified={isFieldModified('mobileHeroTitleSize')}
                    onReset={() => resetField('mobileHeroTitleSize')}
                  />
                </div>

                <FigmaSlider
                  label="Base Body Font Size"
                  value={deviceView === 'desktop' ? settings.desktopBaseFontSize : settings.mobileBaseFontSize}
                  min={12}
                  max={24}
                  step={1}
                  unit="px"
                  onChange={(v) => {
                    if (editScope === 'universal' || deviceView === 'desktop') updateField('desktopBaseFontSize', v);
                    if (editScope === 'universal' || deviceView === 'mobile') updateField('mobileBaseFontSize', v);
                  }}
                  isModified={isFieldModified(deviceView === 'desktop' ? 'desktopBaseFontSize' : 'mobileBaseFontSize')}
                  onReset={() => resetField(deviceView === 'desktop' ? 'desktopBaseFontSize' : 'mobileBaseFontSize')}
                />
              </FigmaSection>

              {/* 6. LAYOUT & SPACING */}
              <FigmaSection
                title="Layout & Spacing"
                icon={<Icons.Layout />}
                isCollapsed={collapsedCategories.layout}
                onToggle={() => toggleCategory('layout')}
                modifiedCount={categoryModifiedCounts.layout}
                onResetSection={() => resetCategory('layout')}
              >
                <FigmaSlider
                  label="Page Gutter / Margin"
                  value={deviceView === 'desktop' ? settings.desktopPageGutter : settings.mobilePageGutter}
                  min={10}
                  max={120}
                  step={2}
                  unit="px"
                  onChange={(v) => {
                    if (editScope === 'universal' || deviceView === 'desktop') updateField('desktopPageGutter', v);
                    if (editScope === 'universal' || deviceView === 'mobile') updateField('mobilePageGutter', v);
                  }}
                  isModified={isFieldModified(deviceView === 'desktop' ? 'desktopPageGutter' : 'mobilePageGutter')}
                  onReset={() => resetField(deviceView === 'desktop' ? 'desktopPageGutter' : 'mobilePageGutter')}
                />

                <FigmaSlider
                  label="Section Vertical Padding"
                  value={deviceView === 'desktop' ? settings.desktopSectionPadding : settings.mobileSectionPadding}
                  min={24}
                  max={240}
                  step={4}
                  unit="px"
                  onChange={(v) => {
                    if (editScope === 'universal' || deviceView === 'desktop') updateField('desktopSectionPadding', v);
                    if (editScope === 'universal' || deviceView === 'mobile') updateField('mobileSectionPadding', v);
                  }}
                  isModified={isFieldModified(deviceView === 'desktop' ? 'desktopSectionPadding' : 'mobileSectionPadding')}
                  onReset={() => resetField(deviceView === 'desktop' ? 'desktopSectionPadding' : 'mobileSectionPadding')}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <FigmaSlider
                    label="Card Padding"
                    value={deviceView === 'desktop' ? settings.desktopCardPadding : settings.mobileCardPadding}
                    min={10}
                    max={60}
                    step={2}
                    unit="px"
                    onChange={(v) => {
                      if (editScope === 'universal' || deviceView === 'desktop') updateField('desktopCardPadding', v);
                      if (editScope === 'universal' || deviceView === 'mobile') updateField('mobileCardPadding', v);
                    }}
                    isModified={isFieldModified(deviceView === 'desktop' ? 'desktopCardPadding' : 'mobileCardPadding')}
                    onReset={() => resetField(deviceView === 'desktop' ? 'desktopCardPadding' : 'mobileCardPadding')}
                  />
                  <FigmaSlider
                    label="Card Gap"
                    value={deviceView === 'desktop' ? settings.desktopCardGap : settings.mobileCardGap}
                    min={8}
                    max={48}
                    step={2}
                    unit="px"
                    onChange={(v) => {
                      if (editScope === 'universal' || deviceView === 'desktop') updateField('desktopCardGap', v);
                      if (editScope === 'universal' || deviceView === 'mobile') updateField('mobileCardGap', v);
                    }}
                    isModified={isFieldModified(deviceView === 'desktop' ? 'desktopCardGap' : 'mobileCardGap')}
                    onReset={() => resetField(deviceView === 'desktop' ? 'desktopCardGap' : 'mobileCardGap')}
                  />
                </div>
              </FigmaSection>

              {/* 7. BRANDING & THEME COLORS */}
              <FigmaSection
                title="Brand & Appearance"
                icon={<Icons.Palette />}
                isCollapsed={collapsedCategories.brand}
                onToggle={() => toggleCategory('brand')}
                modifiedCount={categoryModifiedCounts.brand}
                onResetSection={() => resetCategory('brand')}
              >
                <FigmaInput
                  label="Brand Name"
                  value={settings.siteBrand}
                  onChange={(v) => updateField('siteBrand', v)}
                  isModified={isFieldModified('siteBrand')}
                  onReset={() => resetField('siteBrand')}
                />

                <FigmaColorPicker
                  label="Primary Accent"
                  value={settings.primarySignalColor}
                  onChange={(v) => updateField('primarySignalColor', v)}
                  isModified={isFieldModified('primarySignalColor')}
                  onReset={() => resetField('primarySignalColor')}
                />

                <FigmaColorPicker
                  label="Bright Highlight"
                  value={settings.signalBrightColor}
                  onChange={(v) => updateField('signalBrightColor', v)}
                  isModified={isFieldModified('signalBrightColor')}
                  onReset={() => resetField('signalBrightColor')}
                />

                <FigmaColorPicker
                  label="Dark Canvas"
                  value={settings.darkCanvasColor}
                  onChange={(v) => updateField('darkCanvasColor', v)}
                  isModified={isFieldModified('darkCanvasColor')}
                  onReset={() => resetField('darkCanvasColor')}
                />
              </FigmaSection>

              {/* 8. CONTACT & FOOTER */}
              <FigmaSection
                title="Contact & Footer"
                icon={<Icons.Settings />}
                isCollapsed={collapsedCategories.contact}
                onToggle={() => toggleCategory('contact')}
                modifiedCount={categoryModifiedCounts.contact}
                onResetSection={() => resetCategory('contact')}
              >
                <FigmaInput
                  label="Contact Title (H2)"
                  value={settings.contactTitle}
                  onChange={(v) => updateField('contactTitle', v)}
                  isModified={isFieldModified('contactTitle')}
                  onReset={() => resetField('contactTitle')}
                />
                <FigmaInput
                  label="Contact Subtitle"
                  value={settings.contactLead}
                  onChange={(v) => updateField('contactLead', v)}
                  isModified={isFieldModified('contactLead')}
                  onReset={() => resetField('contactLead')}
                />
                <FigmaInput
                  label="Contact Email"
                  value={settings.emailAddress}
                  onChange={(v) => updateField('emailAddress', v)}
                  isModified={isFieldModified('emailAddress')}
                  onReset={() => resetField('emailAddress')}
                />
                <FigmaInput
                  label="Copyright Text"
                  value={settings.copyrightText}
                  onChange={(v) => updateField('copyrightText', v)}
                  isModified={isFieldModified('copyrightText')}
                  onReset={() => resetField('copyrightText')}
                />
              </FigmaSection>
            </div>
          )}

          {/* COLUMN 2: FULLY FEATURED ELEMENT INSPECTOR */}
          {activeTab === 'inspector' && (
            <div style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '14px 14px 90px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxSizing: 'border-box',
              WebkitOverflowScrolling: 'touch',
            }}>
              {selectedElementTag ? (
                <>
                  {/* Selected Element Header & Reset All Bar */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                          Inspected Target
                        </span>
                        {elementModifiedCount > 0 && (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}>
                            {elementModifiedCount} modified
                          </span>
                        )}
                      </div>

                      {elementModifiedCount > 0 && (
                        <button
                          onClick={resetAllElementChanges}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: 5,
                            padding: '3px 8px',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Revert all styles and text on this element back to original"
                        >
                          <Icons.Reset />
                          <span>Reset All</span>
                        </button>
                      )}
                    </div>

                    <div style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: '#0f172a',
                      fontFamily: 'monospace',
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1.5px solid #e2e8f0',
                      wordBreak: 'break-all',
                    }}>
                      {selectedElementSelector || `<${selectedElementTag}>`}
                    </div>
                  </div>

                  {/* 1. LIVE TEXT CONTENT */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Text Content
                      </span>
                      {isElementPropModified('text') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 3 }}>
                            Modified
                          </span>
                          <button
                            onClick={() => resetElementProperty('text')}
                            title="Reset text to original"
                            style={{ background: 'transparent', border: 'none', color: '#8c8c8c', cursor: 'pointer', padding: 0 }}
                          >
                            <Icons.Reset />
                          </button>
                        </div>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={selectedElementText}
                      onChange={(e) => handleInspectorTextChange(e.target.value)}
                      placeholder="Type text directly..."
                      style={{
                        width: '100%',
                        background: isElementPropModified('text') ? '#fffbeb' : '#f8fafc',
                        color: '#0f172a',
                        border: isElementPropModified('text') ? '1.5px solid #f59e0b' : '1.5px solid #cbd5e1',
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: 1.45,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* 2. TYPOGRAPHY (Size, Weight, Alignment, Letter Spacing) */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                      Typography
                    </div>

                    {/* Font Size */}
                    <FigmaSlider
                      label="Font Size"
                      value={elementStyles.fontSize}
                      min={10}
                      max={120}
                      step={1}
                      unit="px"
                      onChange={(v) => updateElementStyle('fontSize', v)}
                      isModified={isElementPropModified('fontSize')}
                      onReset={() => resetElementProperty('fontSize')}
                    />

                    {/* Font Weight */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Font Weight</span>
                        {isElementPropModified('fontWeight') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 3 }}>
                              Modified
                            </span>
                            <button
                              onClick={() => resetElementProperty('fontWeight')}
                              style={{ background: 'transparent', border: 'none', color: '#8c8c8c', cursor: 'pointer', padding: 0 }}
                            >
                              <Icons.Reset />
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                        {[
                          { label: '400', val: '400' },
                          { label: '500', val: '500' },
                          { label: '700', val: '700' },
                          { label: '900', val: '900' },
                        ].map((w) => (
                          <button
                            key={w.val}
                            onClick={() => updateElementStyle('fontWeight', w.val)}
                            style={{
                              padding: '7px 0',
                              fontSize: 12,
                              fontWeight: w.val === String(elementStyles.fontWeight) ? 700 : 500,
                              borderRadius: 6,
                              border: w.val === String(elementStyles.fontWeight) ? '1.5px solid #0019ff' : '1.5px solid #cbd5e1',
                              background: w.val === String(elementStyles.fontWeight) ? '#e6edff' : '#f8fafc',
                              color: w.val === String(elementStyles.fontWeight) ? '#0019ff' : '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            {w.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Text Alignment (Figma Icons Row) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Text Alignment</span>
                        {isElementPropModified('textAlign') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 3 }}>
                              Modified
                            </span>
                            <button
                              onClick={() => resetElementProperty('textAlign')}
                              style={{ background: 'transparent', border: 'none', color: '#8c8c8c', cursor: 'pointer', padding: 0 }}
                            >
                              <Icons.Reset />
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{
                        display: 'flex',
                        background: '#f1f5f9',
                        padding: '3px',
                        borderRadius: 8,
                        border: '1.5px solid #e2e8f0',
                        gap: 3,
                      }}>
                        {[
                          { id: 'left', icon: <Icons.AlignLeft />, title: 'Align Left' },
                          { id: 'center', icon: <Icons.AlignCenter />, title: 'Align Center' },
                          { id: 'right', icon: <Icons.AlignRight />, title: 'Align Right' },
                          { id: 'justify', icon: <Icons.AlignJustify />, title: 'Justify' },
                        ].map((align) => (
                          <button
                            key={align.id}
                            onClick={() => updateElementStyle('textAlign', align.id)}
                            title={align.title}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px 0',
                              border: 'none',
                              borderRadius: 6,
                              background: elementStyles.textAlign === align.id ? '#ffffff' : 'transparent',
                              color: elementStyles.textAlign === align.id ? '#0019ff' : '#64748b',
                              boxShadow: elementStyles.textAlign === align.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {align.icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Letter Spacing */}
                    <FigmaSlider
                      label="Letter Spacing"
                      value={elementStyles.letterSpacing}
                      min={-4}
                      max={12}
                      step={0.5}
                      unit="px"
                      onChange={(v) => updateElementStyle('letterSpacing', v)}
                      isModified={isElementPropModified('letterSpacing')}
                      onReset={() => resetElementProperty('letterSpacing')}
                    />

                    {/* Text Transform */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Text Transform</span>
                        {isElementPropModified('textTransform') && (
                          <button
                            onClick={() => resetElementProperty('textTransform')}
                            style={{ background: 'transparent', border: 'none', color: '#8c8c8c', cursor: 'pointer', padding: 0 }}
                          >
                            <Icons.Reset />
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                        {[
                          { label: 'None', val: 'none' },
                          { label: 'UPPER', val: 'uppercase' },
                          { label: 'lower', val: 'lowercase' },
                          { label: 'Title', val: 'capitalize' },
                        ].map((t) => (
                          <button
                            key={t.val}
                            onClick={() => updateElementStyle('textTransform', t.val)}
                            style={{
                              padding: '6px 0',
                              fontSize: 11.5,
                              fontWeight: elementStyles.textTransform === t.val ? 700 : 500,
                              borderRadius: 6,
                              border: elementStyles.textTransform === t.val ? '1.5px solid #0019ff' : '1.5px solid #cbd5e1',
                              background: elementStyles.textTransform === t.val ? '#e6edff' : '#f8fafc',
                              color: elementStyles.textTransform === t.val ? '#0019ff' : '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. COLOR & APPEARANCE */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                      Appearance & Colors
                    </div>

                    {/* Text Color */}
                    <FigmaColorPicker
                      label="Text Color"
                      value={elementStyles.color}
                      onChange={(v) => updateElementStyle('color', v)}
                      isModified={isElementPropModified('color')}
                      onReset={() => resetElementProperty('color')}
                    />

                    {/* Background Color */}
                    <FigmaColorPicker
                      label="Background Fill"
                      value={elementStyles.backgroundColor}
                      onChange={(v) => updateElementStyle('backgroundColor', v)}
                      isModified={isElementPropModified('backgroundColor')}
                      onReset={() => resetElementProperty('backgroundColor')}
                    />

                    {/* Opacity */}
                    <FigmaSlider
                      label="Opacity"
                      value={elementStyles.opacity}
                      min={0}
                      max={100}
                      step={5}
                      unit="%"
                      onChange={(v) => updateElementStyle('opacity', v)}
                      isModified={isElementPropModified('opacity')}
                      onReset={() => resetElementProperty('opacity')}
                    />

                    {/* Corner Radius */}
                    <FigmaSlider
                      label="Corner Radius"
                      value={elementStyles.borderRadius}
                      min={0}
                      max={40}
                      step={1}
                      unit="px"
                      onChange={(v) => updateElementStyle('borderRadius', v)}
                      isModified={isElementPropModified('borderRadius')}
                      onReset={() => resetElementProperty('borderRadius')}
                    />

                    {/* Box Shadow Selector */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Shadow Effect</span>
                        {isElementPropModified('boxShadow') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 3 }}>
                              Modified
                            </span>
                            <button
                              onClick={() => resetElementProperty('boxShadow')}
                              style={{ background: 'transparent', border: 'none', color: '#8c8c8c', cursor: 'pointer', padding: 0 }}
                            >
                              <Icons.Reset />
                            </button>
                          </div>
                        )}
                      </div>
                      <select
                        value={elementStyles.boxShadow}
                        onChange={(e) => updateElementStyle('boxShadow', e.target.value)}
                        style={{
                          width: '100%',
                          background: isElementPropModified('boxShadow') ? '#fffbeb' : '#f8fafc',
                          color: '#0f172a',
                          border: isElementPropModified('boxShadow') ? '1.5px solid #f59e0b' : '1.5px solid #cbd5e1',
                          padding: '9px 12px',
                          borderRadius: 8,
                          fontSize: 13,
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="none">None (Flat)</option>
                        <option value="0 4px 12px rgba(0, 0, 0, 0.25)">Subtle Drop Shadow</option>
                        <option value="0 10px 30px rgba(0, 0, 0, 0.45)">Deep Elevation</option>
                        <option value="0 0 25px rgba(108, 99, 229, 0.45)">Purple Neon Glow</option>
                        <option value="0 0 25px rgba(0, 25, 255, 0.5)">Blue Signal Glow</option>
                      </select>
                    </div>
                  </div>

                  {/* 4. BOX MODEL SPACING (Padding & Margin) */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                      Box Model Spacing
                    </div>

                    <FigmaSlider
                      label="Inner Padding"
                      value={elementStyles.padding}
                      min={0}
                      max={60}
                      step={2}
                      unit="px"
                      onChange={(v) => updateElementStyle('padding', v)}
                      isModified={isElementPropModified('padding')}
                      onReset={() => resetElementProperty('padding')}
                    />

                    <FigmaSlider
                      label="Outer Margin"
                      value={elementStyles.margin}
                      min={0}
                      max={60}
                      step={2}
                      unit="px"
                      onChange={(v) => updateElementStyle('margin', v)}
                      isModified={isElementPropModified('margin')}
                      onReset={() => resetElementProperty('margin')}
                    />
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '50px 16px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: '#0019ff' }}>
                    <Icons.Inspector />
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>No Element Selected</div>
                  <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, maxWidth: 260 }}>
                    Click any headline, paragraph, card, or button directly on the website preview to inspect, edit typography, alignment, colors, shadows, and reset modifications.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COLUMN 3: IMAGES MANAGEMENT PANEL */}
          {activeTab === 'images' && (
            <ImagesPanel
              siteImages={siteImages}
              selectedImage={selectedImage}
              onSelectImage={handleSelectImage}
              onRemoveImage={handleRemoveImage}
              onRestoreImage={handleRestoreImage}
              onReplaceImage={handleReplaceImage}
              onSwapImage={handleSwapImage}
              onResetImage={handleResetImage}
              onResetAllImages={handleResetAllImages}
              onFocusImage={handleFocusImageOnPage}
              imageModeActive={imageModeActive}
              onToggleImageMode={() => {
                const next = !imageModeActive;
                setImageModeActive(next);
                if (next) {
                  setActiveTab('images');
                  showToast('Images Mode: ON');
                } else {
                  setActiveTab('general');
                  showToast('Images Mode: OFF');
                }
              }}
              onClose={() => {
                setImageModeActive(false);
                setActiveTab('general');
                showToast('Images Mode: OFF');
              }}
              onBackToDesign={() => {
                setImageModeActive(false);
                setActiveTab('general');
                showToast('Images Mode: OFF');
              }}
              showToast={showToast}
            />
          )}

          {/* COLUMN 4: CATEGORIZED RAW AUDIO LIBRARY PANEL */}
          {activeTab === 'audio' && (
            <AudioPanel
              audioItems={audioItems}
              onRemoveAudio={handleRemoveAudio}
              onRestoreAudio={handleRestoreAudio}
              onReplaceAudio={handleReplaceAudio}
              onSwapAudio={handleSwapAudio}
              onResetAudio={handleResetAudio}
              onResetAllAudio={handleResetAllAudio}
              onAddNewAudio={handleAddNewAudio}
              audioModeActive={audioModeActive}
              onToggleAudioMode={() => {
                const next = !audioModeActive;
                setAudioModeActive(next);
                if (next) {
                  setActiveTab('audio');
                  showToast('Audio Mode: ON');
                } else {
                  setActiveTab('general');
                  showToast('Audio Mode: OFF');
                }
              }}
              onClose={() => {
                setAudioModeActive(false);
                setActiveTab('general');
                showToast('Audio Mode: OFF');
              }}
              onBackToDesign={() => {
                setAudioModeActive(false);
                setActiveTab('general');
                showToast('Audio Mode: OFF');
              }}
              showToast={showToast}
            />
          )}
        </div>

        {/* RIGHT PREVIEW STAGE: LIVE WEBSITE IFRAME */}
        <div 
          ref={containerRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#e9e9ec',
            position: 'relative',
            overflow: 'hidden',
            alignItems: deviceView === 'mobile' ? 'center' : 'stretch',
            justifyContent: deviceView === 'mobile' ? 'center' : 'stretch',
            padding: deviceView === 'mobile' ? '20px 0' : 0,
          }}
        >
          {/* REAL WEBSITE IFRAME CONTAINER */}
          <div
            ref={previewContainerRef}
            style={{
              flex: 1,
              width: deviceView === 'mobile' ? 390 : '100%',
              height: deviceView === 'mobile' ? 844 : '100%',
              maxHeight: deviceView === 'mobile' ? 'calc(100vh - 140px)' : '100%',
              borderRadius: deviceView === 'mobile' ? 36 : 0,
              overflow: 'hidden',
              border: deviceView === 'mobile' ? '8px solid #262626' : 'none',
              boxShadow: deviceView === 'mobile' ? '0 20px 50px rgba(0,0,0,0.2)' : 'none',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              background: '#0d0d11',
            }}>
            {/* OVERLAY DRAG BLOCKER (prevents iframe from stealing events while dragging) */}
            {layoutDragState && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 80,
                  cursor: layoutDragState.includes('gutter') ? 'col-resize' : 'row-resize',
                  userSelect: 'none',
                }}
              />
            )}

            {/* OVERLAY LAYOUT GUIDES (When showLayoutGuides is active) */}
            {showLayoutGuides && (
              <>
                {/* Left Gutter Guide Band */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${currentGutter}px`,
                  background: 'rgba(0, 25, 255, 0.10)',
                  borderRight: '1.5px dashed #0019ff',
                  pointerEvents: 'none',
                  zIndex: 25,
                }} />

                {/* Left Gutter Draggable Handle Line */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLayoutDragState('gutter-left');
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${Math.max(0, currentGutter - 10)}px`,
                    width: 20,
                    cursor: 'col-resize',
                    zIndex: 35,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Drag horizontally to adjust Left & Right Gutters (Mirror Synced)"
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: layoutDragState === 'gutter-left' ? '#0019ff' : 'transparent',
                  }} />

                  {/* Left Gutter Info & Input Box */}
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #0019ff',
                      borderRadius: 6,
                      padding: '3px 6px',
                      boxShadow: '0 2px 8px rgba(0, 25, 255, 0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      zIndex: 36,
                      pointerEvents: 'auto',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0019ff', whiteSpace: 'nowrap' }}>Gutter:</span>
                    <input
                      type="number"
                      min="8"
                      max="300"
                      value={currentGutter}
                      onChange={(e) => {
                        const val = Math.max(8, parseInt(e.target.value, 10) || 8);
                        const field = deviceView === 'desktop' ? 'desktopPageGutter' : 'mobilePageGutter';
                        updateField(field, val);
                      }}
                      style={{
                        width: 42,
                        border: '1px solid #bfdbfe',
                        borderRadius: 3,
                        padding: '1px 3px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#0019ff',
                        textAlign: 'center',
                        outline: 'none',
                        background: '#eff6ff',
                      }}
                    />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: '#64748b' }}>px</span>
                    <span style={{ fontSize: 8.5, color: '#0019ff', background: '#dbeafe', padding: '1px 3px', borderRadius: 3, fontWeight: 600 }}>Linked</span>
                  </div>
                </div>

                {/* Right Gutter Guide Band */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: `${currentGutter}px`,
                  background: 'rgba(0, 25, 255, 0.10)',
                  borderLeft: '1.5px dashed #0019ff',
                  pointerEvents: 'none',
                  zIndex: 25,
                }} />

                {/* Right Gutter Draggable Handle Line */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLayoutDragState('gutter-right');
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    right: `${Math.max(0, currentGutter - 10)}px`,
                    width: 20,
                    cursor: 'col-resize',
                    zIndex: 35,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Drag horizontally to adjust Left & Right Gutters (Mirror Synced)"
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: layoutDragState === 'gutter-right' ? '#0019ff' : 'transparent',
                  }} />

                  {/* Right Gutter Info & Input Box */}
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #0019ff',
                      borderRadius: 6,
                      padding: '3px 6px',
                      boxShadow: '0 2px 8px rgba(0, 25, 255, 0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      zIndex: 36,
                      pointerEvents: 'auto',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0019ff', whiteSpace: 'nowrap' }}>Gutter:</span>
                    <input
                      type="number"
                      min="8"
                      max="300"
                      value={currentGutter}
                      onChange={(e) => {
                        const val = Math.max(8, parseInt(e.target.value, 10) || 8);
                        const field = deviceView === 'desktop' ? 'desktopPageGutter' : 'mobilePageGutter';
                        updateField(field, val);
                      }}
                      style={{
                        width: 42,
                        border: '1px solid #bfdbfe',
                        borderRadius: 3,
                        padding: '1px 3px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#0019ff',
                        textAlign: 'center',
                        outline: 'none',
                        background: '#eff6ff',
                      }}
                    />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: '#64748b' }}>px</span>
                    <span style={{ fontSize: 8.5, color: '#0019ff', background: '#dbeafe', padding: '1px 3px', borderRadius: 3, fontWeight: 600 }}>Linked</span>
                  </div>
                </div>

                {/* Top Section Padding Guide Band */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: `${currentGutter}px`,
                  right: `${currentGutter}px`,
                  height: `${currentSectionPadding}px`,
                  background: 'rgba(234, 179, 8, 0.10)',
                  borderBottom: '1.5px dashed #ca8a04',
                  pointerEvents: 'none',
                  zIndex: 25,
                }} />

                {/* Top Section Padding Draggable Handle Line */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLayoutDragState('section-top');
                  }}
                  style={{
                    position: 'absolute',
                    top: `${Math.max(0, currentSectionPadding - 10)}px`,
                    left: `${currentGutter}px`,
                    right: `${currentGutter}px`,
                    height: 20,
                    cursor: 'row-resize',
                    zIndex: 35,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Drag vertically or input number to adjust Section Top Padding"
                >
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 2,
                    background: layoutDragState === 'section-top' ? '#ca8a04' : 'transparent',
                  }} />

                  {/* Section Top Info Box (e.g. "Section Top: 112px") */}
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #ca8a04',
                      borderRadius: 6,
                      padding: '3px 8px',
                      boxShadow: '0 2px 8px rgba(202, 138, 4, 0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      zIndex: 36,
                      pointerEvents: 'auto',
                    }}
                  >
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#854d0e', whiteSpace: 'nowrap' }}>Section Top:</span>
                    <input
                      type="number"
                      min="12"
                      max="400"
                      value={currentSectionPadding}
                      onChange={(e) => {
                        const val = Math.max(12, parseInt(e.target.value, 10) || 12);
                        const field = deviceView === 'desktop' ? 'desktopSectionPadding' : 'mobileSectionPadding';
                        updateField(field, val);
                      }}
                      style={{
                        width: 48,
                        border: '1px solid #fde047',
                        borderRadius: 3,
                        padding: '1px 4px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#854d0e',
                        textAlign: 'center',
                        outline: 'none',
                        background: '#fefce8',
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#854d0e' }}>px</span>
                  </div>
                </div>

                {/* Bottom Section Padding Guide Band */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: `${currentGutter}px`,
                  right: `${currentGutter}px`,
                  height: `${currentSectionPadding}px`,
                  background: 'rgba(234, 179, 8, 0.10)',
                  borderTop: '1.5px dashed #ca8a04',
                  pointerEvents: 'none',
                  zIndex: 25,
                }} />

                {/* Bottom Section Padding Draggable Handle Line */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLayoutDragState('section-bottom');
                  }}
                  style={{
                    position: 'absolute',
                    bottom: `${Math.max(0, currentSectionPadding - 10)}px`,
                    left: `${currentGutter}px`,
                    right: `${currentGutter}px`,
                    height: 20,
                    cursor: 'row-resize',
                    zIndex: 35,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Drag vertically or input number to adjust Section Bottom Padding"
                >
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 2,
                    background: layoutDragState === 'section-bottom' ? '#ca8a04' : 'transparent',
                  }} />

                  {/* Section Bottom Info Box */}
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #ca8a04',
                      borderRadius: 6,
                      padding: '3px 8px',
                      boxShadow: '0 2px 8px rgba(202, 138, 4, 0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      zIndex: 36,
                      pointerEvents: 'auto',
                    }}
                  >
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#854d0e', whiteSpace: 'nowrap' }}>Section Bottom:</span>
                    <input
                      type="number"
                      min="12"
                      max="400"
                      value={currentSectionPadding}
                      onChange={(e) => {
                        const val = Math.max(12, parseInt(e.target.value, 10) || 12);
                        const field = deviceView === 'desktop' ? 'desktopSectionPadding' : 'mobileSectionPadding';
                        updateField(field, val);
                      }}
                      style={{
                        width: 48,
                        border: '1px solid #fde047',
                        borderRadius: 3,
                        padding: '1px 4px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#854d0e',
                        textAlign: 'center',
                        outline: 'none',
                        background: '#fefce8',
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#854d0e' }}>px</span>
                  </div>
                </div>
              </>
            )}

            {/* THE AUTHENTIC LIVE WEBSITE PREVIEW IFRAME */}
            <iframe
              ref={iframeRef}
              src="/preview-site"
              title="Live Website"
              onLoad={() => {
                setIframeLoaded(true);
                applyLiveChangesToIframe();
              }}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#0d0d11',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// FIGMA-STYLE ATOMIC UI COMPONENTS
// ==========================================

// Figma Accordion Section with Clear Visual Separation and Distinct Expanded Styling
function FigmaSection({ title, icon, isCollapsed, onToggle, modifiedCount, onResetSection, children }) {
  return (
    <div style={{
      width: '100%',
      flexShrink: 0,
      background: '#ffffff',
      border: isCollapsed ? '1.5px solid #e2e8f0' : '1.5px solid #0019ff',
      borderRadius: 10,
      boxSizing: 'border-box',
      overflow: 'hidden',
      boxShadow: isCollapsed 
        ? '0 1px 3px rgba(0,0,0,0.03)' 
        : '0 6px 20px -3px rgba(0, 25, 255, 0.14), 0 2px 5px rgba(0,0,0,0.03)',
      transition: 'all 0.15s ease',
    }}>
      {/* Category Header */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 14px',
          background: isCollapsed ? '#ffffff' : '#D7E2EA',
          borderLeft: isCollapsed ? '4px solid transparent' : '4px solid #0019ff',
          borderBottom: isCollapsed ? 'none' : '1.5px solid #c2d3df',
          boxSizing: 'border-box',
          transition: 'background 0.15s ease',
        }}
      >
        <button
          onClick={onToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
            flex: 1,
          }}
        >
          <span style={{ color: isCollapsed ? '#64748b' : '#0019ff', display: 'flex' }}>{icon}</span>
          <span style={{
            fontWeight: isCollapsed ? 600 : 700,
            fontSize: isCollapsed ? 13 : 13.5,
            color: isCollapsed ? '#1e293b' : '#0019ff',
          }}>
            {title}
          </span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {modifiedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontSize: 10.5,
                fontWeight: 700,
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
                padding: '2px 6px',
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d97706' }} />
                {modifiedCount}
              </span>
              {onResetSection && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetSection();
                  }}
                  title={`Reset all settings in ${title}`}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: 4,
                    padding: '2px 5px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Icons.Reset />
                  <span>Reset</span>
                </button>
              )}
            </div>
          )}

          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              color: isCollapsed ? '#94a3b8' : '#0019ff',
            }}
          >
            {isCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronDown />}
          </button>
        </div>
      </div>

      {/* Category Content */}
      {!isCollapsed && (
        <div style={{
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxSizing: 'border-box',
          width: '100%',
          background: '#ffffff',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Figma Text Input Field with Clear High-Contrast Borders and Generous Sizing
function FigmaInput({ label, value, onChange, isModified, onReset }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{label}</span>
        {isModified && onReset && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 3 }}>
              Modified
            </span>
            <button
              onClick={onReset}
              title="Reset to default"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8c8c8c',
                cursor: 'pointer',
                padding: '1px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icons.Reset />
            </button>
          </div>
        )}
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: isModified ? '#fffbeb' : '#f8fafc',
          color: '#0f172a',
          border: isModified ? '1.5px solid #f59e0b' : '1.5px solid #cbd5e1',
          padding: '9px 12px',
          borderRadius: 8,
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'all 0.12s ease',
        }}
        onFocus={(e) => { 
          e.target.style.background = '#ffffff'; 
          e.target.style.borderColor = '#0019ff'; 
          e.target.style.boxShadow = '0 0 0 3px rgba(0, 25, 255, 0.15)'; 
        }}
        onBlur={(e) => { 
          e.target.style.background = isModified ? '#fffbeb' : '#f8fafc'; 
          e.target.style.borderColor = isModified ? '#f59e0b' : '#cbd5e1'; 
          e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; 
        }}
      />
    </div>
  );
}

// Figma Textarea Field
function FigmaTextarea({ label, value, onChange, isModified, onReset }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{label}</span>
        {isModified && onReset && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 3 }}>
              Modified
            </span>
            <button
              onClick={onReset}
              title="Reset to default"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8c8c8c',
                cursor: 'pointer',
                padding: '1px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icons.Reset />
            </button>
          </div>
        )}
      </div>
      <textarea
        rows={3}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: isModified ? '#fffbeb' : '#f8fafc',
          color: '#0f172a',
          border: isModified ? '1.5px solid #f59e0b' : '1.5px solid #cbd5e1',
          padding: '9px 12px',
          borderRadius: 8,
          fontSize: 13,
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
          lineHeight: 1.45,
          fontFamily: 'inherit',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          transition: 'all 0.12s ease',
        }}
        onFocus={(e) => { 
          e.target.style.background = '#ffffff'; 
          e.target.style.borderColor = '#0019ff'; 
          e.target.style.boxShadow = '0 0 0 3px rgba(0, 25, 255, 0.15)'; 
        }}
        onBlur={(e) => { 
          e.target.style.background = isModified ? '#fffbeb' : '#f8fafc'; 
          e.target.style.borderColor = isModified ? '#f59e0b' : '#cbd5e1'; 
          e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; 
        }}
      />
    </div>
  );
}

// Figma Number Input with Prefix Symbol
function FigmaNumber({ label, prefix, value, onChange, isModified, onReset }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{label}</span>
        {isModified && onReset && (
          <button
            onClick={onReset}
            title="Reset to default"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8c8c8c',
              cursor: 'pointer',
              padding: '1px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Icons.Reset />
          </button>
        )}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: isModified ? '#fffbeb' : '#f8fafc',
        border: isModified ? '1.5px solid #f59e0b' : '1.5px solid #cbd5e1',
        borderRadius: 8,
        padding: '2px 10px',
        boxSizing: 'border-box',
        width: '100%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}>
        {prefix && (
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700, marginRight: 6 }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            background: 'transparent',
            color: '#0f172a',
            border: 'none',
            padding: '7px 0',
            fontSize: 13,
            fontWeight: 600,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}

// Figma Select Dropdown
function FigmaSelect({ label, value, options, onChange, isModified, onReset }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{label}</span>
        {isModified && onReset && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 3 }}>
              Modified
            </span>
            <button
              onClick={onReset}
              title="Reset to default"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8c8c8c',
                cursor: 'pointer',
                padding: '1px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icons.Reset />
            </button>
          </div>
        )}
      </div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: isModified ? '#fffbeb' : '#f8fafc',
          color: '#0f172a',
          border: isModified ? '1.5px solid #f59e0b' : '1.5px solid #cbd5e1',
          padding: '9px 12px',
          borderRadius: 8,
          fontSize: 13,
          outline: 'none',
          cursor: 'pointer',
          boxSizing: 'border-box',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Figma Slider with Inline Value Box
function FigmaSlider({ label, value, min, max, step = 1, unit = '', onChange, isModified, onReset }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: isModified ? '#b45309' : '#0f172a',
            fontFamily: 'monospace',
            background: isModified ? '#fef3c7' : '#f1f5f9',
            border: isModified ? '1px solid #fde68a' : '1px solid #e2e8f0',
            padding: '2px 8px',
            borderRadius: 5,
          }}>
            {value}{unit}
          </span>
          {isModified && onReset && (
            <button
              onClick={onReset}
              title="Reset to default"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8c8c8c',
                cursor: 'pointer',
                padding: '1px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icons.Reset />
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#0019ff',
          cursor: 'pointer',
          height: 6,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// Figma Color Picker Field
function FigmaColorPicker({ label, value, onChange, isModified, onReset }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{label}</span>
        {isModified && onReset && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: 3 }}>
              Modified
            </span>
            <button
              onClick={onReset}
              title="Reset to default"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8c8c8c',
                cursor: 'pointer',
                padding: '1px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icons.Reset />
            </button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
        <div style={{
          position: 'relative',
          width: 34,
          height: 34,
          borderRadius: 8,
          border: '1.5px solid #cbd5e1',
          overflow: 'hidden',
          background: value || '#000000',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              top: -10,
              left: -10,
              width: 60,
              height: 60,
              cursor: 'pointer',
              opacity: 0,
            }}
          />
        </div>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#hex"
          style={{
            flex: 1,
            background: isModified ? '#fffbeb' : '#f8fafc',
            color: '#0f172a',
            border: isModified ? '1.5px solid #f59e0b' : '1.5px solid #cbd5e1',
            padding: '8px 11px',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'monospace',
            outline: 'none',
            boxSizing: 'border-box',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
          onFocus={(e) => { 
            e.target.style.background = '#ffffff'; 
            e.target.style.borderColor = '#0019ff'; 
            e.target.style.boxShadow = '0 0 0 3px rgba(0, 25, 255, 0.15)'; 
          }}
          onBlur={(e) => { 
            e.target.style.background = isModified ? '#fffbeb' : '#f8fafc'; 
            e.target.style.borderColor = isModified ? '#f59e0b' : '#cbd5e1'; 
            e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; 
          }}
        />
      </div>
    </div>
  );
}
