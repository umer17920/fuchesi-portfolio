/**
 * Emits a JSON-LD block.
 *
 * `<` is escaped to < so a stray "</script>" inside any CMS-authored
 * string can't break out of the script tag. JSON.stringify alone does not do
 * this, and case study / blog copy comes from Sanity.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
