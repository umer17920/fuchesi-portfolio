import { defineField, defineType } from 'sanity';

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'role', type: 'string', description: 'e.g. Founder' }),
    defineField({
      name: 'bio',
      type: 'text',
      rows: 3,
      description: 'One or two sentences. Shown beneath articles.',
    }),
    defineField({ name: 'photo', type: 'image', options: { hotspot: true } }),
  ],
  preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
});
