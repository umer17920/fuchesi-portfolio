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

/**
 * A paragraph containing one internal link.
 *
 * Portable Text puts links in `markDefs` and references them by key from the
 * span, which is the shape Sanity emits and components/shared/Prose.tsx already
 * renders. Writing it by hand here keeps seed posts and CMS posts on one code
 * path.
 *
 * Internal links from articles to service pages are the part of SEO this site
 * can actually control: they pass authority to the pages meant to rank and they
 * give an assistant a route from a question to the offering that answers it.
 */
const linked = (before: string, text: string, href: string, after: string) => ({
  _type: 'block' as const,
  style: 'normal' as const,
  markDefs: [{ _key: 'l0', _type: 'link' as const, href }],
  children: [
    { _type: 'span' as const, text: before },
    { _type: 'span' as const, text, marks: ['l0'] },
    { _type: 'span' as const, text: after },
  ],
});

const bullets = (items: string[]) =>
  items.map((text) => ({
    _type: 'block' as const,
    style: 'normal' as const,
    listItem: 'bullet' as const,
    level: 1,
    children: [{ _type: 'span' as const, text }],
  }));

export const seedPosts: Post[] = [
  {
    slug: 'which-tasks-are-worth-automating',
    title: 'How to tell if a task is worth automating',
    excerpt:
      'A four-question test for deciding whether a repetitive task should be automated, left alone, or fixed at the process level first. Most tasks fail on the second question.',
    publishedAt: '2026-08-04',
    updatedAt: null,
    authorName: 'Fuchesi',
    authorSlug: null,
    coverImage: null,
    body: [
      p(
        'Most automation projects that go wrong were not badly built. They automated something that should not have been automated, and the build was the last place anyone would have caught it.',
      ),
      p(
        'Here is the test we run in discovery, in the order we run it. A task has to pass all four. Most fail on the second.',
      ),

      h2('1. Does it happen often enough to matter?'),
      p(
        'Count the actual instances over a month, not the ones that stick in your memory. A task that stings every time but happens twice a quarter is a bad candidate, because the annoyance is vivid while the hours are trivial.',
      ),
      p(
        'The number that matters is total hours per month, not minutes per instance. Ten minutes a day is a working week a year. Two hours once a month is not.',
      ),

      h2('2. Is the rule writable?'),
      p(
        'Ask whoever does the task to explain the decision to you as if you were starting on Monday. If they can, the rule is writable and a system can hold it. If the explanation keeps arriving at "you get a feel for it", you have found judgment, not process.',
      ),
      p(
        'This is the question most tasks fail, and they fail it quietly. People describe their work as more rule-based than it is, because the exceptions are handled so automatically that they stop registering as decisions. Watch the work rather than asking about it and the exceptions show up fast.',
      ),
      p(
        'Failing this question is not a dead end. It usually means the automation should handle the ninety per cent that is rule-based and route the rest to a person, rather than trying to swallow the whole task.',
      ),

      h2('3. Is the input stable enough to depend on?'),
      p(
        'Automation reads something: a form, an email, an invoice, a spreadsheet, a message from another system. The question is whether that input holds its shape.',
      ),
      p(
        'A supplier who sends the same PDF layout every month is stable. A supplier who redesigns their invoice whenever their template changes is not, and an automation built on that will break silently and be trusted for weeks after it stopped working. That is worse than never having built it.',
      ),
      p(
        'Where the input is unstable, the fix is usually upstream. Getting the supplier onto a consistent format is cheaper than building software clever enough to cope with an inconsistent one.',
      ),

      h2('4. What happens when it gets it wrong?'),
      p(
        'Not whether it will. It will. The question is what the wrong answer costs and who notices.',
      ),
      p('Sort the failure into one of three buckets:'),
      ...bullets([
        'Visible and cheap. A misfiled document that someone spots and moves. Automate freely.',
        'Visible and expensive. A wrong invoice that a customer receives. Automate with an approval step before anything leaves the building.',
        'Invisible and expensive. A quietly mis-scored lead that nobody ever audits. This is the dangerous one, and it needs logging and sampling before it needs automating.',
      ]),
      p(
        'The third bucket is where automation earns its bad reputation. The system appears to work, the numbers drift, and the cause surfaces two quarters later.',
      ),

      h2('The test in one line'),
      p(
        'Automate work that happens often, follows a rule you can write down, reads something predictable, and fails in a way somebody notices. Change the process first when it fails on stability, and design a handoff when it fails on judgment.',
      ),
      linked(
        'That handoff design is most of the work on a real project, which is why we treat it as the deliverable rather than an afterthought. There is more on how we scope it on the ',
        'AI workflow automation',
        '/services/ai-workflow-automation',
        ' page.',
      ),
      linked(
        'It is also why every engagement opens with discovery instead of a quote: the four questions above are answered by watching how the work actually happens, not by reading a requirements document. Our ',
        'process',
        '/process',
        ' page sets out what each stage produces.',
      ),
    ],
  },

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
