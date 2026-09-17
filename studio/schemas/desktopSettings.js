import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'desktopSettings',
  title: 'Desktop Tuning & Content',
  type: 'document',
  icon: () => '🖥️',
  groups: [
    { name: 'tuning', title: 'Layout & Spacing Tuning', default: true },
    { name: 'typography', title: 'Typography Controls' },
    { name: 'content', title: 'Page Content (Text Blocks)' },
  ],
  fields: [
    // ==========================================
    // GROUP 1: DESKTOP LAYOUT & SPACING TUNING
    // ==========================================
    defineField({
      name: 'desktopPageGutter',
      title: 'Desktop Page Gutter / Horizontal Margin (px)',
      type: 'number',
      group: 'tuning',
      initialValue: 48,
      description: 'Side margins on widescreen displays (slider: 16px to 120px)',
      validation: (Rule) => Rule.min(16).max(120),
    }),
    defineField({
      name: 'desktopSectionPadding',
      title: 'Desktop Section Vertical Padding (px)',
      type: 'number',
      group: 'tuning',
      initialValue: 112,
      description: 'Top and bottom spacing between sections (slider: 40px to 240px)',
      validation: (Rule) => Rule.min(40).max(240),
    }),
    defineField({
      name: 'desktopCardPadding',
      title: 'Desktop Card Inner Padding (px)',
      type: 'number',
      group: 'tuning',
      initialValue: 34,
      description: 'Interior padding inside catalog cards and player panels (16px to 72px)',
      validation: (Rule) => Rule.min(16).max(72),
    }),
    defineField({
      name: 'desktopCardGap',
      title: 'Desktop Card Grid Gap (px)',
      type: 'number',
      group: 'tuning',
      initialValue: 24,
      description: 'Spacing between cards in desktop multi-column grids (8px to 64px)',
      validation: (Rule) => Rule.min(8).max(64),
    }),
    defineField({
      name: 'desktopButtonPaddingV',
      title: 'CTA Button Vertical Padding (px)',
      type: 'number',
      group: 'tuning',
      initialValue: 14,
      validation: (Rule) => Rule.min(8).max(30),
    }),
    defineField({
      name: 'desktopButtonPaddingH',
      title: 'CTA Button Horizontal Padding (px)',
      type: 'number',
      group: 'tuning',
      initialValue: 28,
      validation: (Rule) => Rule.min(16).max(60),
    }),

    // ==========================================
    // GROUP 2: TYPOGRAPHY CONTROLS
    // ==========================================
    defineField({
      name: 'desktopHeroTitleSize',
      title: 'Desktop Hero Title Size (rem)',
      type: 'number',
      group: 'typography',
      initialValue: 11.5,
      description: 'Scale factor for large display H1 header (3.0 to 16.0 rem)',
      validation: (Rule) => Rule.min(3).max(16),
    }),
    defineField({
      name: 'desktopH2Size',
      title: 'Desktop Section Heading 2 Size (rem)',
      type: 'number',
      group: 'typography',
      initialValue: 9.2,
      description: 'Scale factor for large section H2 headings (2.5 to 14.0 rem)',
      validation: (Rule) => Rule.min(2.5).max(14),
    }),
    defineField({
      name: 'desktopBaseFontSize',
      title: 'Desktop Base Body Font Size (px)',
      type: 'number',
      group: 'typography',
      initialValue: 16,
      description: 'Standard baseline body typography size for desktop screens (13px to 22px)',
      validation: (Rule) => Rule.min(13).max(22),
    }),
    defineField({
      name: 'headingWeight',
      title: 'Headings Font Weight',
      type: 'string',
      group: 'typography',
      options: {
        list: [
          { title: 'Normal (400)', value: '400' },
          { title: 'Medium (500)', value: '500' },
          { title: 'Semi-Bold (600)', value: '600' },
          { title: 'Bold (700)', value: '700' },
          { title: 'Black / Extra-Bold (900)', value: '900' },
        ],
      },
      initialValue: '900',
    }),
    defineField({
      name: 'enableItalicAccents',
      title: 'Italicized Subtitles & Highlight Accents',
      type: 'boolean',
      group: 'typography',
      initialValue: false,
      description: 'Toggles subtle italic styling on section taglines and eyebrow quotes.',
    }),

    // ==========================================
    // GROUP 3: PAGE CONTENT (EDITABLE TEXT BLOCKS)
    // ==========================================
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
  ],
  preview: {
    prepare() {
      return {
        title: 'Desktop Tuning',
        subtitle: 'Desktop Spacing Sliders, Typography & Text Blocks',
      };
    },
  },
});
