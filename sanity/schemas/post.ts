import { defineField, defineType } from 'sanity';

export const post = defineType({
  name: 'post',
  title: 'Insight',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'excerpt',
      type: 'text',
      rows: 3,
      description:
        'One or two sentences. Used on the index, as the meta description, and in search results — so write it as a summary, not a teaser.',
      validation: (r) => r.required().max(200),
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      description: 'Shown on the article and used for ordering.',
      validation: (r) => r.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'updatedAt',
      type: 'datetime',
      description:
        'Set this when you meaningfully revise a published post. It drives the visible "Updated" date, dateModified in schema, and lastmod in the sitemap — freshness signals that affect whether search and AI systems trust the page.',
    }),
    defineField({ name: 'author', type: 'reference', to: [{ type: 'author' }] }),
    defineField({
      name: 'coverImage',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alt text',
          description: 'Describe the image for screen readers. Required if the image conveys meaning.',
        }),
      ],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {
          type: 'block',
          // H1 is the page title; body headings start at H2 so the document
          // outline stays valid and machine-readable.
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading', value: 'h2' },
            { title: 'Subheading', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({ name: 'href', type: 'url', validation: (r) => r.required() }),
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
        },
      ],
      validation: (r) => r.required(),
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'publishedAt', media: 'coverImage' },
    prepare: ({ title, subtitle, media }) => ({
      title,
      subtitle: subtitle ? new Date(subtitle).toLocaleDateString('en-GB') : 'Unpublished',
      media,
    }),
  },
});
