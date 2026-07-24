import { author } from './author';
import { caseStudy } from './caseStudy';
import { post } from './post';

/**
 * Only case studies and blog posts are CMS-managed — the two things that must
 * be editable by non-developers. Services, process, team, and navigation stay
 * in code, where they belong: they change rarely and they feed schema and
 * llms.txt, which benefit from being reviewed in a pull request.
 */
export const schemaTypes = [caseStudy, post, author];
