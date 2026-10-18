# Discovery / Wholesale improvements — 2026-10-19

## Changes
- Removed retired background/splash video elements, playback scripts, video preload links and obsolete VideoObject metadata from static pages and the news template. Retired video files are no longer copied into the production package.
- Deferred the homepage/contact Jotform iframe and provider helper until the form approaches the viewport; retained an explicit load button and a normal external link for failures/no JavaScript. The form itself and submission destination are unchanged.
- Added wholesale enquiry guidance and expandable questions to Contact. No minimum quantity, delivery promise, discount, sample availability or payment terms are invented; visitors are asked to confirm these individually.
- Added ten reviewed brand profiles, preserving the existing product-brand URLs. Homepage/About logos and shared navigation lead to internal brand pages. Seven brands without listed BASE products have an enquiry path, not invented stock or purchase links.
- Grouped the 14 existing Lookbook pairings under three themes. Both BASE links and the selected photographs remain attached to the original IDs. Hero captions link to corresponding themes.
- Added independent pause/resume controls for Collection and Lookbook. Manual touch movement remains available while paused; resize/history return do not cancel a deliberate pause. Shared reduced-motion handling respects the device preference.
- Added reviewed English copy; prices and BASE product facts were not changed.

## Sources and maintenance
Brand descriptions and their official source URLs are kept together in `catalog/brand-profiles.json` (reviewed 2026-10-18). The first three product-bearing brands also link to the existing ReStandard journal articles. Do not infer inventory from the presence of a brand profile.

Lookbook themes are in `assets/lookbook-themes.json`; assignments and stable BASE image URLs are in `assets/lookbook.json`. Every pairing must resolve to published products and an existing source image. Keep new Japanese copy paired with reviewed entries in `assets/i18n/en.json` and bump the translation asset version when editing it.

`scripts/render-product-sections.cjs` preserves the pause controls and standalone Lookbook link when refreshing homepage product photographs. Production builds still use `npm run build:catalog:site` and the existing Netlify deployment.

## Verification before release
- Catalog unit suite: 18 checks, including ID stability, deletion/privacy, price/stock handling, schema and 404s.
- Language: 119 pages, metadata, JA restoration, unchanged JPY/BASE links and load-failure recovery.
- Header: 119 pages; 161 geometry/font comparisons at eight widths, menus/keyboard/mobile/JA-EN/no-JS.
- Discovery: ten brand routes/schema/sitemap entries; 24 responsive layouts; independent pause/resume; reduced motion; deferred form/no-JS link; 14 pairings and 28 BASE purchase links.
- Marquee: eight widths through 3840 px, two full loops, all 32 original BASE image mappings, real touch gestures, pause-preserving swipes/history return, cancellation and no-JS fallback.
- Real Jotform verified by loading its email field and reading its field labels; no data entered or submitted.
- Initial-load observation: before the change, media and Jotform requests were present; the updated homepage issued zero media and zero Jotform requests before scrolling to the form. Local-vs-production byte totals are diagnostic only, not field Core Web Vitals or a guaranteed speed percentage.
