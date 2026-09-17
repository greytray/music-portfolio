import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'beat',
  title: 'Beat / Audio Track',
  type: 'document',
  icon: () => '🎵',
  fields: [
    defineField({
      name: 'title',
      title: 'Beat Title',
      type: 'string',
      validation: (Rule) => Rule.required().error('Beat title is required'),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'arsenalRef',
      title: 'Linked Arsenal Master Track (Optional Pool Sync)',
      type: 'reference',
      to: [{ type: 'audioArsenal' }],
      description: 'Select an existing track from your central Audio Arsenal pool for 1-click sync.',
    }),
    defineField({
      name: 'audioFile',
      title: 'Audio File (Upload MP3/WAV)',
      type: 'file',
      options: {
        accept: 'audio/*',
      },
      description: 'Direct audio upload to Sanity CDN cloud storage.',
    }),
    defineField({
      name: 'audioUrl',
      title: 'External Audio URL (Fallback / Stream)',
      type: 'url',
      description: 'Optional external MP3 stream link if not uploading a direct file.',
    }),
    defineField({
      name: 'genre',
      title: 'Genre & Style',
      type: 'string',
      options: {
        list: [
          { title: 'Lo-Fi / Chillhop', value: 'Lo-Fi / Chillhop' },
          { title: 'Trap & Hip-Hop', value: 'Trap & Hip-Hop' },
          { title: 'K-Pop & Dance', value: 'K-Pop & Dance' },
          { title: 'Cinematic & Anime', value: 'Cinematic & Anime' },
          { title: 'Electronic & Melodic', value: 'Electronic & Melodic' },
          { title: 'R&B / Soul', value: 'R&B / Soul' },
          { title: 'Drill', value: 'Drill' },
          { title: 'Pop', value: 'Pop' },
          { title: 'Other / Custom', value: 'Other' },
        ],
      },
      initialValue: 'Lo-Fi / Chillhop',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bpm',
      title: 'Tempo (BPM)',
      type: 'number',
      initialValue: 120,
    }),
    defineField({
      name: 'key',
      title: 'Musical Key',
      type: 'string',
      placeholder: 'e.g. C Maj, G Min',
      initialValue: 'C Maj',
    }),
    defineField({
      name: 'duration',
      title: 'Duration Display',
      type: 'string',
      placeholder: 'e.g. 0:44, 2:30',
      initialValue: '0:45',
    }),
    defineField({
      name: 'description',
      title: 'Beat Description & Mood',
      type: 'text',
      rows: 3,
      placeholder: 'Describe the instrumentation, vibe, and artist style fits...',
    }),
    defineField({
      name: 'tags',
      title: 'Sound Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'prices',
      title: 'License Prices (USD $)',
      type: 'object',
      description: 'Real-time pricing matrix: Changes here update the checkout system directly.',
      fields: [
        defineField({
          name: 'mp3',
          title: 'MP3 Lease Price ($)',
          type: 'number',
          initialValue: 49,
          validation: (Rule) => Rule.min(0),
        }),
        defineField({
          name: 'wav',
          title: 'WAV Lease Price ($)',
          type: 'number',
          initialValue: 99,
          validation: (Rule) => Rule.min(0),
        }),
        defineField({
          name: 'stems',
          title: 'Stems / Trackout Price ($)',
          type: 'number',
          initialValue: 199,
          validation: (Rule) => Rule.min(0),
        }),
        defineField({
          name: 'exclusive',
          title: 'Exclusive Buyout Price ($)',
          type: 'number',
          initialValue: 599,
          validation: (Rule) => Rule.min(0),
        }),
      ],
    }),
    defineField({
      name: 'trackNumber',
      title: 'Sort Order / Track #',
      type: 'number',
      description: 'Used to sort tracks in the player and beat catalog (e.g. 1, 2, 3...)',
      initialValue: 1,
    }),
    defineField({
      name: 'isFeaturedInLandingPlayer',
      title: 'Feature in Landing Page Showcase Player',
      type: 'boolean',
      description: 'When enabled, this track appears in the top "The Work" audio player on the home page.',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      genre: 'genre',
      trackNumber: 'trackNumber',
      price: 'prices.mp3',
    },
    prepare(selection) {
      const { title, genre, trackNumber, price } = selection;
      return {
        title: `#${trackNumber || '-'} ${title || 'Untitled Beat'}`,
        subtitle: `${genre || 'Beat'} · MP3 $${price || 49}`,
      };
    },
  },
});
