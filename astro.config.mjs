import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// SITE_URL y BASE_PATH los define el workflow de GitHub Actions
// (https://<usuario>.github.io + /<repositorio>). En local no hacen falta.
export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
  integrations: [svelte()],
});
