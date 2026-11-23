/**
 * Data layer: the only module pages use to read content. Keeps validation
 * of cross-record rules out of presentation, so a later database can
 * replace it without touching pages.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Artist = CollectionEntry<'artists'>;
const isPublic = (s: string) => s === 'published';
const includeSamples = import.meta.env.PUBLIC_INCLUDE_SAMPLES !== 'false';

let cache: Promise<Awaited<ReturnType<typeof load>>> | undefined;

async function load() {
  const [artists, products, events, features] = await Promise.all([
    getCollection('artists'), getCollection('products'),
    getCollection('events'), getCollection('features'),
  ]);

  // Integrity checks: fail the build rather than publish broken data.
  const fail = (msg: string) => { throw new Error(`[catalog] ${msg}`); };
  const ids = new Set<string>(); const slugs = new Set<string>();
  for (const { data } of artists) {
    if (ids.has(data.artistId)) fail(`duplicate artistId ${data.artistId}`);
    ids.add(data.artistId);
    for (const s of [data.slug, ...data.previousSlugs]) {
      if (slugs.has(s)) fail(`duplicate slug ${s}`);
      slugs.add(s);
    }
  }
  for (const p of products) if (!ids.has(p.data.artistId)) fail(`product ${p.id} references unknown artist`);
  for (const e of events) for (const a of e.data.artistIds) if (!ids.has(a)) fail(`event ${e.id} references unknown artist ${a}`);
  for (const f of features) if (!ids.has(f.data.artistId)) fail(`feature ${f.id} references unknown artist`);

  const visible = artists
    .filter((a) => isPublic(a.data.status) && (includeSamples || !a.data.sample))
    .sort((a, b) => a.data.displayName.localeCompare(b.data.displayName));
  const visibleIds = new Set(visible.map((a) => a.data.artistId));
  const byId = new Map(visible.map((a) => [a.data.artistId, a]));

  return {
    artists: visible,
    byId,
    products: products.map((p) => p.data).filter((p) => isPublic(p.status) && visibleIds.has(p.artistId)),
    events: events.map((e) => e.data)
      .filter((e) => isPublic(e.status) && e.artistIds.some((a) => visibleIds.has(a)))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    features: features.map((f) => f.data)
      .filter((f) => isPublic(f.status) && visibleIds.has(f.artistId))
      .sort((a, b) => a.rank - b.rank),
  };
}

export const catalog = () => (cache ??= load());

export async function artistBundle(artistId: string) {
  const c = await catalog();
  return {
    products: c.products.filter((p) => p.artistId === artistId),
    events: c.events.filter((e) => e.artistIds.includes(artistId)),
  };
}

export const formatPrice = (minor: number, currency = 'AUD') =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(minor / 100);

export const formatEventDate = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(iso));
