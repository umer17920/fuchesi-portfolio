import type { Post } from '@/lib/posts';

/**
 * Seed posts.
 *
 * These demonstrate the article template and keep /insights populated before
 * Sanity is wired up. They are authored in the same Portable Text shape the CMS
 * emits, so one renderer serves both and there is no second code path to rot.
 *
 * Once Sanity is configured, import these with `node scripts/seed-sanity.mjs`
 * and they become editable documents; the site then reads the CMS and ignores
 * this file entirely.
 *
 * TODO: confirm — the content is drafted, not fact-checked. Anything with a
 * number in it needs your eye before this goes live.
 */

const p = (text: string) => ({
  _type: 'block' as const,
  style: 'normal' as const,
  children: [{ _type: 'span' as const, text }],
});

const h2 = (text: string) => ({
  _type: 'block' as const,
  style: 'h2' as const,
  children: [{ _type: 'span' as const, text }],
});

export const seedPosts: Post[] = [
  {
    slug: 'what-a-custom-erp-actually-costs',
    title: 'What a custom ERP actually costs',
    excerpt:
      'Custom ERP pricing is quoted per module, not as one number. Here is what drives the figure, and when an off-the-shelf product is the cheaper answer.',
    publishedAt: '2026-06-18',
    updatedAt: null,
    authorName: 'Fuchesi',
    authorSlug: null,
    coverImage: null,
    body: [
      p(
        'The honest answer to "what does a custom ERP cost" is that nobody can tell you over email, and anyone who does is quoting a number they intend to revise later. But that is not a useful answer either, so here is what actually drives it.',
      ),
      h2('It is priced per module, not as a system'),
      p(
        'A custom ERP is not one purchase. It is a sequence of them. You start with whatever is causing the most pain, usually stock, orders, or job scheduling, and that first module gets priced like a focused internal tool, because that is what it is. Each later module is quoted when you decide to build it.',
      ),
      p(
        'This matters for cash flow as much as for risk. You are never writing one large cheque against a system you have not seen.',
      ),
      h2('What actually moves the number'),
      p(
        'How unusual your process is. If your operation looks like every other operation in your sector, you are paying us to rebuild something you could have configured. If the thing that makes you competitive is also the thing your current tools handle worst, that is where custom earns its cost.',
      ),
      p(
        'How many systems it has to talk to. Integration is usually cheaper than replacement, but every integration is real work, and the older the system on the other side, the more of it there is.',
      ),
      p(
        'How much of your data needs moving, and what state it is in. Migration is planned in discovery rather than discovered in month three, and messy data is a cost whether or not you address it.',
      ),
      h2('When you should not do this'),
      p(
        'If a configurable product covers you, buy the product. We will tell you that in discovery, and it is the cheapest conversation you will have with us. Custom software is worth it when the alternative is running your real process in a spreadsheet next to the ERP you already pay for.',
      ),
    ],
  },

  {
    slug: 'what-ai-calling-agents-can-and-cannot-do',
    title: 'What AI calling agents can and cannot do',
    excerpt:
      'AI calling agents handle real phone conversations in the caller’s language. They are good at some jobs, bad at others, and the difference matters more than the demo suggests.',
    publishedAt: '2026-06-30',
    updatedAt: null,
    authorName: 'Fuchesi',
    authorSlug: null,
    coverImage: null,
    body: [
      p(
        'Voice agents demo extremely well, which is exactly the problem. A demo is a call that goes as expected. The value is in what happens on the ones that do not.',
      ),
      h2('What they are genuinely good at'),
      p(
        'Answering every call at peak instead of losing the overflow. This is the one that pays for itself: most businesses do not lose calls because their people are bad, they lose them because eleven rang at once.',
      ),
      p(
        'Qualifying a lead the moment it arrives rather than the next morning. Speed to first contact moves conversion more than almost anything else in a sales process, and an agent does not sleep.',
      ),
      p(
        'Booking, confirming, and chasing appointments. Bounded task, clear success condition, no judgment required.',
      ),
      p(
        'Speaking the caller’s language. An agent can hold the conversation in English, Arabic, Urdu, or Hindi, and switch mid-call when the caller does. In some markets that is just how people talk.',
      ),
      h2('What they are bad at'),
      p(
        'Anything where being wrong is expensive and the rule is unclear. If you cannot write down how the decision gets made, an agent should not be making it.',
      ),
      p(
        'Being the last line. An agent that cannot hand off gracefully is worse than a voicemail, because it wastes the caller’s time before failing them. Knowing when to transfer is most of the design work, not an afterthought: on request, on frustration, on anything outside its remit.',
      ),
      h2('Say that it is an AI'),
      p(
        'We build agents that disclose it when asked, and we recommend disclosing up front. It is the honest choice, and in a growing number of jurisdictions it is the legal one. It also costs you very little: people mind being deceived far more than they mind talking to a machine that is useful.',
      ),
    ],
  },

  {
    slug: 'we-start-by-trying-to-talk-you-out-of-it',
    title: 'We start by trying to talk you out of it',
    excerpt:
      'Discovery exists to work out whether the software should be built at all. Sometimes the answer is no, and saying so early is the whole point.',
    publishedAt: '2026-07-09',
    updatedAt: null,
    authorName: 'Fuchesi',
    authorSlug: null,
    coverImage: null,
    body: [
      p(
        'Every project we take on starts with a conversation about whether it should exist. That is not a rhetorical move. We have ended discovery by recommending a £30-a-month product and sending no invoice.',
      ),
      h2('Why that is not against our interests'),
      p(
        'Software you did not need is software you resent paying to maintain. It gets abandoned, and the abandonment gets attributed to whoever built it. A project that should not have started damages us more slowly and more thoroughly than one we declined.',
      ),
      h2('What we are actually looking for'),
      p(
        'Whether the pain is real and measurable, or a frustration that would survive the rebuild. Whether the process you describe is the process that happens. In most businesses those are two different documents, and the gap between them is where projects fail.',
      ),
      p(
        'Whether an existing product covers eighty per cent of it. If it does, buy the product and spend the difference on the twenty per cent that is actually yours.',
      ),
      h2('What you get either way'),
      p(
        'A written scope, a fixed price range, and a clear recommendation, up to and including the recommendation not to proceed. It is a cheaper conversation than the alternative, and you can have it before committing to anything.',
      ),
    ],
  },
];
