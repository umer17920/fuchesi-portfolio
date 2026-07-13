# Fuchesi Portfolio

A fast, responsive portfolio for Fuchesi — the independent digital studio founded by Umer and Farees. Built with Next.js, Tailwind CSS, and Framer Motion.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
```

The site is configured as a static export. Generated files are written to `out/` and can be hosted on any static provider.

## Deploy to Vercel

1. Push this folder to a GitHub, GitLab, or Bitbucket repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected Next.js framework and default `npm run build` command.
4. Click **Deploy**.

No environment variables are required. Future pushes to the production branch deploy automatically.

## Personalize

- Project content is in the `projects` array in `components/Portfolio.js`.
- Contact and social links are near the bottom of that file.
- Global colors and typography are in `tailwind.config.js`.

The repository contains only the portfolio frontend and its deployment configuration.
