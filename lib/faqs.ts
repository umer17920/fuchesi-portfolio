import { projects } from './projects';
import type { Faq } from './services';

/**
 * Company-level FAQs for the home page.
 *
 * Phrased as the questions a prospect would actually type into an AI
 * assistant — "what does Fuchesi do", not "our value proposition". Answers
 * lead with a plain declarative sentence so they can be quoted as-is.
 *
 * The project count is interpolated from projects.length, never hard-typed:
 * this answer is emitted both as visible text AND as FAQPage JSON-LD, so a
 * stale literal would contradict the /work page and the sitemap — exactly the
 * entity inconsistency AI systems penalise. (A hard-coded "49" survived the
 * portfolio cull here once; making it dynamic stops that recurring.)
 */
export const homeFaqs: Faq[] = [
  {
    question: 'What does Fuchesi do?',
    answer: `Fuchesi is a software development and AI automation company. It builds custom software, custom ERP systems, AI calling agents, lead generation pipelines, and AI workflow automations for businesses that have outgrown off-the-shelf tools. Fuchesi has delivered ${projects.length} projects across commerce, healthcare, property, finance, and professional services.`,
  },
  {
    question: 'Who will we actually work with at Fuchesi?',
    answer:
      'The people who scope your project are the people who build it. Fuchesi is deliberately small, so there is no account manager in front of the work and no handover to a delivery team you have never spoken to.',
  },
  {
    question: 'Where is Fuchesi based, and who does it work with?',
    answer:
      'Fuchesi works with clients across the United States and delivers remotely, with project hours overlapping US business time. The team has also delivered work in the United Kingdom and the United Arab Emirates.',
  },
  {
    question: 'How much does a project with Fuchesi cost?',
    answer:
      'AI workflow automations start at $4,000, lead generation pipelines at $7,000, AI calling agents at $8,000, custom software at $12,000, and a first ERP module at $15,000. Those are starting points rather than quotes: discovery is free and produces a written scope and a fixed price range before you commit to anything.',
  },
  {
    question: 'How quickly can Fuchesi deliver?',
    answer:
      'First automation in production in two to four weeks. A live AI calling agent in three to five weeks. A lead generation pipeline delivering into your CRM in three to four weeks. A working first release of custom software in six to ten weeks. A first ERP module in real use in eight to twelve weeks.',
  },
  {
    question: 'Do we own what Fuchesi builds?',
    answer:
      'Yes. You own the source code and it runs on infrastructure in your name. There is no licence to keep paying and nothing that makes leaving expensive.',
  },
  {
    question: 'What languages can Fuchesi’s AI calling agents speak?',
    answer:
      'Fuchesi builds AI calling agents that speak English, Arabic, Urdu, Hindi, Spanish, French, German, and other languages, and an agent can switch language mid-call when the caller does.',
  },
];
