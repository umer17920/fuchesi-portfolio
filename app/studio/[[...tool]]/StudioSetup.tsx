/**
 * Shown at /studio until Sanity is configured. Keeps the route (and the build)
 * working before credentials exist, and tells whoever lands here what to do.
 */
export function StudioSetup() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-display text-display-m">Studio not configured yet</h1>
      <p className="mt-6 text-body-m text-muted">
        Case studies and insights are edited here, but the CMS needs connecting first. The site
        builds and renders without it — insights fall back to seed content and the work index reads
        from the migrated project list.
      </p>

      <ol className="mt-10 space-y-6 border-t border-hairline pt-8">
        {[
          {
            title: 'Create a Sanity project',
            body: 'Run `npx sanity@latest init --env` in this directory, or create one at sanity.io/manage. The free plan covers two editors.',
          },
          {
            title: 'Add the environment variables',
            body: 'Put NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET in .env.local, and add the same values in Vercel’s project settings.',
          },
          {
            title: 'Import the seed posts',
            body: 'Run `node scripts/seed-sanity.mjs` to move the three drafted insight posts into the CMS so they become editable.',
          },
          {
            title: 'Add the deploy webhook',
            body: 'In sanity.io/manage, point a webhook at /api/revalidate so publishing rebuilds the affected pages.',
          },
        ].map((step, i) => (
          <li key={step.title} className="grid gap-2 sm:grid-cols-[2rem_1fr]">
            <span className="text-body-s tabular-nums text-muted">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <h2 className="text-body-m font-medium">{step.title}</h2>
              <p className="mt-1 text-body-s text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
