import Link from 'next/link';
import { nav } from '@/lib/nav';
import { services } from '@/lib/services';
import { site } from '@/lib/site';
import { Wordmark } from './Wordmark';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline bg-paper-raised">
      <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Wordmark className="-ml-1" />
            {/* The canonical description, verbatim. Entity consistency: this is
                the same sentence in metadata, Organization schema, and llms.txt. */}
            <p className="mt-5 max-w-sm text-body-s text-muted">{site.shortDescription}</p>
          </div>

          <nav aria-label="Services">
            <h2 className="text-eyebrow uppercase text-muted">Services</h2>
            <ul className="mt-5 space-y-3">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="text-body-s text-ink transition-colors duration-300 hover:text-[var(--accent)]"
                  >
                    {s.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h2 className="text-eyebrow uppercase text-muted">Company</h2>
            <ul className="mt-5 space-y-3">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-body-s text-ink transition-colors duration-300 hover:text-[var(--accent)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/contact"
                  className="text-body-s text-ink transition-colors duration-300 hover:text-[var(--accent)]"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-hairline pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-s text-muted">
            © {year} {site.name}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a
              href={`mailto:${site.contact.email}`}
              className="text-body-s text-ink transition-colors duration-300 hover:text-[var(--accent)]"
            >
              {site.contact.email}
            </a>
            <a
              href={`https://wa.me/${site.contact.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-body-s text-ink transition-colors duration-300 hover:text-[var(--accent)]"
            >
              {site.contact.whatsappDisplay}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
