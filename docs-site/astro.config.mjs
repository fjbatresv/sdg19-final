import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMermaid from '../tools/docs/remark-mermaid.mjs';

const base = process.env.ASTRO_BASE ?? '/';

export default defineConfig({
  site: 'https://fjbatresv.github.io',
  base,
  outDir: '../dist/docs-site',
  markdown: {
    remarkPlugins: [remarkMermaid],
  },
  integrations: [
    starlight({
      title: 'SDG19 Final',
      description: 'Documentación de la solución y su arquitectura.',
      favicon: '/assets/favicon.svg',
      sidebar: [
        {
          label: 'Inicio',
          items: [
            { label: 'Overview', slug: 'index' },
            {
              label: 'Compodoc (web)',
              link: '/compodoc/',
              attrs: { target: '_blank', rel: 'noopener' },
            },
            {
              label: 'TypeDoc',
              link: '/api-typedoc/',
              attrs: { target: '_blank', rel: 'noopener' },
            },
          ],
        },
        {
          label: 'Documentación',
          items: [
            { label: 'Astro Starlight', slug: 'astro' },
            { label: 'Compodoc (web)', slug: 'compodoc' },
            { label: 'TypeDoc (backend)', slug: 'typedoc' },
            { label: 'Code Docs', slug: 'code-docs' },
          ],
        },
        {
          label: 'Infraestructura',
          items: [
            { label: 'Infraestructura', slug: 'infra/overview' },
            { label: 'Costos', slug: 'infra/costs' },
            { label: 'Seguridad', slug: 'infra/security' },
          ],
        },
        {
          label: 'Backend',
          items: [
            { label: 'Overview', slug: 'backend/overview' },
            { label: 'Data Lake', slug: 'infra/data-lake' },
            { label: 'Email', slug: 'backend/email' },
          ],
        },
        {
          label: 'Deployment',
          items: [
            { label: 'Deploy', slug: 'deploy' },
          ],
        },
        {
          label: 'API',
          items: [
            { label: 'Reference', slug: 'api-reference' },
            { label: 'Playground', slug: 'api-playground' },
          ],
        },
      ],
    }),
  ],
});
