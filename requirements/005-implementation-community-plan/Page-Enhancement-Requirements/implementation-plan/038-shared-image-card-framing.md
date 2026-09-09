# Shared Image Card Implementation

Owner: [045](../045-shared-image-card-framing.md). Status: implemented and fixture-verified.

1. Change existing MediaCard: default image source/fit/height shared; keep the
   ratio helper. Reconcile 044 scope; no new component or data owner.
2. Move featured geometry to shared rules in existing community-home.css (current
   MediaCard styling owner). Apply one wrapping class to the four post list owners.
3. Update focused tests in scripts/test-profile-public-work.mjs. Keep danger/media/
   types groups and explicit all; extend existing route assertions and add separate
   layout-featured/works/creator/related groups with explicit layout-all.
4. Extend scripts/verify-profile-public-work.mjs with shared-list fixtures. Validate
   home feed/featured, Character works, Creator post tab and post related works,
   separately selectable. API fixtures only; no live writes or paid generation.
5. Review dimensions, original sources, responsive overflow, post links and old
   Template/Comparison/Video behavior. Document gaps rather than broad redesign.

Commands: `node scripts/test-profile-public-work.mjs media|types|all`;
`node scripts/verify-profile-public-work.mjs featured|works|creator|related`.
Browser prerequisite: local Vite 5173 (PROFILE_LAYOUT_ORIGIN override), installed
Playwright. EN/TH, 390/820/1440, existing themes; do not overwrite web/dist.

## Evidence

- `node scripts/test-profile-public-work.mjs all`: 30 tests (11 danger/19 media)
  and TypeScript no-emit passed. Existing confirmation and owner controls protected.
- Browser featured (including full feed), works (Overview and Creations), creator
  post tab, related: 18 cases per group, 72 total locale/viewport/theme cases,
  passed. Actual image element bounds must fit stage as well as object-fit contain.
  This caught and fixed intrinsic grid sizing overflow on wide mobile cards.
- Source/link/list width/stage height/overflow checked with decoded bordered image
  fixtures. No private URL guesses. Related post view event mocked locally;
  remaining mutations/external requests blocked. No live API writes.
- Ephemeral screenshot directories under `%TEMP%`: featured-cD30C1,
  works-yNoaeg, creator-CLC9uH, related-6yTnd9 (prefix mpf-profile-public-).
  Mobile, tablet and desktop screenshots inspected. Rerun selectable browser
  groups or `node scripts/test-profile-public-work.mjs layout-all` to reproduce.
- No new component, server contract, runtime data or dependency; two requirement
  documents added under the existing Page Enhancement owner. CSS stays in the
  current MediaCard styling owner. QA is sequential self-review, not independent.

## Limits

No full production build or live-data UAT. Vite source at 5173 is verified, not
the existing built web/dist served on 6500. Raw Creator library mosaics, identity
cards and full post viewers are different contracts and intentionally unchanged.
Image originals retain lazy loading and existing query page limits (Community
18 per page); bandwidth can exceed old cropped thumbnails. Responsive uncropped
derivatives remain a future media-owner improvement, not a new cache in this task.
