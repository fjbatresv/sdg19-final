import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://fjbatresv.github.io',
  base: '/sdg19-final/',
  outDir: '../dist/docs-site',
  integrations: [
    starlight({
      title: 'SDG19 Final',
      description: 'Documentación de la solución y su arquitectura.',
      favicon: '/assets/favicon.svg',
      sidebar: [
        {
          label: 'Inicio',
          items: [{ label: 'Overview', slug: '' }],
        },
        {
          label: 'Infraestructura',
          items: [
            { label: 'Infraestructura', slug: 'infra/overview' },
            { label: 'Data Lake', slug: 'infra/data-lake' },
            { label: 'Costos', slug: 'infra/costs' },
            { label: 'Seguridad', slug: 'infra/security' },
          ],
        },
        {
          label: 'Backend',
          items: [
            { label: 'Overview', slug: 'backend/overview' },
            { label: 'Email', slug: 'backend/email' },
          ],
        },
        {
          label: 'Deployment',
          items: [
            { label: 'Deploy', slug: 'deploy' },
            { label: 'Code Docs', slug: 'code-docs' },
            { label: 'Compodoc', slug: 'compodoc' },
            { label: 'API Reference', slug: 'api-reference' },
          ],
        },
      ],
    }),
  ],
});
