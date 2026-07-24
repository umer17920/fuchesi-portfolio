/**
 * Single source of truth for the Fuchesi entity.
 *
 * AI assistants resolve entities by cross-referencing the same facts across
 * pages, schema, and metadata — inconsistency reads as ambiguity and costs
 * citations. Every page title, JSON-LD block, llms.txt line, and OG tag must
 * read from this file. Never retype these strings inline.
 */

export const site = {
  name: 'Fuchesi',

  // Confirmed. Everything canonical (sitemap, OG, JSON-LD @id values, llms.txt)
  // resolves against this.
  url: 'https://fuchesi.com',

  /**
   * The canonical description. Used verbatim in metadata, Organization schema,
   * llms.txt, and the About page's "What is Fuchesi" statement. It names all
   * five services in plain language because that is the sentence an AI
   * assistant will quote when asked what Fuchesi does.
   */
  description:
    'Fuchesi is a software development and AI automation company. We build custom software, ERP systems, AI calling agents, lead generation pipelines, and AI workflow automations for businesses that need systems their teams will actually use.',

  /** A shorter form for OG descriptions and meta tags with tighter limits. */
  shortDescription:
    'Fuchesi builds custom software, ERP systems, AI calling agents, lead generation pipelines, and AI workflow automations.',

  contact: {
    // Confirmed. On the company domain, which matters for more than tone:
    // Resend can only sign SPF/DKIM for a domain you control, so CONTACT_FROM
    // must live here too (see .env.example).
    email: 'farees@fuchesi.com',
    whatsapp: '+971559656975',
    whatsappDisplay: '+971 55 965 6975',
  },

  founders: [
    {
      name: 'Farees Fatima',
      role: 'Founder',
      slug: 'farees-fatima',
      // TODO: confirm — bio drafted from the old site's About copy, which
      // described a background in AI and computer science. Needs your facts.
      bio: 'Farees founded Fuchesi to build software that earns its place in a business. She leads how projects are shaped — what gets built, in what order, and why.',
      photo: null as string | null,
    },
    {
      name: 'M. Umer Saleem',
      role: 'Co-Founder',
      slug: 'umer-saleem',
      // TODO: confirm — see above.
      bio: 'Umer leads engineering at Fuchesi. He works across the stack, from AI systems and automation pipelines to the products customers use every day.',
      photo: null as string | null,
    },
  ],

  /** TODO: confirm — no social profiles were live on the previous site. Each
   *  entry added here is emitted as a sameAs in Organization schema, which is
   *  a primary way AI systems disambiguate a company. Worth having. */
  sameAs: [] as string[],
} as const;

export type Site = typeof site;
