# Step 04 - Character Gallery Delivery

Status: Complete (2026-09-06)

Depends on: `003-template-gallery.md`

Owning requirement: `../003-character-gallery.md`

## 1. File Ownership

Profiles continues to own the route and Character presentation adapter:

```text
web/src/features/profiles/routes/CharacterDirectoryRoute.tsx
web/src/features/profiles/components/CharacterDiscoveryCard.tsx
web/src/features/profiles/components/characterDiscoveryModel.ts
web/src/features/profiles/components/*.test.tsx
```

If `CharacterCard` gains a `discovery` variant, its default props and rendered output must remain backward compatible. A separate discovery wrapper is preferred when this keeps existing consumers simpler.

## 2. Tasks

- `CHR-IMPL-01` Preserve current directory API/query and cursor behavior
- `CHR-IMPL-02` Build public summary adapter with an explicit field allowlist
- `CHR-IMPL-03` Implement discovery card or isolated backward-compatible variant
- `CHR-IMPL-04` Reuse existing Character handoff policy and navigation helper
- `CHR-IMPL-05` Add shared hero, steps and filter toolbar
- `CHR-IMPL-06` Add neutral featured selection without ranking language
- `CHR-IMPL-07` Add no-media, no-destination, filtered-empty and retry states
- `CHR-IMPL-08` Add tutorial placeholder and current Character Studio CTA
- `CHR-IMPL-09` Add i18n keys and locale parity
- `CHR-IMPL-10` Verify owner-only metadata and actions remain absent publicly
- `CHR-IMPL-11` Check default Character cards in Profile, Fashion and Cinematic selectors
- `CHR-IMPL-12` Validate long Character names/intended-use tags at three viewports

## 3. Focused Tests

```text
npm run test --workspace web -- CharacterDiscoveryCard CharacterDirectoryRoute
npm run test --workspace web -- CharacterCard.test.tsx characterHandoffNavigation.test.ts
node --test test/communityGalleryCharacterContracts.test.js test/characterDestinationHandoff.test.js
```

Run the Character Gallery Playwright spec independently.

## 4. Exit Gate

- Public summary and owner data boundaries are proven
- Existing destination handoff remains unchanged
- No follower/rating/rank UI is active
- Default Character component consumers pass regressions
- Focused tests and three viewport checks pass
