# Interface refinement — 2026-10-19

## Changes

- Mobile navigation overlays the content below a fixed 72px header row. The Menu/Close control has a fixed width so language controls do not shift horizontally either.
- Shared SVG external-store icon; language controls override legacy active/hover backgrounds, with a visible underline for the selected language.
- Product listing cards omit unknown-stock messages. Confirmed sold-out notices still expire safely; no price or stock facts were changed.
- Product galleries advance every five seconds, wrap, and offer pause/resume. Autoplay stops for reduced-motion preferences, hidden/offscreen galleries, hover, focus and zoom. Horizontal pointer drags retain a fixed gallery height and preserve native vertical page scrolling.
- Removed the homepage Apparel / Distribution / Japan label, brand-directory listing-status labels, and empty product sections for seven brands without BASE products.
- Removed the specified Lookbook disclaimer. The 14 looks retain recommendation wording; all 14 outfit photographs were visually compared with the linked skirt photographs, including pattern layout, colour and tier construction. No visual mismatch was found. This is a visual check, not manufacturer confirmation of photographed SKU identity.
- Ten product-focused News stories now have photographed BASE cards with ordinary accessible links, replacing legacy STORES embeds and filling missing purchase links. Nineteen cards link to exact BASE products. One ERIBÉ card links to the verified BASE brand category because the article describes P4312 Mulberry while the current Mulberry product is P4313; these were deliberately not equated.

## Evidence and verification

- Public BASE pages for all 34 unique referenced product IDs returned HTTP 200 with matching product titles on 2026-10-19. All 14 chosen Lookbook image URLs remain present in their respective product pages. The ERIBÉ BASE category also returned HTTP 200.
- BASE IDs for article cards are explicitly reviewed in `assets/news-products.json`; the Pink/Black Stewart slug actually contains Navy/Tearose and navy corduroy in its article body, so mapping follows the body and model, not the slug.
- Build passed; 18 catalog integrity/SEO/security checks passed.
- 119 page headers: 161 geometry/font comparisons at eight widths, keyboard controls, no-JavaScript links and sticky behaviour passed.
- 119 English pages and metadata, JA restoration, unchanged JPY and purchase URLs, blocked storage and dictionary retry checks passed.
- Dedicated mobile tests: 18 menu/page/width combinations, active language contrast, auto-advance, explicit pause, real CDP touch swipe with no vertical page displacement, fixed image height, zoom and reduced motion passed.
- News card layout inspected at 390px and 1440px with actual source photographs. No BASE content was modified and no contact form was submitted.

Private screenshots and HTTP results are kept outside the publish directory. Publication is through the existing GitHub main → Netlify workflow.
