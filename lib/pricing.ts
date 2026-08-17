/**
 * Published prices and timelines. One file, because these numbers appear in
 * service copy, FAQ answers, JSON-LD Offers, and llms.txt, and a figure that
 * disagrees with itself across those surfaces is worse than no figure at all.
 *
 * CHANGE THEM HERE. Nothing else hard-codes a price.
 *
 * ---------------------------------------------------------------------------
 * How these were set
 * ---------------------------------------------------------------------------
 * Benchmarked against US market rates for 2026, then positioned at roughly
 * half to two-thirds of a US agency, which is the honest position for a small
 * team without US overheads. Going far lower reads as low quality to a US
 * buyer and starts a race Fuchesi cannot win on volume.
 *
 * The US references used:
 *   - custom software MVP           $25k-$80k, US agencies
 *   - US senior rates               $80-$180/hr vs $25-$70 offshore
 *   - paid discovery phase          $5k-$20k
 *   - ERP, single module            $30k-$80k
 *   - ERP, three modules            $80k-$160k
 *   - AI voice agent, custom build  $35k-$150k, scoped PoC $8k-$25k
 *   - AI voice, real running cost   $0.12-$0.25 per connected minute
 *   - annual maintenance            15-25% of build
 *
 * Every figure below is a FLOOR ("from"), not a quote. That is deliberate: it
 * qualifies out buyers with a $2,000 budget without committing to a number
 * before scope exists, and it stays true to the promise made everywhere else
 * on the site that scope and a fixed range are agreed in discovery.
 *
 * Discovery stays free. US agencies charge $5k-$20k for it, so it is a real
 * differentiator, and charging for it would contradict the insights post about
 * ending discovery with no invoice.
 */

export const CURRENCY = 'USD';
export const CURRENCY_SYMBOL = '$';

export type PriceBand = {
  /** Matches a Service slug in lib/services.ts. */
  serviceSlug: string;
  /** Lowest realistic engagement. Emitted as the Offer's minimum price. */
  from: number;
  /** Range for body copy, written out. */
  typical: string;
  /** Time to the first thing the client can actually use. */
  timeline: string;
  /** Ongoing cost after launch, where the service has one. */
  running?: string;
};

export const pricing: PriceBand[] = [
  {
    serviceSlug: 'software-development',
    from: 12000,
    typical: 'Most first releases land between $18,000 and $45,000',
    timeline: '6 to 10 weeks to a working first release',
  },
  {
    serviceSlug: 'erp-systems',
    from: 15000,
    typical:
      'A first module starts at $15,000, and three modules covering something like stock, orders, and invoicing typically land between $45,000 and $90,000',
    timeline: '8 to 12 weeks to the first module in real use',
  },
  {
    serviceSlug: 'ai-calling-agents',
    from: 8000,
    typical:
      'A single-workflow agent starts at $8,000, and agents handling several workflows with CRM and calendar integration typically land between $15,000 and $30,000',
    timeline: '3 to 5 weeks to a live agent taking real calls',
    running: '$0.18 to $0.30 per connected minute, telephony included',
  },
  {
    serviceSlug: 'lead-generation',
    from: 7000,
    typical: 'Most pipelines land between $7,000 and $18,000 to build',
    timeline: '3 to 4 weeks to leads arriving in your CRM',
    running: 'from $600 a month for data sources and hosting',
  },
  {
    serviceSlug: 'ai-workflow-automation',
    from: 4000,
    typical:
      'A single automation starts at $4,000, and a first phase covering several processes typically lands between $10,000 and $30,000',
    timeline: '2 to 4 weeks to the first automation running in production',
  },
];

export const getPricing = (slug: string) => pricing.find((p) => p.serviceSlug === slug);

/** Formats 12000 as "$12,000". */
export const formatPrice = (value: number) =>
  `${CURRENCY_SYMBOL}${value.toLocaleString('en-US')}`;

/**
 * Terms that apply across every engagement, kept here so the FAQ, the process
 * page, and llms.txt cannot drift apart.
 */
export const terms = {
  discovery:
    'Discovery is free. You get a written scope, a fixed price range, and a recommendation, including the recommendation not to build anything.',
  support:
    'Ongoing support is 15% of the build cost per year, or from $500 a month, and it is optional. You own the code and can take it elsewhere.',
  payment:
    'Projects are billed in stages against agreed milestones rather than up front.',
} as const;
