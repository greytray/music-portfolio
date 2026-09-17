import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'unifiedSettings',
  title: 'Unified Settings',
  type: 'document',
  icon: () => '⚙️',
  groups: [
    { name: 'general', title: 'Brand & General', default: true },
    { name: 'pricing', title: 'Real-Time Pricing Matrix' },
    { name: 'typography', title: 'Global Typography' },
    { name: 'social', title: 'Social & Contact Channels' },
  ],
  fields: [
    // ==========================================
    // GROUP 1: GENERAL & BRANDING
    // ==========================================
    defineField({
      name: 'siteBrand',
      title: 'Studio / Artist Brand Name',
      type: 'string',
      group: 'general',
      initialValue: 'EKO',
      description: 'Main display brand title rendered across headers, footers, and metadata.',
    }),
    defineField({
      name: 'tagline',
      title: 'Global Hero Eyebrow / Tagline',
      type: 'string',
      group: 'general',
      initialValue: 'Producer · Engineer · Sound Designer',
    }),
    defineField({
      name: 'primarySignalColor',
      title: 'Primary Signal Accent Color (HEX)',
      type: 'string',
      group: 'general',
      initialValue: '#6c63e5',
      description: 'Used for active play indicators, primary CTA buttons, and interactive rings.',
    }),
    defineField({
      name: 'signalBrightColor',
      title: 'Signal Bright Hover Highlight (HEX)',
      type: 'string',
      group: 'general',
      initialValue: '#007fff',
      description: 'Used for hover states, focused inputs, and waveform spikes.',
    }),
    defineField({
      name: 'darkCanvasColor',
      title: 'Dark Canvas Background (HEX)',
      type: 'string',
      group: 'general',
      initialValue: '#0b0b0e',
      description: 'Deep background color of the studio and website.',
    }),

    // ==========================================
    // GROUP 2: REAL-TIME PRICING MATRIX
    // ==========================================
    defineField({
      name: 'beatLicensePricing',
      title: 'Beat Store Licensing Prices (USD $)',
      type: 'object',
      group: 'pricing',
      description: 'Instant pricing integration. Modifying these values updates live checkout buttons and licensing modals across the entire site.',
      fields: [
        defineField({
          name: 'mp3Price',
          title: 'MP3 Standard Lease ($)',
          type: 'number',
          initialValue: 49,
          validation: (Rule) => Rule.min(1).error('Must be at least $1'),
        }),
        defineField({
          name: 'wavPrice',
          title: 'WAV High-Quality Lease ($)',
          type: 'number',
          initialValue: 99,
          validation: (Rule) => Rule.min(1),
        }),
        defineField({
          name: 'stemsPrice',
          title: 'Full Stems / Trackout License ($)',
          type: 'number',
          initialValue: 199,
          validation: (Rule) => Rule.min(1),
        }),
        defineField({
          name: 'exclusivePrice',
          title: 'Exclusive Buyout Right ($)',
          type: 'number',
          initialValue: 599,
          validation: (Rule) => Rule.min(1),
        }),
      ],
    }),

    defineField({
      name: 'servicesPricing',
      title: 'Studio Services Rates (USD $)',
      type: 'object',
      group: 'pricing',
      description: 'Real-time base pricing for custom client studio bookings and engineering.',
      fields: [
        defineField({
          name: 'customProductionPrice',
          title: 'Custom Production / Exclusive Beat ($)',
          type: 'number',
          initialValue: 350,
        }),
        defineField({
          name: 'mixingMasteringPrice',
          title: 'Full Vocal Mix & Master per Track ($)',
          type: 'number',
          initialValue: 150,
        }),
        defineField({
          name: 'vocalTuningPrice',
          title: 'Vocal Pitch & Timing Correction ($)',
          type: 'number',
          initialValue: 80,
        }),
        defineField({
          name: 'consultationHourlyRate',
          title: '1-on-1 Production Mentorship (per hour $) ',
          type: 'number',
          initialValue: 75,
        }),
      ],
    }),

    // ==========================================
    // GROUP 3: GLOBAL TYPOGRAPHY
    // ==========================================
    defineField({
      name: 'displayFont',
      title: 'Primary Display Heading Font',
      type: 'string',
      group: 'typography',
      options: {
        list: [
          { title: 'Dela Gothic One (Bold Japanese/Brutalist)', value: 'Dela Gothic One' },
          { title: 'Work Sans (Refined Modern)', value: 'Work Sans' },
          { title: 'DM Sans (Geometric Clean)', value: 'DM Sans' },
          { title: 'System Bold Display', value: 'system-ui' },
        ],
      },
      initialValue: 'Dela Gothic One',
    }),
    defineField({
      name: 'bodyFont',
      title: 'Primary Body Text Font',
      type: 'string',
      group: 'typography',
      options: {
        list: [
          { title: 'DM Sans (Standard)', value: 'DM Sans' },
          { title: 'Work Sans (Editorial)', value: 'Work Sans' },
          { title: 'System Default Sans', value: '-apple-system, sans-serif' },
        ],
      },
      initialValue: 'DM Sans',
    }),

    // ==========================================
    // GROUP 4: SOCIAL & CONTACT
    // ==========================================
    defineField({
      name: 'instagramUrl',
      title: 'Instagram Profile URL',
      type: 'url',
      group: 'social',
    }),
    defineField({
      name: 'emailAddress',
      title: 'Contact Email Address',
      type: 'string',
      group: 'social',
      initialValue: 'hello@eko.com',
    }),
    defineField({
      name: 'signalUrl',
      title: 'Signal / Direct Message URL',
      type: 'string',
      group: 'social',
    }),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube Channel URL',
      type: 'url',
      group: 'social',
    }),
    defineField({
      name: 'soundcloudUrl',
      title: 'SoundCloud / BeatStars Profile URL',
      type: 'url',
      group: 'social',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Unified Settings',
        subtitle: 'Global Brand, Real-Time Pricing Matrix & Typography Presets',
      };
    },
  },
});
