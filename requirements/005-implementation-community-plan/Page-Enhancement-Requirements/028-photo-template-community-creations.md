# Photo Template Public Creation Cards

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Owner: Community. Execution: [plan 029](implementation-plan/029-photo-template-creations.md).

## Output Identity And Layout

1. Under the single original, show Created with this template and a concise
   public-work subtitle, then real output cards. Use 014/024 lineage, never tags
   or image similarity. Preserve existing all-version family grouping.
2. Each card has a large photo, actual title, output creator avatar/handle and
   a separate Heart control. Owner of original and creator of output are distinct.
3. Use a stable 4:5 media stage with contain for composition inspection; modest
   letterboxing is preferable to cropped pose details. Full asset opens through
   existing Post/inspection navigation. No regenerated mockup assets.
4. Prefer a small TemplateCreationCard composed from current media/identity/
   reaction primitives. Do not globally change generic MediaCard or make its
   existing feed metrics disappear. Explicit backward-compatible variants only.
5. Omit generic IMAGE badge, rank placeholders and repeated zero-count dashboard.
   Show positive real likes where available; an unliked work can still have a
   heart with accessible count/state without decorative zero counters.

## Data And Interaction

- Use existing `useTemplateDetail`, server likes/latest ordering and scoped cursor.
  Default is Most liked. Sort stored in URL; changing it resets the loaded pages
  and excludes late responses from prior sort. Preserve browser return choice.
- Server sorts likes/createdAt/ID descending before pagination. Client only
  deduplicates Post IDs; it does not sort just the currently loaded subset.
- Photo/title -> original output Post; avatar -> that output's creator profile.
  Independent Heart button uses existing `useCommunityEngagement` authorization,
  authoritative state, pending guard, error/retry and cache invalidation.
- If adding a `like-only` EngagementBar variant, keep detail/compact defaults
  intact. Do not call a mutation from rendering or introduce a new reaction API.
- On reaction, invalidate Detail and new family-preview reads. Likes may reorder
  the next refresh; do not claim snapshot-stable ranking while users mutate likes.
  Deduplicate pages and offer/reset refresh when cursor rank changes cause gaps.
- Load more remains explicit, bounded, appends without stealing focus and is
  disabled while fetching. End-of-list removes it. No automatic infinite loop.

## Responsive / States

- Three columns on wide Detail content, two when minimum card width fits, one
  on narrow mobile (<~600px). Original/info stacks independently of card grid.
- Loading reserves cards. Zero results shows honest empty state and existing Use
  action where available, not random sample works. More-page failure preserves
  loaded cards/hero and retries the failed request only.
- Broken media retains identity and card geometry. Hidden/deleted output
  disappears on authorized refresh without revealing private reason/metadata.
- Like/save login/actor behavior follows existing app contracts. No new auth
  screens are fabricated. Error status is perceivable by keyboard/screen reader.
- Controls remain visible on touch, with visible focus, no nested interactive
  markup and no horizontal overflow with long Thai titles.

## Acceptance

- `PTC-01`: The user's reported three outputs appear only if actual public lineage
  verifies them; real titles and creators are retained. No count is hard-coded.
- `PTC-02`: Most liked/Latest apply across dataset and reset pagination cleanly.
- `PTC-03`: Heart toggles once, reports failure, and never navigates the card.
- `PTC-04`: Private/hidden/deleted/unrelated outputs are absent in API and UI.
- `PTC-05`: Load-more failure, empty and image-failure states preserve usable original.
- `PTC-06`: Generic Post/Character engagement and MediaCard regression tests pass.

No new publication behavior, model recommendation, usage statistics or data
migration. Rollback the Detail card composition, not source posts or likes.
