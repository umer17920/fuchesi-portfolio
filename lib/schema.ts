import { languageNames } from './languages';
import type { Service } from './services';
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

const personId = (slug: string) => `${site.url}/about#${slug}`;

/**
 * TODO: confirm — areaServed. Deliberately left as worldwide because an earlier
 * commit removed a location reference from the site and I will not re-assert
 * one you took out. This is worth settling: areaServed is a strong signal for
 * "software company in <place>" style questions, and "Worldwide" is the weakest
 * possible answer.
 */
const AREA_SERVED = 'Worldwide';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.name,
    url: site.url,
    description: site.description,
    email: site.contact.email,
    founder: site.founders.map((f) => ({
      '@type': 'Person',
      '@id': personId(f.slug),
      name: f.name,
      jobTitle: f.role,
    })),
    ...(site.sameAs.length > 0 ? { sameAs: site.sameAs } : {}),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: site.contact.email,
      telephone: site.contact.whatsapp,
      areaServed: AREA_SERVED,
      availableLanguage: languageNames,
    },
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
    ...(service.slug === 'ai-calling-agents'
      ? { availableLanguage: languageNames }
      : {}),
  };
}

export function personSchema(founder: (typeof site.founders)[number]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personId(founder.slug),
    name: founder.name,
    jobTitle: founder.role,
    description: founder.bio.replace(/<!--[\s\S]*?-->/g, '').trim(),
    worksFor: { '@id': ORG_ID },
    ...(founder.photo ? { image: `${site.url}${founder.photo}` } : {}),
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
  authorName?: string | null;
  authorSlug?: string | null;
  image?: string | null;
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
    author: article.authorSlug
      ? { '@type': 'Person', '@id': personId(article.authorSlug), name: article.authorName }
      : { '@id': ORG_ID },
    ...(article.image ? { image: article.image } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${site.url}/insights/${article.slug}` },
  };
}
