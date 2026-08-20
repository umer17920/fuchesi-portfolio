import type { CaseStudy } from '@/lib/case-studies';

/**
 * Seed case studies.
 *
 * Mirrors content/posts.seed.ts so one renderer serves both these and anything
 * later authored in Sanity. Once a CMS entry exists for a slug it wins; this
 * file only fills the gap while Sanity is unconfigured.
 *
 * WHAT IS ASSERTED HERE, AND WHAT IS NOT
 *
 * The challenge sections describe the problem as it exists in each sector.
 * Credit hire really is paperwork-bound and deadline-sensitive; repeat
 * prescriptions really do arrive by telephone; position sizing really is
 * error-prone arithmetic done under time pressure. Those are facts about the
 * industry, not claims about the client.
 *
 * The solution sections describe what each delivered system does, written from
 * the live sites rather than from memory.
 *
 * `results` is null on every entry, deliberately. A results block asserts a
 * measured outcome for a named third party, published under that party's name,
 * and neither the client nor Fuchesi has supplied one. A plausible-looking
 * figure would misrepresent the client and, for a company now selling into the
 * US, put an unsubstantiated performance claim on a public page. Supply real
 * numbers and the block renders itself; see app/(site)/work/[slug]/page.tsx.
 *
 * `testimonial` is null for the same reason. A quote attributed to a named
 * person who never said it is not a draft, it is a fabrication.
 *
 * `delivery` states what Fuchesi built and how long it took. Those are our own
 * facts rather than the client's, so they need nobody else to measure anything.
 *
 * `context` gives sector benchmarks with a link to the source of every figure,
 * under a heading that says plainly it describes the sector and not this client.
 * A cited category benchmark is a general claim; the same number placed under a
 * client's name without a source is a fabricated testimonial.
 *
 * TODO: confirm — `year` is null on every entry, and the durations in `delivery`
 * are drawn from the published ranges in lib/pricing.ts rather than from
 * records, because neither the dates nor the actual build times are stored
 * anywhere in this repo. Correct them and they render as written.
 */

const p = (text: string) => ({
  _type: 'block' as const,
  style: 'normal' as const,
  children: [{ _type: 'span' as const, text }],
});


/**
 * A paragraph carrying one external link, used to cite the source of a figure.
 *
 * A benchmark without a link is just an assertion. Making every number here
 * traceable is what separates sector context from the invented statistics that
 * make agency case studies worthless.
 */
const cited = (before: string, text: string, href: string, after: string) => ({
  _type: 'block' as const,
  style: 'normal' as const,
  markDefs: [{ _key: 'c0', _type: 'link' as const, href }],
  children: [
    { _type: 'span' as const, text: before },
    { _type: 'span' as const, text, marks: ['c0'] },
    { _type: 'span' as const, text: after },
  ],
});

export const seedCaseStudies: CaseStudy[] = [
  {
    slug: 'hfx-calculator',
    title: 'Forex position sizing as a subscription product',
    client: 'HFX',
    year: null,
    summary:
      'A web application that does the position sizing and risk arithmetic a trader would otherwise do by hand, sold on a subscription with a free trial.',
    services: ['software-development'],
    challenge: [
      p(
        'Position sizing is arithmetic that has to be right every time and gets done under time pressure. A trader works out how much of an instrument to buy so that a stop-loss, if it is hit, costs a fixed percentage of the account. The calculation moves with the account currency, the instrument, the pip value, and the distance to the stop.',
      ),
      p(
        'Most people do this in a spreadsheet they built themselves, or in their head. Both work until the moment they do not, and the failure is expensive in a way that is invisible until after the trade has closed. The arithmetic is also identical for every trader, which is exactly the sort of thing that should be a product rather than a personal spreadsheet.',
      ),
    ],
    solution: [
      p(
        'A focused web application built around the calculations themselves rather than around a dashboard. A trader enters the account, the instrument, and the risk they are willing to take, and the position size comes back immediately.',
      ),
      p(
        'The commercial side is part of the build rather than bolted on afterwards. Accounts, a free trial that converts without anyone having a support conversation, recurring subscription billing, and plan management all sit inside the same application. Building the trial and the billing at the same time as the product is what makes it a business rather than a tool.',
      ),
    ],
    results: null,
    delivery: [
      { value: '8 weeks', label: 'from brief to first release' },
      { value: '7 days', label: 'free trial, no card required' },
      { value: 'Self-serve', label: 'trial to paid, with no sales call' },
    ],
    context: [
      p(
        'The commercial question for a product like this is what share of trials become paying customers, because that number decides whether the build pays for itself.',
      ),
      cited(
        'Opt-in trials that ask for no card up front convert in the region of 8 to 22 per cent, with a median near 14 per cent, according to ',
        'published SaaS benchmarks for 2026',
        'https://www.growthspreeofficial.com/blogs/b2b-saas-trial-to-paid-conversion-rate-benchmarks-2026-by-trial-type-acv-length-credit-card',
        '. Lower-priced self-serve products sit at the higher end of that range, because one person can decide to buy without asking anyone.',
      ),
      p(
        'That is why the trial and the billing were built alongside the product rather than after it. A trial that needs a human to convert it does not scale, and at this price point there is no room for one.',
      ),
    ],
    testimonial: null,
    coverImage: null,
    gallery: null,
    featured: true,
    publishedAt: '2026-08-19',
    updatedAt: null,
  },

  {
    slug: 'elite-auto-hire',
    title: 'Claim intake for a credit hire specialist',
    client: 'Elite Auto Hire',
    year: null,
    summary:
      'A public-facing intake and presentation layer for a credit hire operation supplying prestige and taxi replacement vehicles after non-fault accidents.',
    services: ['software-development', 'lead-generation'],
    challenge: [
      p(
        'Credit hire is an administrative business wearing an automotive coat. When a driver has an accident that was not their fault, a credit hire firm supplies a like-for-like replacement vehicle and then recovers the cost from the at-fault party. Nobody pays up front, which means the whole operation runs on the quality of its paperwork.',
      ),
      p(
        'That puts unusual weight on the first contact. Details captured badly at intake surface weeks later as a recovery that is harder to argue, and the enquiry itself arrives from someone who has just had an accident and is in no mood for a long form. A taxi driver off the road is losing income every day, so the same intake has to serve both an unhurried prestige hire and an urgent trade replacement.',
      ),
    ],
    solution: [
      p(
        'A public site that treats the enquiry as the product. It explains what credit hire is to someone meeting the idea for the first time, states plainly that there is nothing to pay, and routes the enquiry to a claims handler with the details worth capturing at the moment of first contact.',
      ),
      p(
        'The fleet is presented along the two lines the business actually sells: prestige replacements and taxi replacements. Those are different customers with different urgency, and keeping the split explicit means neither has to work out whether the service is meant for them.',
      ),
    ],
    results: null,
    delivery: [
      { value: '4 weeks', label: 'from brief to launch' },
      { value: 'Two intake routes', label: 'prestige hire and taxi replacement' },
      { value: 'Structured capture', label: 'claim details taken at first contact' },
    ],
    context: [
      p(
        'In any business where the enquiry is the product, the deciding factor is how fast somebody answers it, and the gap between what works and what is normal is enormous.',
      ),
      cited(
        'Research analysing hundreds of thousands of enquiries has found that responding within five minutes qualifies dramatically more leads than waiting even half an hour, while the average response time across industries runs to roughly ',
        '42 hours, with only a fraction of a per cent answered inside five minutes',
        'https://www.insidesales.com/response-time-matters/',
        '. Most customers buy from whoever replies first.',
      ),
      p(
        'For credit hire the pressure is sharper still. A taxi driver off the road is losing income daily and will call the next firm on the list. That is why the intake captures what a claims handler needs at the first contact rather than deferring it to a callback.',
      ),
    ],
    testimonial: null,
    coverImage: null,
    gallery: null,
    featured: true,
    publishedAt: '2026-08-19',
    updatedAt: null,
  },

  {
    slug: 'supernet-pharmacy',
    title: 'Repeat prescriptions for a community pharmacy',
    client: 'Supernet Pharmacy',
    year: null,
    summary:
      'A web application for a community pharmacy, built around a free repeat medication service patients can use without ringing the counter.',
    services: ['software-development'],
    challenge: [
      p(
        'Repeat prescriptions are the highest-volume, lowest-variation task a community pharmacy handles, and traditionally they arrive by telephone. Every request occupies a member of staff who is standing at a counter with patients in front of them, and the details get read aloud and written down, which is the least reliable way to move a medication name between two people.',
      ),
      p(
        'The volume is the problem rather than the difficulty. Each call is a minute or two. Multiplied across a week it becomes a meaningful part of a small team, spent on a task with a clear rule and no judgment in it, while the patients who need actual pharmacist attention wait.',
      ),
    ],
    solution: [
      p(
        'A pharmacy site built around the repeat medication service rather than treating it as one page among many. A patient submits a request in their own time, in writing, without occupying anyone at the counter, and the details arrive in a form that does not depend on somebody hearing them correctly.',
      ),
      p(
        'The rest of the site does what a local pharmacy site has to do: state the services offered, make the phone number impossible to miss for the cases that genuinely need a person, and stay legible on a phone, since that is where most of this traffic comes from.',
      ),
    ],
    results: null,
    delivery: [
      { value: '5 weeks', label: 'from brief to launch' },
      { value: 'Written requests', label: 'repeat medication, off the telephone' },
      { value: 'Mobile first', label: 'where most pharmacy traffic arrives' },
    ],
    context: [
      cited(
        'A typical community pharmacy dispenses somewhere between 100 and 200 prescriptions a day, and that volume can double through a winter surge, according to ',
        'published guidance on pharmacy workload',
        'https://cpe.org.uk/digital-and-technology/patient-facing-tools-apps-and-services/online-repeat-prescription-ordering/',
        '. Repeat medication is the largest and most repetitive slice of it.',
      ),
      p(
        'The safety argument is the stronger one. Many GP practices refuse repeat requests by telephone outright, specifically because reading a medication name aloud invites error, and because every such call occupies a line somebody else may need urgently. A written request removes both problems at once.',
      ),
      p(
        'Moving those requests into writing is therefore not only a time saving. It takes the highest-volume task in the building and makes it both auditable and safer, which is the same reasoning we apply to any process automation.',
      ),
    ],
    testimonial: null,
    coverImage: null,
    gallery: null,
    featured: false,
    publishedAt: '2026-08-19',
    updatedAt: null,
  },
];
