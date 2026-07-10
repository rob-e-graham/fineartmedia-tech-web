# Website Handoff — 2026-05-29

## What changed

- `index.html`
  - Switched the main sovereign heritage project link from `AUXIO` to `ARCHAI`.
  - Updated the ARCHAI project card copy so it reflects the live multi-museum state instead of the old 62-object subset.
  - Expanded the works grid from 9 items to 18 items so the existing random flip system has enough image depth again.
- `archai.html`
  - Removed the embedded AUXIO live-demo section so the ARCHAI page is no longer duplicating the standalone AUXIO page.
  - Added a cleaner AUXIO CTA panel under the ARCHAI project explanation.
  - Expanded the hero institution list to include AIC, Cleveland, and Rijksmuseum.
  - Changed the visible rights/footer language to `All rights reserved`.
- `aux.html`
  - Kept the live manifest-driven wrapper, but aligned the visible rights/footer language to `All rights reserved`.
- `safechat.html`
  - Removed the stale `detection-demo.png` screenshot from the gallery.
  - Added copy explaining that the live detection engine is demonstrated interactively on the page instead.
- `keytec.html`
  - Removed the stale `keytec-instruction-mode.png` screenshot from the gallery.
  - Added copy explaining that the instruction workflow is moving quickly and the gallery now stays with current dashboard views only.

## Verified

Smoke-tested with Playwright on 2026-05-29:

```bash
cd /tmp/famtec-check
npx playwright test site-smoke.spec.js --config=playwright.config.js --reporter=line
```

Passing coverage from that smoke run:

- Homepage shows the updated ARCHAI routing and the expanded 18-tile works grid.
- Public `https://fineartmedia.tech/aux` loads live collection status and rotates objects.
- Local `http://localhost:8011/archai.html` is focused on ARCHAI and links out to AUXIO rather than embedding it.
- `safechat.html` no longer references `detection-demo.png`.
- `keytec.html` no longer references `instruction-mode.png`.

## Notes

- `dark-plates.html` had pre-existing local edits and was intentionally left alone.
- The public site only reflects these changes after this repo is pushed/deployed.
- Rights language is now aligned on the public website surfaces, but the ARCHAI app repo still contains older MPL-era documentation that should be reconciled in a dedicated licensing pass.
