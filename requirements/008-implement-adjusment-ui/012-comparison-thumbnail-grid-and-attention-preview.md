# UI-012 Comparison Thumbnail Grid and Attention Preview

**Status:** Implemented; pending validation  
**Owners:** Shared Comparison media UI, Comparison repository projection, and server image presentation

## 1. Business Requirement

Comparison cards must communicate the number and character of their generated
results before a user opens the full Comparison Workspace. The preview must use
the available card area efficiently and preserve the visually important region
of each result.

The same preview behavior applies to Community, My Comparisons, Creator
Profiles, and every future surface that renders a Comparison card.

## 2. Functional Requirements

### 2.1 Count-aware Layout

- One available result fills the complete preview stage.
- Two results render as equal left and right columns.
- Three results render as equal left, center, and right columns.
- Four results render as a two-column by two-row grid.
- The component renders at most four results and preserves source order.
- Failed or unavailable results are excluded before layout selection. The
  remaining visible result count owns the layout.
- The stage keeps a stable `4:3` card ratio and must not resize when an image
  finishes loading.

### 2.2 Shared Component Contract

`ComparisonThumbnailGrid` is the only owner of Comparison card image layout.
It receives normalized media items and does not fetch Comparison or Community
data itself.

Consumers provide:

```ts
type ComparisonThumbnailItem = {
  id: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  presentationUrl?: string | null;
};
```

- `presentationUrl` is preferred.
- `thumbnailUrl` is the first fallback.
- `imageUrl` is the final fallback.
- A presentation load failure falls back without breaking card navigation.
- The grid is decorative inside a card link and therefore uses empty image alt
  text; the card link continues to own the accessible name.

### 2.3 Sharp Attention Presentation

- Preview images use server-generated WebP presentations created by the
  existing `ImagePresentationService`.
- Count-specific profiles match each tile geometry:
  - `comparison-card-1-person-focus`
  - `comparison-card-2-person-focus`
  - `comparison-card-3-person-focus`
  - `comparison-card-4-person-focus`
- Every profile uses Sharp auto-rotation, `fit: cover`, and
  `sharp.strategy.attention`.
- Profiles are allowlisted server constants. The client cannot submit width,
  height, format, quality, position, or arbitrary Sharp operations.
- Presentation rendering starts from the authorized local preview when
  available and falls back to the authorized original.
- Presentation responses include content type, content length, ETag, and
  bounded private caching.
- Original images, downloads, Comparison Workspace Fit mode, and fullscreen
  media remain unchanged.

### 2.4 Access and Projection

- Actor-owned Comparison list presentations require the active actor to own
  both the Comparison and referenced History result.
- Public Community Comparison presentations pass the existing post visibility
  policy before resolving a slot image.
- Comparison list projection includes up to four completed preview images.
- Public snapshots expose only application routes, never local filesystem paths
  or private output filenames.

## 3. Software Design

```text
web/src/components/comparisons/ComparisonThumbnailGrid.tsx
  reusable count-aware grid and media fallback behavior

web/src/components/media/MediaStage.tsx
  adapts public Community Comparison slots to the shared grid

web/src/features/comparisons/routes/ComparisonsRoute.tsx
  adapts actor-owned Comparison summaries to the shared grid

web/src/styles/comparisons.css
  stable 1/2/3/4-result tile geometry

server/domain/assets/ImagePresentationService.js
  allowlisted count-specific Sharp attention profiles

server/app/routes/historyRoutes.js
  actor-owned History presentation endpoint

server/app/routes/communityComparisonRoutes.js
  visibility-checked public Comparison slot presentation endpoint

server/repositories/comparisons/ComparisonRepository.js
  projects up to four completed result previews
```

The React component controls layout only. Routes authorize media before passing
an already resolved local file to `ImagePresentationService`.

## 4. Implementation Plan

1. Add the four allowlisted Comparison presentation profiles.
2. Add owner-scoped History and public Comparison slot presentation routes.
3. Extend the private Comparison summary projection from three to four images.
4. Add `ComparisonThumbnailGrid` with deterministic count classes and fallback.
5. Replace the duplicated Community and My Comparisons grids.
6. Add component, repository, route-policy, and presentation-profile tests.
7. Validate Community, My Comparisons, and Creator Profile cards at desktop and
   mobile widths.

## 5. Impact and Concerns

- **Performance:** Sharp output is cached by source metadata and profile in the
  existing bounded in-memory cache. A card requests at most four previews.
- **Security:** media authorization occurs before Sharp reads a file. Unknown
  profiles fail closed.
- **Quality:** attention crop improves subject focus but is not face detection;
  the original remains available on the detail screen.
- **Compatibility:** legacy records without a valid presentation fall back to
  their existing thumbnail or image URL.
- **Reuse:** Community and My Comparisons no longer carry separate grid logic.

## 6. Testing

### Automated

- One image fills the stage.
- Two images render two columns.
- Three images render three columns.
- Four images render a two-by-two grid.
- A failed presentation URL falls back to the existing thumbnail.
- Comparison list projection returns four completed previews in source order.
- Every count-specific profile uses its documented dimensions and Sharp
  attention.
- Private History presentation rejects another actor.
- Public slot presentation applies the existing Community visibility policy.

### Manual

1. Open Community and filter to Comparisons.
2. Verify cards containing two, three, and four completed images use their
   corresponding layouts.
3. Open My Comparisons and confirm the same layout and crop.
4. Open a Creator Profile Comparison tab and confirm the same component output.
5. Open each card and verify the full Comparison Workspace still uses complete,
   uncropped output images.
6. Repeat at desktop `1440px` and mobile `390px`.

## 7. Acceptance Criteria

- Two, three, and four-image cards match the defined layouts.
- All Comparison card surfaces use `ComparisonThumbnailGrid`.
- Preview crops are Sharp attention presentations with safe fallbacks.
- No original or fullscreen output is replaced by a cropped presentation.
- Actor ownership and Community visibility remain enforced server-side.
