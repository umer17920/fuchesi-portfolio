import { languageNames } from './languages';
import { CURRENCY, getPricing } from './pricing';
import { services, type Service } from './services';
import { site } from './site';

/**
 * JSON-LD builders.
 *
 * Every string here resolves from lib/site.ts — never retyped — because AI
 * systems disambiguate an entity by finding the same name, description, and
 * contact details repeated identically across pages, schema, and llms.txt.
 * Inconsistency reads as two different companies.
 *
 * Nodes are given stable @ids so they can reference one another instead of
 * duplicating the organisation on every page.
 */

export const ORG_ID = `${site.url}/#organization`;
export const WEBSITE_ID = `${site.url}/#website`;

/**
 * The market Fuchesi sells into.
 *
 * A named country is a far stronger signal than "Worldwide" for the
 * "software company in <place>" questions buyers and assistants actually ask.
 * Emitted as a Country node rather than a bare string so consumers can resolve
 * it rather than string-match it.
 *
 * This describes the market served, not where the company sits. Delivery
 * remains international; see the location FAQ in lib/faqs.ts, which has to stay
 * consistent with this.
 */
const AREA_SERVED = { '@type': 'Country', name: 'United States' } as const;

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.name,
    url: site.url,
    description: site.description,
    email: site.contact.email,
    /*
     * logo is what Google reads for the mark beside the company in search
     * results and any knowledge panel. It has to be a URL it can fetch, so it
     * points at the App Router icon route rather than an inline data URI.
     * `image` is the generic fallback for consumers that ignore `logo`.
     */
    logo: {
      '@type': 'ImageObject',
      url: `${site.url}/icon.png`,
      width: 512,
      height: 512,
    },
    image: `${site.url}/icon.png`,
    /*
     * The languages the company can actually do business in. This is the same
     * list the calling-agent pages advertise, so an assistant asked "can they
     * handle calls in Arabic" finds the claim in the entity as well as the copy.
     */
    knowsLanguage: languageNames,
    /*
     * The five offerings as a catalogue. Services already have their own Service
     * nodes on their own pages; this ties them to the organisation in one place
     * so an assistant reading only the home page still learns the full range.
     */
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${site.name} services`,
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          '@id': `${site.url}/services/${service.slug}#service`,
          name: service.name,
          serviceType: service.serviceType,
          url: `${site.url}/services/${service.slug}`,
        },
      })),
    },
    ...(site.sameAs.length > 0 ? { sameAs: site.sameAs } : {}),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: site.contact.email,
      telephone: site.contact.phone,
      areaServed: AREA_SERVED,
      availableLanguage: languageNames,
    },
  };
}

/**
 * An ordered list of pages.
 *
 * Index pages (services, work, insights) otherwise describe themselves only in
 * prose. Emitting the members as a list gives a crawler the set explicitly,
 * which is what lets an assistant answer "what services does Fuchesi offer"
 * without having to parse the layout.
 */
export function itemListSchema(
  name: string,
  items: { name: string; path: string; description?: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: `${site.url}${item.path}`,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: site.url,
    name: site.name,
    description: site.description,
    publisher: { '@id': ORG_ID },
  };
}

export function serviceSchema(service: Service) {
  const band = getPricing(service.slug);

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${site.url}/services/${service.slug}#service`,
    name: service.name,
    serviceType: service.serviceType,
    // The answer block, verbatim — the same sentences a reader sees at the top
    // of the page.
    description: service.answer,
    provider: { '@id': ORG_ID },
    areaServed: AREA_SERVED,
    url: `${site.url}/services/${service.slug}`,
    /*
     * A starting price, as a minimum rather than a fixed one.
     *
     * This is the single most citable fact a services page can carry: "how
     * much does X cost" is the question buyers and assistants ask first, and an
     * answer with a number in it gets quoted where "depends on scope" does not.
     * MinPrice is the honest shape, since the real quote comes out of discovery.
     */
    ...(band
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: CURRENCY,
            priceSpecification: {
              '@type': 'PriceSpecification',
              priceCurrency: CURRENCY,
              minPrice: band.from,
              valueAddedTaxIncluded: false,
            },
            availability: 'https://schema.org/InStock',
            url: `${site.url}/services/${service.slug}`,
          },
        }
      : {}),
    ...(service.slug === 'ai-calling-agents'
      ? { availableLanguage: languageNames }
      : {}),
  };
}

/**
 * A case study, as an Article about the services it used.
 *
 * schema.org has no CaseStudy type, so Article is the honest fit: it is a
 * written piece with an author, a date and a subject. The subject matters more
 * than the type here. `about` points at the Service nodes the project used, so
 * an assistant asked for evidence that this company has delivered ERP work can
 * follow the edge from the service to a real project rather than inferring it
 * from prose.
 *
 * No aggregateRating and no review: those assert third-party judgements that
 * nobody has given. See content/case-studies.seed.ts.
 */
export function caseStudySchema(study: {
  slug: string;
  title: string;
  summary: string;
  client: string | null;
  services: string[];
  publishedAt: string;
  updatedAt?: string | null;
  image?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${site.url}/work/${study.slug}#casestudy`,
    headline: study.title,
    description: study.summary,
    url: `${site.url}/work/${study.slug}`,
    datePublished: study.publishedAt,
    dateModified: study.updatedAt ?? study.publishedAt,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: 'en-GB',
    articleSection: 'Case study',
    // The services this project actually used, by the same @id their own pages
    // publish, so the two nodes resolve to one thing.
    ...(study.services.length > 0
      ? {
          about: study.services.map((slug) => ({
            '@type': 'Service',
            '@id': `${site.url}/services/${slug}#service`,
          })),
        }
      : {}),
    ...(study.client ? { mentions: { '@type': 'Organization', name: study.client } } : {}),
    ...(study.image ? { image: study.image } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${site.url}/work/${study.slug}` },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${site.url}${crumb.path}`,
    })),
  };
}

export function articleSchema(article: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string | null;
  image?: string | null;
  /** Plain-text body, used only to derive wordCount. */
  text?: string | null;
  section?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${site.url}/insights/${article.slug}#article`,
    headline: article.title,
    description: article.description,
    url: `${site.url}/insights/${article.slug}`,
    datePublished: article.publishedAt,
    // Freshness: dateModified must reflect the real last edit, and match the
    // visible "Updated" date and the sitemap's lastmod.
    dateModified: article.updatedAt ?? article.publishedAt,
    publisher: { '@id': ORG_ID },
    // Articles are published under the company rather than a named byline.
    // Organization is a valid Article.author, so this keeps the schema whole.
    author: { '@id': ORG_ID },
    inLanguage: 'en-GB',
    isPartOf: { '@id': WEBSITE_ID },
    ...(article.section ? { articleSection: article.section } : {}),
    // Length is a genuine relevance signal for assistants choosing between
    // sources. Counted from the real body rather than estimated.
    ...(article.text
      ? { wordCount: article.text.trim().split(/\s+/).filter(Boolean).length }
      : {}),
    ...(article.image ? { image: article.image } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${site.url}/insights/${article.slug}` },
  };
}
