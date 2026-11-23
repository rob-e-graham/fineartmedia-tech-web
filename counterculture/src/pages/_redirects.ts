import type { APIRoute } from 'astro';
import { catalog } from '../lib/catalog';
/** Cloudflare Pages redirects: old artist slugs to their current page. */
export const GET: APIRoute = async () => {
  const { artists } = await catalog();
  const lines = artists.flatMap((a) => a.data.previousSlugs.map((s) => `/artists/${s}/ /artists/${a.data.slug}/ 301`));
  return new Response(lines.join('\n') + '\n');
};
