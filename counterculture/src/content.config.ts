import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

export const SCHEMA_VERSION = 1;

/** Only https links to approved services are published. */
const APPROVED_HOSTS = [
  'bandcamp.com', 'spotify.com', 'apple.com', 'soundcloud.com', 'youtube.com',
  'instagram.com', 'tiktok.com', 'facebook.com', 'square.site', 'squareup.com',
  'yougig.com', 'yougig.com.au', 'counterculture.vip',
];
const approvedUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' &&
    APPROVED_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}, { message: 'Link must be https and on an approved host' });

const status = z.enum(['draft', 'approved', 'published', 'withdrawn']);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const artists = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/artists' }),
  schema: ({ image }) => z.object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    artistId: z.string().regex(/^art_[a-z0-9]{6,}$/),
    slug,
    previousSlugs: z.array(slug).default([]),
    displayName: z.string().min(1),
    location: z.string().optional(),
    genres: z.array(z.string()).default([]),
    tagline: z.string().max(140),
    status,
    sample: z.boolean().default(false),
    image: image().optional(),
    imageAlt: z.string().optional(),
    imageCredit: z.string().optional(),
    links: z.array(z.object({
      kind: z.enum(['listen', 'shop', 'social', 'events', 'website']),
      label: z.string(),
      url: approvedUrl,
    })).default([]),
  }).refine((a) => !a.image || (a.imageAlt && a.imageCredit), {
    message: 'Artwork needs alt text and a credit',
  }),
});

const products = defineCollection({
  loader: file('./src/data/products.json'),
  schema: z.object({
    productId: z.string().regex(/^prd_[a-z0-9]{6,}$/),
    variantId: z.string().optional(),
    artistId: z.string(),
    title: z.string(),
    status,
    currency: z.literal('AUD'),
    priceMinor: z.number().int().nonnegative(),
    provider: z.literal('square'),
    providerRef: z.string().optional(),
    checkoutUrl: approvedUrl,
    termsVersion: z.string(),
  }),
});

const events = defineCollection({
  loader: file('./src/data/events.json'),
  schema: z.object({
    eventId: z.string().regex(/^evt_[a-z0-9]{6,}$/),
    artistIds: z.array(z.string()).min(1),
    title: z.string(),
    venue: z.string(),
    startsAt: z.string().datetime({ offset: true }),
    timezone: z.string(),
    status,
    provider: z.literal('yougig'),
    ticketUrl: approvedUrl,
  }),
});

const features = defineCollection({
  loader: file('./src/data/features.json'),
  schema: z.object({
    featureId: z.string(),
    artistId: z.string(),
    headline: z.string(),
    blurb: z.string(),
    rank: z.number().int(),
    status,
  }),
});

export const collections = { artists, products, events, features };
