# CDI-02 Hero, Spotlight And Catalog

Status: Implemented; 13 focused tests and production build passed. Depends on CDI-01.

Checkpoint: local server 6500 stopped before the interim screenshot. User was
notified; defer the screenshot to CDI-04 while continuing mock-tested handoff
work. This does not mark visual acceptance passed.

1. Add CharacterGalleryHero: compact identity heading, actual portrait ribbon,
   create/browse actions, bounded names; no duplicate giant backdrop.
2. Add CharacterSpotlight: shared spotlight card + up to three actual public
   image works. Use existing MediaStage/post navigation and creator attribution.
3. Wire ONE getCharacterWorks query for the selected featured Character. Same
   actor/Character key as Profile; no polling, per-card fetch or second directory.
4. Cover local moments loading, empty, error/retry and unavailable media without
   hiding feature/catalog. Preserve existing visibility policy.
5. Replace only intended-use dropdown with shared segmented control; retain
   creator search, reuse selector, URL handling, cursor and clear semantics.
6. Compact existing DiscoverySteps and tutorial rail with Character-scoped CSS.
   Add bottom Studio CTA to existing creation route; no sample CTA pretending
   to play a real tutorial. No changes to shared defaults or sibling routes.
7. Route tests: same identity works, filtered empty, retry, clear, cursor and
   URL return context; component tests: hero and spotlight positive/partial states.

Run: `node scripts/test-character-discovery.mjs --part=gallery`.
Inspect one desktop screenshot before adding the new handoff entry.

Final evidence: gallery suite includes loading/retry, filter/cursor/actor changes
and return context. Isolated production-build screenshots reviewed in CDI-04.
The final screenshot exposed intrinsic tutorial-image height growth; positioning
that image inside its existing Character-scoped media frame restores a compact
140px baseline without changing tutorial components on other pages.
