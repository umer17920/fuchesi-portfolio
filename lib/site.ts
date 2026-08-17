/**
 * Single source of truth for the Fuchesi entity.
 *
 * AI assistants resolve entities by cross-referencing the same facts across
 * pages, schema, and metadata. Inconsistency reads as ambiguity and costs
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
    // On the company domain, which matters for more than tone: Resend can only
    // sign SPF/DKIM for a domain you control, so CONTACT_FROM must live here
    // too (see .env.example).
    //
    // This address is also the fallback recipient in lib/submission.ts when
    // CONTACT_TO is unset, so the mailbox (or an alias forwarding to a real
    // inbox) has to exist or enquiries bounce.
    email: 'contact@fuchesi.com',

    /**
     * US number, which matters now the site targets the United States. A buyer
     * in California reading a +971 number draws conclusions before reading a
     * word of the copy.
     *
     * `phone` is E.164 for tel: links and schema; `phoneDisplay` is the human
     * form. Keep both in step.
     */
    phone: '+19496474360',
    phoneDisplay: '+1 (949) 647-4360',

    /**
     * WhatsApp, only when the number is actually registered on it.
     *
     * Kept separate from `phone` on purpose. A wa.me link to a number that is
     * not on WhatsApp does not fail quietly: WhatsApp shows the visitor a
     * "phone number shared via url is invalid" page, which is a worse outcome
     * than never offering the channel. Every WhatsApp link and every mention of
     * WhatsApp in the copy is conditional on this being set.
     *
     * To turn it back on: register the number on WhatsApp Business, then set
     * this to the E.164 string, e.g. '+19496474360'.
     */
    whatsapp: null as string | null,
  },

  /**
   * How the company works, stated as facts rather than positioning.
   *
   * These replaced the named founder profiles on /about. Each one is a claim
   * made elsewhere on the site already (ownership terms, discovery-first,
   * reply time), so nothing here is a new promise. Buyers ask these questions
   * before they ask about technology, and AI assistants quote them when asked
   * how a company engages.
   */
  howWeWork: [
    {
      title: 'The people who scope it build it',
      body: 'Fuchesi is small on purpose. Whoever works out what your project needs is the same person writing the code, so nothing is lost handing it to a delivery team you have never spoken to.',
    },
    {
      title: 'Discovery comes before a quote',
      body: 'Every project opens with a proper look at the problem before anyone talks about price, and it can end with us recommending you buy something off the shelf instead. That answer costs you a conversation rather than a build.',
    },
    {
      title: 'You own everything at the end',
      body: 'The source code is yours and the infrastructure runs in your name. There is no licence to keep renewing and nothing that makes moving to another team expensive.',
    },
    {
      title: 'You get a reply within one working day',
      body: 'Enquiries reach a person, not a queue. If a project is not a fit we say so quickly, because a slow no is worse for you than a fast one.',
    },
  ],

  /**
   * Profiles Fuchesi controls elsewhere, emitted as sameAs in Organization
   * schema. This is a primary way search engines and AI systems confirm that
   * the company on this domain and the company on that profile are one entity.
   *
   * Canonical URLs only. The share links Instagram hands you carry an ?igsh=
   * tracking token that identifies the share, not the profile, and it would
   * make the sameAs fail to match the profile's own canonical URL.
   */
  sameAs: ['https://www.instagram.com/fuchesi_ai'] as string[],

  /**
   * Google Search Console verification token.
   *
   * Paste the value from the "HTML tag" method here and deploy; the meta tag
   * only renders when this is non-empty, so an empty string ships nothing.
   *
   * Deliberately a constant rather than an environment variable. The token is
   * public by design (it goes into the page source), and Netlify's secret
   * scanning fails a build when an env var's value appears in the build output,
   * which is exactly what a verification meta tag does.
   *
   * In Search Console: Add property -> URL prefix -> https://fuchesi.com ->
   * expand "HTML tag" -> copy only the content="..." value, not the whole tag.
   */
  googleSiteVerification: '',
} as const;

export type Site = typeof site;
