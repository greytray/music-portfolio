import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'audioArsenal',
  title: 'Audio Arsenal Track',
  type: 'document',
  icon: () => '🎧',
  fields: [
    defineField({
      name: 'title',
      title: 'Track Title',
      type: 'string',
      validation: (Rule) => Rule.required().error('Track title is required'),
    }),
    defineField({
      name: 'audioFile',
      title: 'Audio File (MP3 / WAV / Lossless)',
      type: 'file',
      options: {
        accept: 'audio/*',
      },
      description: 'Upload audio file directly to Sanity CDN cloud asset storage.',
    }),
    defineField({
      name: 'audioUrl',
      title: 'External Stream URL (Fallback)',
      type: 'url',
      description: 'Alternative direct audio link if hosted externally.',
    }),
    defineField({
      name: 'category',
      title: 'Arsenal Category',
      type: 'string',
      options: {
        list: [
          { title: 'Master Production Beat', value: 'beat' },
          { title: 'Instrumental / Stems', value: 'stems' },
          { title: 'Sample / Sound Pack', value: 'sample' },
          { title: 'Vocal Snippet / FX', value: 'fx' },
          { title: 'Full Mixdown Demo', value: 'demo' },
        ],
      },
      initialValue: 'beat',
    }),
    defineField({
      name: 'genre',
      title: 'Genre / Style',
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
    }),
    defineField({
      name: 'bpm',
      title: 'BPM (Tempo)',
      type: 'number',
      initialValue: 120,
    }),
    defineField({
      name: 'key',
      title: 'Musical Key',
      type: 'string',
      placeholder: 'e.g. C Maj, F# Min',
      initialValue: 'C Maj',
    }),
    defineField({
      name: 'duration',
      title: 'Duration (e.g. 0:45, 2:30)',
      type: 'string',
      placeholder: '0:45',
      initialValue: '0:45',
    }),
    defineField({
      name: 'assignedSlot',
      title: 'Currently Assigned Live Slot',
      type: 'string',
      description: 'The website player slot or showcase position this track is actively occupying.',
      options: {
        list: [
          { title: 'Unassigned (Standby in Arsenal Pool)', value: 'unassigned' },
          { title: 'Showcase Slot 1 (Featured Landing Track #1)', value: 'slot_1' },
          { title: 'Showcase Slot 2 (Featured Landing Track #2)', value: 'slot_2' },
          { title: 'Showcase Slot 3 (Featured Landing Track #3)', value: 'slot_3' },
          { title: 'Showcase Slot 4 (Featured Landing Track #4)', value: 'slot_4' },
          { title: 'Showcase Slot 5 (Featured Landing Track #5)', value: 'slot_5' },
          { title: 'Beats Catalog Regular', value: 'catalog' },
        ],
      },
      initialValue: 'unassigned',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'notes',
      title: 'Internal Production Notes',
      type: 'text',
      rows: 2,
      placeholder: 'Analog gear used, mixing notes, stem availability...',
    }),
    defineField({
      name: 'isArchived',
      title: 'Archive from Active Pool',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      genre: 'genre',
      assignedSlot: 'assignedSlot',
      duration: 'duration',
    },
    prepare({ title, genre, assignedSlot, duration }) {
      const slotLabel = assignedSlot && assignedSlot !== 'unassigned' ? `[${assignedSlot.toUpperCase()}] ` : '[POOL] ';
      return {
        title: `${slotLabel}${title || 'Untitled Track'}`,
        subtitle: `${genre || 'Beat'} · ${duration || '--:--'}`,
      };
    },
  },
});
