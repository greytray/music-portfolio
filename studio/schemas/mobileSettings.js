import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'mobileSettings',
  title: 'Mobile Tuning & Compact Layout',
  type: 'document',
  icon: () => '📱',
  groups: [
    { name: 'layout', title: 'Mobile Layout & Spacing Tuning', default: true },
    { name: 'typography', title: 'Mobile Typography' },
    { name: 'content', title: 'Mobile Overrides & Compact Toggles' },
  ],
  fields: [
    // ========================================================
    // GROUP 1: MOBILE LAYOUT & SPACING TUNING
    // ========================================================
    defineField({
      name: 'mobilePageGutter',
      title: 'Mobile Page Gutter / Horizontal Padding (px)',
      type: 'number',
      group: 'layout',
      initialValue: 20,
      description: 'Side edge margin on phones and compact screens (10px to 40px)',
      validation: (Rule) => Rule.min(10).max(40),
    }),
    defineField({
      name: 'mobileSectionPadding',
      title: 'Mobile Section Vertical Padding (px)',
      type: 'number',
      group: 'layout',
      initialValue: 64,
      description: 'Vertical spacing between sections on compact viewports (32px to 120px)',
      validation: (Rule) => Rule.min(32).max(120),
    }),
    defineField({
      name: 'mobileCardPadding',
      title: 'Mobile Card Inner Padding (px)',
      type: 'number',
      group: 'layout',
      initialValue: 20,
      description: 'Internal padding inside cards on small screens (10px to 36px)',
      validation: (Rule) => Rule.min(10).max(36),
    }),
    defineField({
      name: 'mobileCardGap',
      title: 'Mobile Card Gap (px)',
      type: 'number',
      group: 'layout',
      initialValue: 14,
      description: 'Gap between stacked cards in mobile view (6px to 32px)',
      validation: (Rule) => Rule.min(6).max(32),
    }),

    // ========================================================
    // GROUP 2: MOBILE TYPOGRAPHY
    // ========================================================
    defineField({
      name: 'mobileHeroTitleSize',
      title: 'Mobile Hero Title Size (rem)',
      type: 'number',
      group: 'typography',
      initialValue: 5.0,
      description: 'Headline H1 scale factor on smartphones (2.0 to 7.0 rem)',
      validation: (Rule) => Rule.min(2.0).max(7.0),
    }),
    defineField({
      name: 'mobileH2Size',
      title: 'Mobile Section Heading 2 Size (rem)',
      type: 'number',
      group: 'typography',
      initialValue: 4.5,
      description: 'Section H2 scale factor on smartphones (1.8 to 6.0 rem)',
      validation: (Rule) => Rule.min(1.8).max(6.0),
    }),
    defineField({
      name: 'mobileBaseFontSize',
      title: 'Mobile Base Body Font Size (px)',
      type: 'number',
      group: 'typography',
      initialValue: 15,
      description: 'Base text size on compact devices (13px to 18px)',
      validation: (Rule) => Rule.min(13).max(18),
    }),

    // ========================================================
    // GROUP 3: MOBILE OVERRIDES & COMPACT TOGGLES
    // ========================================================
    defineField({
      name: 'useMobileShortHero',
      title: 'Use Compact Hero Text on Mobile',
      type: 'boolean',
      group: 'content',
      initialValue: false,
      description: 'Toggle on to replace desktop hero text with concise wording on small screens.',
    }),
    defineField({
      name: 'mobileShortHeroTitle',
      title: 'Mobile Short Hero Title (H1)',
      type: 'string',
      group: 'content',
      placeholder: 'e.g. Music Producer',
      hidden: ({ parent }) => !parent?.useMobileShortHero,
    }),
    defineField({
      name: 'mobileShortHeroSub',
      title: 'Mobile Short Hero Subtitle',
      type: 'string',
      group: 'content',
      placeholder: 'e.g. Beats, Mixing & Mastering',
      hidden: ({ parent }) => !parent?.useMobileShortHero,
    }),

    defineField({
      name: 'useMobileShortShowcase',
      title: 'Use Compact Showcase Subtitle on Mobile',
      type: 'boolean',
      group: 'content',
      initialValue: false,
      description: 'Toggle on to show a concise subtitle below "The Work" on mobile.',
    }),
    defineField({
      name: 'mobileShortShowcaseDescription',
      title: 'Mobile Short Showcase Description',
      type: 'string',
      group: 'content',
      placeholder: 'e.g. Curated original productions. Headphones on.',
      hidden: ({ parent }) => !parent?.useMobileShortShowcase,
    }),

    defineField({
      name: 'useMobileShortContact',
      title: 'Use Compact Contact Intro on Mobile',
      type: 'boolean',
      group: 'content',
      initialValue: false,
      description: 'Shorten contact section wording on small viewports.',
    }),
    defineField({
      name: 'mobileShortContactLead',
      title: 'Mobile Short Contact Subtitle',
      type: 'string',
      group: 'content',
      placeholder: 'e.g. Let’s build your sound.',
      hidden: ({ parent }) => !parent?.useMobileShortContact,
    }),

    defineField({
      name: 'compactProcessLayout',
      title: 'Force High-Density Single-Column Process on Mobile',
      type: 'boolean',
      group: 'content',
      initialValue: true,
      description: 'Ensures process cards stack cleanly without horizontal overflow.',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Mobile Tuning',
        subtitle: 'Mobile Sliders, Typography & Compact Content Overrides',
      };
    },
  },
});
