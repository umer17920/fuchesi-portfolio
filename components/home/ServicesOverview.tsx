import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { services } from '@/lib/services';

export function ServicesOverview() {
  return (
    <Section tone="paper" id="services">
      <Container>
        <Reveal>
          <Eyebrow>What we do</Eyebrow>
          <h2 className="mt-6 max-w-3xl font-display text-display-l">
            Five things, done properly.
          </h2>
        </Reveal>

        <ul className="mt-16 border-t border-hairline">
          {services.map((service, i) => (
            <li key={service.slug}>
              <Reveal delay={i * 60}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group grid items-baseline gap-2 border-b border-hairline py-8 md:grid-cols-[4rem_1fr_1.1fr] md:gap-8"
                >
                  <span className="text-body-s tabular-nums text-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <h3 className="font-display text-display-s transition-transform duration-500 ease-[var(--ease-out-expo)] motion-safe:group-hover:translate-x-1.5">
                    {service.name}
                  </h3>

                  <p className="text-body-s text-muted">{service.summary}</p>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
