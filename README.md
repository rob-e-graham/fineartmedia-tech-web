# FAMTEC site

Static site for `fineartmedia.tech`.

## ARCHAI wrapper

`/archai.html` is the public-facing ARCHAI wrapper and demo surface. It should stay aligned with the main ARCHAI app repository for:

- active build/version messaging
- live object and collection counts
- current participating institutions
- AUX.IO visitor-path language

Current ARCHAI website baseline: `v11.6.2`, `3,147+` staff-searchable records across `19` connected sources, and `1,402` rights-gated AUX.IO visitor pages. Auckland Museum remains staff-searchable, but its public AUX.IO images are currently held because the source endpoint is returning placeholder media. Source inclusion describes the public/open research corpus and does not imply institutional partnership or endorsement.

Current ARCHAI routes:

- `/archai.html` — public-facing ARCHAI narrative and simplified demo interface.
- `/aux.html` — AUX.IO visitor-interface entry point.
- `/app.html` — WIP full ARCHAI app shell, wired to `https://archai-api.fineartmedia.tech` for live backend behaviour where available.

## Research & development status

The projects presented on this site are active research and development systems: working prototypes, public demos, and open-source tools developed through FAMTEC and Rob Graham's doctoral research at RMIT University.

FAMTEC is open to funded research partnerships, institutional pilot testing, accessibility evaluation, software development support, grant collaborations, and feedback from museums, galleries, universities, public-interest technology groups, and aligned funders.

For research, funding, or testing enquiries: `rob@fineartmedia.tech`

Primary deploy file:

- `index.html`

Primary asset folder:

- `FAMTEC Images/`

This repository is intended for deployment via Cloudflare Pages.
