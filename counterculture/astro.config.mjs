import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://counterculture.vip',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
