# UI-019 Recent Comparison Discovery And Collection Toolbar

**Status:** Implemented; visual and automated validation passed
**Primary role:** Product and Requirement Architect
**Reviewers:** UX/UI Product Designer, QA Release Engineer
**Owning capabilities:** History/Library read presentation, Comparisons private workspace, Collections presentation
**Depends on:** UI-018 My Library, React migration requirement 008, Comparison History requirement 022

## 1. Outcome

Users can return to an unshared private Comparison from `My Library > Recent`,
open or share the complete Comparison, and distinguish it from individual image
outputs. The Collection controls read as a compact filter toolbar rather than a
second page tab.

## 2. Ownership And Preservation

- Comparison Set, run, slot, winner and lifecycle state remain owned by the
  Comparisons capability and its existing repository/API.
- Individual generated images remain owned by History/Generation.
- Recent is a read-only aggregate projection. It must not copy Comparison Sets
  into History or create a second persistence path.
- Collection membership remains image-job based. This change does not add
  video or Comparison membership to Collections.
- Sharing remains explicit. Merely loading Recent must never create a public
  Community post or share draft.
- Existing generation, Credit, ownership, delete, winner and Community publish
  contracts remain unchanged.

## 3. Recent Media Filters

The full Recent page exposes one segmented filter with:

```text
All | Images | Videos | Comparisons
```

Rules:

- `All` merges currently loaded standalone images, videos and Comparison Sets
  by latest timestamp.
- A Comparison is one grouped mosaic card, not a row of duplicated slot cards.
- In `All`, a Comparison child image is suppressed only when its parent
  Comparison Set is present in the currently loaded projection.
- `Images` continues to show every customer-visible image, including Comparison
  child output. Comparison children show a `Comparison` source badge and an
  action to open the parent Set.
- `Videos` preserves the existing video result behavior.
- `Comparisons` shows private Comparison summary cards only.
- Compact Recent surfaces retain their current image-only behavior.

## 4. Comparison Card And Recovery

Each Comparison card shows:

- up to four thumbnails through the shared `ComparisonThumbnailGrid`;
- Set name;
- completed/total summary and current status;
- an explicit action to open `/comparisons/:setId`;
- an explicit share action only when at least two completed image slots make the
  Set publishable under the existing server rule.

Opening a Comparison uses the existing private Comparison detail workspace.
No comparison-specific mutation is implemented inside History.

Individual History image viewers and details show `Open comparison` when the
history record has a valid `comparisonSetId`. Sharing the image remains a
separate `Share image` action.

## 5. Collection Toolbar

- Present Collection as a compact filtering toolbar below the Recent heading.
- Keep the selector readable without stretching it across the full viewport.
- Show the visible image count as secondary information.
- Keep `New collection` available.
- Show Edit and Share only when a real Collection is selected and eligible.
- Use icons and accessible names/tooltips for compact Edit and Share actions.
- Hide the Collection toolbar in `Videos` and `Comparisons` because those
  resources are not Collection members under the current contract.
- Selecting a Collection while on `All` switches the media filter to `Images`
  so the filtering scope is explicit.
- On narrow screens the selector occupies its own row and actions remain
  reachable without horizontal page overflow.

## 6. State Matrix

| State | Expected presentation |
|---|---|
| Initial load | Existing loading state covers each enabled source query |
| One source fails in `All` | Preserve available results and show retryable error context |
| Empty Comparisons | Comparison filter shows a comparison-specific empty message |
| Processing Comparison | Card remains openable and reports processing status |
| Publishable Comparison | Share action is visible |
| Incomplete Comparison | Share action is absent; Open remains available |
| Selected Collection | Images only; count and eligible Collection actions shown |
| Actor switch | Filters and Collection selection reset; actor-scoped queries change |

## 7. Responsive, Theme, Accessibility And Localization

- Verify approximately 390px, 820px and 1440px widths.
- Segmented filters may wrap but must not clip or overlap.
- Cards and toolbar use semantic theme tokens in every active theme.
- Filter state uses `aria-pressed`; grouped cards and icon actions have
  accessible names and visible keyboard focus.
- Add English and Thai strings with key parity.

## 8. Verification

Automated checks:

1. Projection merges image, video and Comparison records by timestamp.
2. Filters remain mutually exclusive.
3. `All` suppresses a Comparison child only when its grouped Set is present.
4. `Images` retains Comparison child images.
5. Comparison history metadata survives schema parsing.
6. Existing Collection and media projection tests remain green.
7. TypeScript, lint, i18n validation and production build pass.

Manual checks:

1. Open Recent and switch among all four filters.
2. Open an unshared Comparison from its grouped card.
3. Share a publishable Comparison and confirm no publish occurs before submit.
4. Open a Comparison child image and follow `Open comparison`.
5. Select a Collection, create/edit/share it, and verify existing behavior.
6. Check no overlap or horizontal page scroll at mobile, tablet and desktop.

## 9. Deferred Work

A single server-side Library feed cursor across History images, Video tasks and
Comparison Sets is deferred. The current implementation merges bounded results
from existing actor-owned APIs and must not claim exact global ordering beyond
the records loaded from each source.

## 10. Implementation Checkpoint

- Recent now consumes the existing actor-owned Comparison summary API as a
  read projection and renders grouped mosaic cards.
- Comparison child history records expose typed lineage and recovery links.
- Full Recent has four media filters; compact Recent remains image-only.
- The full-page Collection toolbar uses a compact responsive layout while the
  existing compact Studio layout remains available through an explicit variant.
- Shared Collection and Community dialogs accept optional custom triggers with
  their previous default triggers preserved.
- Targeted Vitest: 10/10 passed.
- Full web Vitest: 109 files and 437 tests passed.
- TypeScript, production build, JSON parsing and i18n validation passed.
- Targeted ESLint has no errors. Repository-wide lint remains blocked by five
  unrelated pre-existing errors in Admin and video-generation test files.
- Browser verification passed at 390px, 820px and 1440px with no horizontal
  overflow. Filter, Collection reset, private Comparison open, share-dialog
  consent boundary and child-image recovery interactions passed.
