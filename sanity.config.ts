'use client';

import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { apiVersion, dataset, projectId } from './lib/sanity/env';
import { schemaTypes } from './sanity/schemas';

export default defineConfig({
  name: 'fuchesi',
  title: 'Fuchesi',
  basePath: '/studio',
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.documentTypeListItem('caseStudy').title('Case studies'),
            S.documentTypeListItem('post').title('Insights'),
            S.divider(),
            S.documentTypeListItem('author').title('Authors'),
          ]),
    }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
