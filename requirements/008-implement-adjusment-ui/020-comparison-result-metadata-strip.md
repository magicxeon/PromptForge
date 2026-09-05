# UI-020 Comparison Result Metadata Strip

**Status:** Implemented; automated and responsive visual validation passed
**Primary role:** UX/UI Product Designer
**Reviewer:** QA Release Engineer
**Owning capabilities:** Shared Comparison presentation and Comparison read projection
**Related requirements:** UI-007, UI-011, UI-019

## 1. Outcome

Users reviewing generated outputs side by side can compare speed, delivered
dimensions, delivered aspect ratio, file format, and Credit cost without
opening each image separately. The image remains the primary inspection area,
and existing winner, Collection, download, paging, zoom, and sharing behavior
is preserved.

## 2. Data Contract

- Comparison remains the owner of Set, run, slot, winner, and read-projection
  state. Generation and History remain the owners of generated result facts.
- A completed slot result explicitly exposes nullable `width`, `height`,
  `mimeType`, and `generationDuration` fields already produced by Generation.
- `actualCredit` is displayed when present. `estimatedCredit` is a temporary
  fallback only when actual cost is not yet available.
- Requested aspect ratio comes from the immutable run
  `configurationSnapshot`. Delivered aspect ratio is derived from the original
  result dimensions, never from thumbnail dimensions.
- Comparison detail hydration copies missing original width and height from the
  actor-owned History record. It does not mutate History or create a second
  media metadata store.
- Unknown or legacy metadata remains absent rather than being guessed.

## 3. Presentation Contract

The shared result metadata strip conditionally presents:

1. generation duration;
2. delivered pixel dimensions;
3. delivered aspect ratio;
4. actual or estimated Credits;
5. output file format.

Rules:

- Every visible value uses a familiar Lucide icon and an accessible label or
  tooltip.
- Provider and model remain in the result header and are not duplicated.
- At usable panel widths, the footer is split into compact information on the
  left and Winner, Collection, and Download actions on the right. Metadata uses
  at most two visual rows and no decorative divider is added.
- When a result panel is too narrow to hold both groups safely, a panel-scoped
  responsive rule stacks the same two groups without changing their order or
  actions.
- A restrained warning marks a meaningful delivered/requested aspect-ratio
  mismatch. Equivalent ratios such as `6:8` and `3:4`, including small provider
  pixel rounding, are not warnings.
- File format is derived only from a valid image/video MIME type.
- Zero Credits is a valid displayed value. Missing Credits are not rendered as
  zero.
- The component is presentation-only and reusable by another generated-media
  surface without importing Comparison APIs.

## 4. State Matrix

| State | Expected result |
|---|---|
| Completed with full metadata | Show all available icon values |
| Processing with estimate | Show estimate with an approximate marker |
| Legacy result missing dimensions | Omit dimensions and ratio |
| Delivered ratio matches request | Normal ratio treatment |
| Delivered ratio differs materially | Warning icon/color and explanatory tooltip |
| Public snapshot omits financial data | Omit Credits; preserve other safe facts |
| Failed slot | Preserve existing failure presentation and actions |

## 5. Responsive, Theme, Accessibility, And Localization

- Metadata wraps within its result panel and never creates horizontal page
  overflow at approximately 390px, 820px, or 1440px.
- Use semantic theme tokens; do not add theme-specific hard-coded colors.
- Icon values expose localized accessible names and native hover descriptions.
- English and Thai catalogs retain key parity.
- Existing keyboard and focus behavior for result actions remains unchanged.

## 6. Preservation Boundaries

- Do not change Generation submission, provider routing, pricing, Credit
  settlement, Comparison lifecycle, sharing policy, or media persistence.
- Do not expose raw usage payloads, job IDs, prompts, private references, or
  provider diagnostics in the compact strip.
- Do not move or remove existing result actions.

## 7. Verification

Automated:

1. Slot schema preserves original width and height.
2. History recovery supplies missing width, height, MIME type, and duration.
3. Complete metadata renders with icons and accessible labels.
4. Actual Credits win over estimates; estimate remains identifiable.
5. Equivalent and rounded ratios do not warn; material mismatches do.
6. Existing Comparison viewport, fullscreen, video, winner, and action tests
   remain green.

Manual:

1. Compare three completed image providers and verify values against History.
2. Confirm a `6:8` request and `3:4` delivery are treated as equivalent.
3. Confirm a delivered `2:3` result warns when the request is `6:8`.
4. Check footer wrapping and unchanged actions at 390px, 820px, and 1440px.
5. Check default, Fashion, and Creative themes in English and Thai.

## 8. Implementation Checkpoint

- Added a reusable, presentation-only Generation result metadata strip with
  duration, original dimensions, delivered ratio, Credits, and file format.
- Comparison detail schema now types delivered dimensions and requested output
  settings explicitly.
- Comparison History recovery now carries original width and height into both
  hydrated reads and durable reconciliation without using thumbnail dimensions.
- Equivalent ratio rounding is tolerated; material requested/delivered drift is
  identified with a warning icon and localized description.
- Winner, Collection, Download, paging, zoom, fullscreen, public/private modes,
  Generation submission, and Credit settlement remain unchanged.
- Targeted frontend tests: 7/7 passed.
- Comparison server regressions: 23/23 passed.
- Full frontend regression: 109 files and 440 tests passed.
- TypeScript, targeted ESLint, i18n validation, production build, and diff
  whitespace validation passed.
- Visual verification passed at 390px, 820px, and 1440px with unchanged actions
  and no visible horizontal overflow. The final footer refinement uses a
  left/right layout where panel width permits and a scoped narrow-panel stack.
