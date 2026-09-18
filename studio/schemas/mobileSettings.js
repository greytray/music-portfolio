import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'mobileSettings',
  title: 'Global Mobile Settings',
  type: 'document',
  groups: [
    { name: 'layout', title: 'Mobile Layout & Design Controls', default: true },
    { name: 'content', title: 'Mobile-Specific Content & Overrides' },
  ],
  fields: [
    // ========================================================
    // GROUP 1: MOBILE LAYOUT & DESIGN (VARIABLE CONTROLS)
    // ========================================================
    defineField({
      name: 'mobilePageGutter',
      title: 'Mobile Page Gutter / Horizontal Padding (px)',
      type: 'number',
      group: 'layout',
      initialValue: 20,
      description: 'Side edge margin on phones and compact screens (e.g. 14px to 28px)',
      validation: (Rule) => Rule.min(10).max(40),
    }),
    defineField({
      name: 'mobileSectionPadding',
      title: 'Mobile Section Vertical Padding (px)',
      type: 'number',
      group: 'layout',
      initialValue: 64,
      description: 'Vertical spacing between sections on compact viewports (e.g. 40px to 96px)',
      validation: (Rule) => Rule.min(32).max(120),
    }),
    defineField({
      name: 'mobileHeroTitleSize',
      title: 'Mobile Hero Title Size (rem)',
      type: 'number',
      group: 'layout',
      initialValue: 5.0,
      description: 'Headline H1 scale factor on smartphones (original baseline: 5.0 rem)',
      validation: (Rule) => Rule.min(2.0).max(7.0),
    }),
    defineField({
      name: 'mobileH2Size',
      title: 'Mobile Section Heading 2 Size (rem)',
      type: 'number',
      group: 'layout',
      initialValue: 4.5,
      description: 'Section H2 scale factor on smartphones (original baseline: 4.5 rem)',
      validation: (Rule) => Rule.min(1.8).max(6.0),
    }),
    defineField({
      name: 'mobileCardPadding',
      title: 'Mobile Card Inner Padding (px)',
      type: 'number',
      group: 'layout',
      initialValue: 20,
      description: 'Internal padding inside cards on small screens (e.g. 14px to 28px)',
      validation: (Rule) => Rule.min(10).max(36),
    }),
    defineField({
      name: 'mobileCardGap',
      title: 'Mobile Card Gap (px)',
      type: 'number',
      group: 'layout',
      initialValue: 14,
      description: 'Gap between stacked cards in mobile view (e.g. 10px to 24px)',
      validation: (Rule) => Rule.min(6).max(32),
    }),
    defineField({
      name: 'mobileBaseFontSize',
      title: 'Mobile Base Body Font Size (px)',
      type: 'number',
      group: 'layout',
      initialValue: 15,
      description: 'Base text size on compact devices for high legibility (14px to 17px)',
      validation: (Rule) => Rule.min(13).max(18),
    }),

    // ========================================================
    // GROUP 2: MOBILE-SPECIFIC CONTENT (TOGGLES & SHORT TEXTS)
    // ========================================================
    defineField({
      name: 'useMobileShortHero',
      title: 'Use Compact Hero Text on Mobile',
      type: 'boolean',
      group: 'content',
      initialValue: false,
      description: 'Toggle on to replace desktop hero text with concise wording for small screens.',
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
      description: 'Ensures process cards stack cleanly without horizontal scroll.',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Global Mobile Settings',
        subtitle: 'Mobile Spacing, Typography & Compact Content Overrides',
      };
    },
  },
});
