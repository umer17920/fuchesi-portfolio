import { Reveal } from '@/components/motion/Reveal';
import { ButtonLink } from '@/components/primitives/Button';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { site } from '@/lib/site';

export function ContactCta() {
  return (
    <Section tone="paper" size="lg">
      <Container>
        <Reveal>
          <h2 className="max-w-4xl font-display text-display-xl">
            Tell us what is
            <br />
            <em className="italic">not working.</em>
          </h2>
          <p className="mt-8 max-w-xl text-body-l text-muted">
            Describe the problem in your own words. We will tell you what we would build, what it
            would cost, and whether you need us at all.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink href="/contact">Start a project</ButtonLink>
            <a
              href={`mailto:${site.contact.email}`}
              className="px-2 text-body-s text-muted underline decoration-hairline underline-offset-4 transition-colors duration-300 hover:text-ink hover:decoration-ink"
            >
              or email us directly
            </a>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
