import { ImageResponse } from 'next/og';
import { site } from '@/lib/site';

/**
 * Default Open Graph image, generated at build time.
 *
 * Deliberately typographic and monochrome — same register as the site, and it
 * needs no asset. Once fuchesi.png exists, the wordmark here should be replaced
 * with the real mark.
 */
export const alt = `${site.name} — custom software, ERP systems, and AI automation`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FAFAFA',
          color: '#0B0B0C',
          padding: 72,
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: '#0B0B0C' }} />
          <span style={{ fontSize: 22, letterSpacing: 6, fontFamily: 'sans-serif' }}>FUCHESİ</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 86, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
            Software that earns its place.
          </div>
          <div
            style={{
              fontSize: 26,
              color: '#666970',
              marginTop: 28,
              maxWidth: 820,
              fontFamily: 'sans-serif',
              lineHeight: 1.4,
            }}
          >
            {site.shortDescription}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
