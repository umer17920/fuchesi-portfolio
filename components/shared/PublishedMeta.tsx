type PublishedMetaProps = {
  publishedAt: string;
  updatedAt?: string | null;
  author?: string | null;
  className?: string;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Visible published/updated dates.
 *
 * These are a freshness signal, not decoration: search and AI systems weigh how
 * current a page is, and the visible date, schema's dateModified, and the
 * sitemap's lastmod must all agree. Undated content reads as stale content.
 *
 * <time datetime> carries the machine-readable ISO value alongside the human
 * one.
 */
export function PublishedMeta({ publishedAt, updatedAt, author, className = '' }: PublishedMetaProps) {
  // Only surface "Updated" when it is genuinely later than publication —
  // otherwise it is noise that implies revision where there was none.
  const showUpdated = Boolean(updatedAt && updatedAt.slice(0, 10) > publishedAt.slice(0, 10));

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-body-s text-muted ${className}`}>
      {author && (
        <>
          <span>{author}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <time dateTime={publishedAt}>{fmt(publishedAt)}</time>
      {showUpdated && updatedAt && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            Updated <time dateTime={updatedAt}>{fmt(updatedAt)}</time>
          </span>
        </>
      )}
    </div>
  );
}
