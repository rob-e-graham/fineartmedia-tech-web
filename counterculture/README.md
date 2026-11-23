# COUNTERCULTURE v0.1

Static Astro site for `counterculture.vip`. Milestone 1 preview: editorial home, directory, one reusable artist profile, and Shop, Music, Radio, Events, Join and About.

```bash
npm ci
npm run dev      # local preview
npm run build    # type-check, validate content, build to dist/
```

## Cloudflare Pages
Root directory `counterculture`, build command `npm run build`, output `dist`, Node from `.nvmrc`.
Set `PUBLIC_PREVIEW=false` and `PUBLIC_INCLUDE_SAMPLES=false` on production only; previews stay `noindex` and show the sample profile.

## Content
- Artists: `src/content/artists/<slug>.md` (frontmatter validated in `src/content.config.ts`).
- Products, events, features: `src/data/*.json`, referencing artists by `artistId`. Prices are integer cents.
- Existing service URLs (radio stream, Square store, form, contact): `src/data/site.ts`.
- The build fails on duplicate IDs or slugs, broken references, non-https or unapproved link hosts, and artwork without alt text and credit.
- Renamed artist? Add the old slug to `previousSlugs`; a 301 is written to `_redirects`.
- Never commit private intake, contact emails, agreements or transaction records here.

The `static-coast` profile is placeholder sample content. Replace it with approved pilot artists.
