import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import remarkMermaid from '../tools/docs/remark-mermaid.mjs';

const base = process.env.ASTRO_BASE ?? '/';
// Custom domain (e.g. https://sdg19.fjbatresv.com) or the default github.io host.
const site = process.env.ASTRO_SITE ?? 'https://sdg19.fjbatresv.com';

// Docs moved from the site root to /docs/ when the landing became the root.
// Keep the old URLs working (portfolio paths and every former doc slug).
const movedDocs = [
  // 'compodoc' is omitted: /compodoc/ now serves the generated Compodoc site.
  'api-playground',
  'api-reference',
  'astro',
  'changelog',
  'code-docs',
  'deploy',
  'typedoc',
  'backend/overview',
  'backend/email',
  'infra/overview',
  'infra/costs',
  'infra/data-lake',
  'infra/security',
];
// Astro does not prefix redirect destinations with `base`, so do it here.
const withBase = (path) => `${base.replace(/\/$/, '')}${path}`;
const redirects = {
  '/portfolio': withBase('/'),
  '/portfolio/es': withBase('/es/'),
  ...Object.fromEntries(
    movedDocs.map((slug) => [`/${slug}`, withBase(`/docs/${slug}/`)]),
  ),
};

export default defineConfig({
  site,
  base,
  outDir: '../dist/docs-site',
  redirects,
  markdown: {
    processor: unified({ remarkPlugins: [remarkMermaid] }),
  },
  integrations: [
    starlight({
      title: 'SDG19 Final',
      description: 'Documentación de la solución y su arquitectura.',
      favicon: '/assets/favicon.svg',
      // Docs are written in Spanish: sets <html lang="es"> and og:locale.
      defaultLocale: 'root',
      locales: { root: { label: 'Español', lang: 'es' } },
      components: {
        Head: './src/components/starlight/Head.astro',
      },
      sidebar: [
        {
          label: 'Inicio',
          items: [
            { label: 'Overview', slug: 'docs' },
            { label: 'Portfolio', link: '/' },
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
            { label: 'Astro Starlight', slug: 'docs/astro' },
            { label: 'Compodoc (web)', slug: 'docs/compodoc' },
            { label: 'TypeDoc (backend)', slug: 'docs/typedoc' },
            { label: 'Code Docs', slug: 'docs/code-docs' },
          ],
        },
        {
          label: 'Infraestructura',
          items: [
            { label: 'Infraestructura', slug: 'docs/infra/overview' },
            { label: 'Costos', slug: 'docs/infra/costs' },
            { label: 'Seguridad', slug: 'docs/infra/security' },
          ],
        },
        {
          label: 'Backend',
          items: [
            { label: 'Overview', slug: 'docs/backend/overview' },
            { label: 'Data Lake', slug: 'docs/infra/data-lake' },
            { label: 'Email', slug: 'docs/backend/email' },
          ],
        },
        {
          label: 'Deployment',
          items: [{ label: 'Deploy', slug: 'docs/deploy' }],
        },
        {
          label: 'API',
          items: [
            { label: 'Reference', slug: 'docs/api-reference' },
            { label: 'Playground', slug: 'docs/api-playground' },
          ],
        },
      ],
    }),
  ],
});
