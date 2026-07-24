import { defineArrayMember, defineField, defineType } from 'sanity';

export const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Case study',
  type: 'document',
  groups: [
    { name: 'basics', title: 'Basics', default: true },
    { name: 'story', title: 'Challenge / Solution / Results' },
    { name: 'media', title: 'Media' },
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'basics',
      description: 'The project name, as it should appear. Keep it identical to the work index.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'basics',
      options: { source: 'title', maxLength: 96 },
      description:
        'Must match the project slug on the work index so the two link up (e.g. "silver-halo").',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'client',
      type: 'string',
      group: 'basics',
      description: 'Leave empty if the client cannot be named.',
    }),
    defineField({
      name: 'year',
      type: 'string',
      group: 'basics',
      description: 'e.g. 2024, or 2023–2024 for ongoing work.',
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      group: 'basics',
      description:
        'Two sentences: what this was and what it achieved. Used on the index, as the meta description, and as the first thing an AI assistant quotes. Lead with the outcome.',
      validation: (r) => r.required().max(240),
    }),
    defineField({
      name: 'services',
      type: 'array',
      group: 'basics',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Software Development', value: 'software-development' },
          { title: 'Custom ERP Systems', value: 'erp-systems' },
          { title: 'AI Calling Agents', value: 'ai-calling-agents' },
          { title: 'Lead Generation', value: 'lead-generation' },
          { title: 'AI Workflow Automation', value: 'ai-workflow-automation' },
        ],
      },
      description: 'Which offerings this project demonstrates. Drives related links.',
    }),

    defineField({
      name: 'challenge',
      type: 'array',
      group: 'story',
      of: [defineArrayMember({ type: 'block', styles: [{ title: 'Normal', value: 'normal' }] })],
      description:
        'What was actually wrong before we started — in the client’s terms, not ours. Concrete beats abstract: "three staff spent every Monday reconciling stock by hand" is worth more than "inefficient processes".',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'solution',
      type: 'array',
      group: 'story',
      of: [defineArrayMember({ type: 'block', styles: [{ title: 'Normal', value: 'normal' }] })],
      description: 'What we built, and why it was the right thing to build. Name the real decisions.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'results',
      title: 'Results (measurable)',
      type: 'array',
      group: 'story',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'result',
          fields: [
            defineField({
              name: 'value',
              type: 'string',
              description: 'The number. e.g. "94%", "3.2×", "11 hours/week", "£40k".',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'label',
              type: 'string',
              description: 'What the number is. e.g. "reduction in manual reconciliation time".',
              validation: (r) => r.required(),
            }),
          ],
          preview: { select: { title: 'value', subtitle: 'label' } },
        }),
      ],
      description:
        'Two or three real, measurable outcomes. This is the single most valuable field on the page: AI assistants cite specific numbers and ignore adjectives, and buyers do the same. If you do not have a real number, leave this empty rather than inventing one — an empty results block is honest, a fabricated one is not.',
      validation: (r) => r.max(4),
    }),
    defineField({
      name: 'testimonial',
      type: 'object',
      group: 'story',
      fields: [
        defineField({ name: 'quote', type: 'text', rows: 3 }),
        defineField({ name: 'attribution', type: 'string', description: 'Name, role, company.' }),
      ],
      description: 'Optional. Only with the client’s permission.',
    }),

    defineField({
      name: 'coverImage',
      type: 'image',
      group: 'media',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
      description:
        'Optional. Without one, the site falls back to the automated screenshot of the live site, or a typographic cover.',
    }),
    defineField({
      name: 'gallery',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
        }),
      ],
    }),

    defineField({
      name: 'featured',
      type: 'boolean',
      group: 'basics',
      description: 'Show on the home page. Keep this to about six.',
      initialValue: false,
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      group: 'basics',
      validation: (r) => r.required(),
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'updatedAt',
      type: 'datetime',
      group: 'basics',
      description:
        'Set when you revise this. Drives the visible "Updated" date, dateModified in schema, and sitemap lastmod.',
    }),
  ],
  orderings: [
    { title: 'Newest first', name: 'publishedDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'client', media: 'coverImage' },
  },
});
