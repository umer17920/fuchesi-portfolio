import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { process } from '@/lib/process';

export function ProcessTeaser() {
  return (
    <Section tone="emphasis" size="lg">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <Eyebrow>How we work</Eyebrow>
            <h2 className="mt-6 font-display text-display-l">
              Five stages.
              <br />
              <em className="italic">No surprises.</em>
            </h2>
            <p className="mt-8 max-w-md text-body-m text-on-emphasis/60">
              Every project runs the same way, from the first conversation to the software still
              being looked after two years later.
            </p>
            <Link
              href="/process"
              className="mt-8 inline-flex items-center gap-2 border-b border-on-emphasis/30 pb-1 text-body-s transition-colors duration-300 hover:border-on-emphasis"
            >
              See how we work
              <span aria-hidden="true">→</span>
            </Link>
          </Reveal>

          <ol className="border-t border-on-emphasis/15">
            {process.map((stage, i) => (
              <li key={stage.number}>
                <Reveal delay={i * 60}>
                  <div className="grid gap-1 border-b border-on-emphasis/15 py-6 sm:grid-cols-[3rem_1fr]">
                    <span className="text-body-s tabular-nums text-[var(--accent)]">
                      {stage.number}
                    </span>
                    <div>
                      <h3 className="font-display text-display-s">{stage.name}</h3>
                      <p className="mt-2 text-body-s text-on-emphasis/60">{stage.summary}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}
