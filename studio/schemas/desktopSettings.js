import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'desktopSettings',
  title: 'Global Desktop Settings',
  type: 'document',
  groups: [
    { name: 'content', title: 'Page Content (Text Blocks)', default: true },
    { name: 'design', title: 'Design Controls (Spacing & Typography)' },
    { name: 'social', title: 'Social Media Links' },
  ],
  fields: [
    // ==========================================
    // GROUP 1: PAGE CONTENT (EDITABLE TEXT BLOCKS)
    // ==========================================
    defineField({
      name: 'siteBrand',
      title: 'Studio Brand Name',
      type: 'string',
      group: 'content',
      initialValue: 'EKO',
      description: 'Displayed in the header and footer brand marks.',
    }),
    defineField({
      name: 'heroEyebrow',
      title: 'Hero Section Eyebrow',
      type: 'string',
      group: 'content',
      initialValue: 'Producer · Engineer · Sound Designer',
    }),
    defineField({
      name: 'heroTitle',
      title: 'Hero Main Title (H1)',
      type: 'string',
      group: 'content',
      initialValue: 'Music Producer',
    }),
    defineField({
      name: 'heroLine1',
      title: 'Hero Subtitle - Line 1',
      type: 'string',
      group: 'content',
      initialValue: 'Beats, Mixing & Vocal Production',
    }),
    defineField({
      name: 'heroLine2',
      title: 'Hero Subtitle - Line 2',
      type: 'string',
      group: 'content',
      initialValue: 'Focused on clean, impactful sound with fast delivery',
    }),
    defineField({
      name: 'heroCtaText',
      title: 'Hero CTA Button Label',
      type: 'string',
      group: 'content',
      initialValue: 'Listen to Tracks',
    }),

    // Showcase Section Content
    defineField({
      name: 'showcaseTitle',
      title: 'Showcase Section Heading (H2)',
      type: 'string',
      group: 'content',
      initialValue: 'The Work',
    }),
    defineField({
      name: 'showcaseDescription',
      title: 'Showcase Section Subtitle / Paragraph',
      type: 'text',
      rows: 2,
      group: 'content',
      initialValue: 'Explore a curated selection of original productions. Headphones recommended.',
    }),

    // Process Section Content
    defineField({
      name: 'processTitle',
      title: 'Process Section Heading (H2)',
      type: 'string',
      group: 'content',
      initialValue: 'The Process',
    }),
    defineField({
      name: 'processTrustline',
      title: 'Process Trust Tagline',
      type: 'string',
      group: 'content',
      initialValue: '100% Original · No AI Used',
    }),
    defineField({
      name: 'processClosingTitle',
      title: 'Process Closing Statement Title',
      type: 'string',
      group: 'content',
      initialValue: '100% Original Build For You. Each Time.',
    }),
    defineField({
      name: 'processClosingCopy',
      title: 'Process Closing Statement Description',
      type: 'text',
      rows: 2,
      group: 'content',
      initialValue: 'No templates. No shortcuts. Just honest music, crafted to tell your story.',
    }),

    // Services Section Content
    defineField({
      name: 'servicesTitle',
      title: 'Services Section Heading (H2)',
      type: 'string',
      group: 'content',
      initialValue: 'Studio Services',
    }),
    defineField({
      name: 'servicesDescription',
      title: 'Services Section Subtitle',
      type: 'text',
      rows: 2,
      group: 'content',
      initialValue: 'Professional sound, straightforward pricing, and a process built around your vision.',
    }),

    // Delivery & Payments Content
    defineField({
      name: 'deliveryTitle',
      title: 'Delivery Section Heading (H2)',
      type: 'string',
      group: 'content',
      initialValue: 'Delivery & Payments',
    }),
    defineField({
      name: 'deliveryDescription',
      title: 'Delivery Section Subtitle',
      type: 'text',
      rows: 2,
      group: 'content',
      initialValue: 'A straightforward handoff with the important details clear before work begins.',
    }),
    defineField({
      name: 'turnaroundBeats',
      title: 'Beats Delivery Turnaround Time',
      type: 'string',
      group: 'content',
      initialValue: 'Beats — within 24 hours',
    }),
    defineField({
      name: 'turnaroundMixing',
      title: 'Mixing Delivery Turnaround Time',
      type: 'string',
      group: 'content',
      initialValue: 'Mixing — 24–48 hours',
    }),
    defineField({
      name: 'turnaroundEdits',
      title: 'Edits Delivery Turnaround Time',
      type: 'string',
      group: 'content',
      initialValue: 'Edits — same day (in most cases)',
    }),

    // Contact Section Content
    defineField({
      name: 'contactTitle',
      title: 'Contact Section Heading (H2)',
      type: 'string',
      group: 'content',
      initialValue: "Let's Work",
    }),
    defineField({
      name: 'contactLead',
      title: 'Contact Section Subtitle',
      type: 'string',
      group: 'content',
      initialValue: 'Available for collaborations & ongoing projects',
    }),
    defineField({
      name: 'contactDmNote',
      title: 'Contact Direct Message Note',
      type: 'string',
      group: 'content',
      initialValue: 'DM for quick response',
    }),
    defineField({
      name: 'copyrightText',
      title: 'Footer Copyright Text',
      type: 'string',
      group: 'content',
      initialValue: '© 2026 Eko. All rights reserved.',
    }),

    // ==========================================
    // GROUP 2: DESIGN CONTROLS (SPACING, PADDING, SCALES)
    // ==========================================
    defineField({
      name: 'desktopPageGutter',
      title: 'Desktop Page Gutter / Horizontal Margin (px)',
      type: 'number',
      group: 'design',
      initialValue: 48,
      description: 'Side margins on widescreen displays (slider: 20px to 96px)',
      validation: (Rule) => Rule.min(16).max(120),
    }),
    defineField({
      name: 'desktopSectionPadding',
      title: 'Desktop Section Vertical Padding (px)',
      type: 'number',
      group: 'design',
      initialValue: 112,
      description: 'Top and bottom spacing between sections (slider: 60px to 180px)',
      validation: (Rule) => Rule.min(40).max(240),
    }),
    defineField({
      name: 'desktopHeroTitleSize',
      title: 'Desktop Hero Title Size (rem)',
      type: 'number',
      group: 'design',
      initialValue: 11.5,
      description: 'Scale factor for large display H1 header (original baseline: 11.5 rem)',
      validation: (Rule) => Rule.min(3).max(16),
    }),
    defineField({
      name: 'desktopH2Size',
      title: 'Desktop Section Heading 2 Size (rem)',
      type: 'number',
      group: 'design',
      initialValue: 9.2,
      description: 'Scale factor for large section H2 headings like "The Work" & "The Process" (original baseline: 9.2 rem)',
      validation: (Rule) => Rule.min(2.5).max(14),
    }),
    defineField({
      name: 'desktopCardPadding',
      title: 'Desktop Card Inner Padding (px)',
      type: 'number',
      group: 'design',
      initialValue: 34,
      description: 'Interior padding inside catalog cards and player panels (e.g. 24px to 54px)',
      validation: (Rule) => Rule.min(16).max(72),
    }),
    defineField({
      name: 'desktopCardGap',
      title: 'Desktop Card Grid Gap (px)',
      type: 'number',
      group: 'design',
      initialValue: 24,
      description: 'Spacing between cards in desktop multi-column grids (e.g. 16px to 48px)',
      validation: (Rule) => Rule.min(8).max(64),
    }),
    defineField({
      name: 'desktopBaseFontSize',
      title: 'Desktop Base Font Size (px)',
      type: 'number',
      group: 'design',
      initialValue: 16,
      description: 'Standard baseline body typography size for desktop screens (14px to 20px)',
      validation: (Rule) => Rule.min(13).max(22),
    }),
    defineField({
      name: 'primarySignalColor',
      title: 'Primary Brand Accent Color (HEX)',
      type: 'string',
      group: 'design',
      initialValue: '#6c63e5',
      placeholder: '#6c63e5',
      description: 'Used for primary action buttons, active indicators, and glow highlights',
    }),
    defineField({
      name: 'signalBrightColor',
      title: 'Signal Bright Hover Color (HEX)',
      type: 'string',
      group: 'design',
      initialValue: '#007fff',
      placeholder: '#007fff',
      description: 'Used for interactive focus rings, hover glow, and badge outlines',
    }),

    // ==========================================
    // GROUP 3: SOCIAL MEDIA LINKS
    // ==========================================
    defineField({
      name: 'instagramUrl',
      title: 'Instagram Profile URL',
      type: 'url',
      group: 'social',
      placeholder: 'https://instagram.com/yourhandle',
    }),
    defineField({
      name: 'emailAddress',
      title: 'Contact Email Address (mailto:)',
      type: 'string',
      group: 'social',
      initialValue: 'hello@eko.com',
      placeholder: 'hello@eko.com',
    }),
    defineField({
      name: 'signalUrl',
      title: 'Signal App Link / Phone',
      type: 'string',
      group: 'social',
      placeholder: 'https://signal.me/#p/... or username',
    }),
    defineField({
      name: 'twitterUrl',
      title: 'X / Twitter Profile URL',
      type: 'url',
      group: 'social',
      placeholder: 'https://x.com/yourhandle',
    }),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube Channel URL',
      type: 'url',
      group: 'social',
      placeholder: 'https://youtube.com/@yourchannel',
    }),
    defineField({
      name: 'soundcloudUrl',
      title: 'SoundCloud / BeatStars / Spotify URL',
      type: 'url',
      group: 'social',
      placeholder: 'https://soundcloud.com/yourhandle',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Global Desktop Settings',
        subtitle: 'Desktop Content, Spacing Controls & Social Links',
      };
    },
  },
});
