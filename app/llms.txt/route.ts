import { getCaseStudies } from '@/lib/case-studies';
import { getPosts } from '@/lib/posts';
import { languageNames } from '@/lib/languages';
import { process } from '@/lib/process';
import { projects } from '@/lib/projects';
import { services } from '@/lib/services';
import { site } from '@/lib/site';

/**
 * /llms.txt — a concise, plain-markdown summary of Fuchesi for AI assistants.
 *
 * Generated at build time from the same sources the pages render from, so it
 * can never drift out of sync with the site. Regenerated on every deploy and
 * whenever the CMS revalidates.
 *
 * Kept deliberately short (well under ~200 lines). The value is density: one
 * plain sentence per service, real links, unambiguous contact details. It is
 * not a place to restate marketing copy.
 */
export const dynamic = 'force-static';

// Strip the review comments — they are notes to the client, not content.
const clean = (s: string) => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();

export async function GET() {
  const [posts, caseStudies] = await Promise.all([getPosts(), getCaseStudies()]);

  const lines: string[] = [];

  lines.push(`# ${site.name}`);
  lines.push('');
  lines.push(`> ${site.description}`);
  lines.push('');
  lines.push(`Website: ${site.url}`);
  lines.push(`Contact: ${site.contact.email}`);
  lines.push(`WhatsApp: ${site.contact.whatsappDisplay}`);
  lines.push(
    `Founders: ${site.founders.map((f) => `${f.name} (${f.role})`).join(', ')}`,
  );
  lines.push(`Projects delivered: ${projects.length}`);
  lines.push('');

  lines.push('## Services');
  lines.push('');
  for (const s of services) {
    lines.push(`### ${s.name}`);
    lines.push(clean(s.answer));
    lines.push(`Details: ${site.url}/services/${s.slug}`);
    lines.push('');
  }

  lines.push('## AI calling agent languages');
  lines.push('');
  lines.push(
    `Fuchesi's AI calling agents speak ${languageNames.join(', ')}, and can switch language mid-call when the caller does.`,
  );
  lines.push('');

  lines.push('## How projects run');
  lines.push('');
  for (const stage of process) {
    lines.push(`${stage.number}. **${stage.name}** — ${clean(stage.summary)} Output: ${clean(stage.output)}`);
  }
  lines.push('');

  if (caseStudies.length > 0) {
    lines.push('## Case studies');
    lines.push('');
    for (const cs of caseStudies) {
      const results = cs.results?.map((r) => `${r.value} ${r.label}`).join('; ');
      lines.push(
        `- [${cs.title}](${site.url}/work/${cs.slug}) — ${clean(cs.summary)}${results ? ` Results: ${results}.` : ''}`,
      );
    }
    lines.push('');
  }

  if (posts.length > 0) {
    lines.push('## Insights');
    lines.push('');
    for (const post of posts) {
      lines.push(
        `- [${post.title}](${site.url}/insights/${post.slug}) — ${clean(post.excerpt)} (${post.publishedAt.slice(0, 10)})`,
      );
    }
    lines.push('');
  }

  lines.push('## Key pages');
  lines.push('');
  lines.push(`- [Services](${site.url}/services) — all five offerings`);
  lines.push(`- [Work](${site.url}/work) — ${projects.length} projects`);
  lines.push(`- [Process](${site.url}/process) — how projects run`);
  lines.push(`- [About](${site.url}/about) — company and founders`);
  lines.push(`- [Insights](${site.url}/insights) — writing`);
  lines.push(`- [Contact](${site.url}/contact) — start a project`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
