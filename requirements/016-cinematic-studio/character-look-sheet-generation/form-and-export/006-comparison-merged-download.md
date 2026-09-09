# 006 Comparison Layout And Merged Download

ID: CLSFE-006. Status: baseline implemented; remaining acceptance checks tracked in PLAN. Owners: Comparisons for source/run policy;
Assets for composition. Depends on [005](005-download-export-and-branding.md).
Updated: 2026-09-08, including orientation-aware presentation and export.

2026-09-09: [025-029](025-comparison-export-master.md) supersedes the exported
composition, branding and download dialog only. The viewer layout and existing
run/source authority in this requirement remain in effect.

## Scope And User Flow

Add Auto / Side by side / Top to bottom layout selection to existing IMAGE
Comparison workspaces. Reuse the shared workspace across generation, private
detail and existing public image viewers without changing their access/actions.
Video Comparison layout is unchanged by this requirement.

Add an explicit Download comparison action to an owned completed Comparison
workspace, initially the private Comparison detail and its shared result
workspace where the same set/run identity is available. Download individual
images, Winner/Clear winner, Add to collection, Share, rename and delete remain.

```text
Image Comparison -> Auto or explicit layout -> inspect images
Owned completed run -> Download comparison
 -> authorized completed slots in displayed order
 -> shared Export facade -> merged PNG with Momelo footer/logo
```

Do not replace the interactive Comparison workspace with a single image on screen. Do not alter
Comparison Generation, winner state, Community voting or original outputs.
Public Comparison post/gallery export is not enabled by this private-owner slice.

## Layout Modes

Image orientation and arrangement are different concepts: portrait images are
normally shown beside each other; wide landscape images are normally stacked.

| Mode | Screen and export arrangement |
|---|---|
| `auto` (default) | All compared images landscape: resolve to `stacked`. Portrait, square, mixed orientations or unresolved metadata: resolve to `side_by_side`. |
| `side_by_side` | Images in left-to-right order; bounded multi-row grid for larger exports. |
| `stacked` | Images in one column, top-to-bottom order, aligned at the same content width. |

Classify landscape by valid width > height, portrait by height > width, and
square by equal dimensions. Use authorized output dimensions; for a missing
dimension use a valid submitted aspect ratio before the final side-by-side
fallback. Never infer orientation from thumbnail crop, CSS size or viewport width.
Keep the fallback visible through the selected mode; an explicit choice always
wins and is not reset when a late image loads or a user changes pagination.

Auto uses the whole run's relevant source metadata, not only the current page.
During generation, use submitted aspect ratio for stable placeholders. Reconcile
once against the terminal result set; do not repeatedly rearrange the workspace
on individual image load events. A new run may resolve Auto independently.

Add compact familiar layout icons with localized tooltips/accessibility labels
and selected states to the existing toolbar. Auto can retain its text label.
Keep the current shared component controlled through state/callbacks. Persist
preference only through existing actor-scoped UI state if needed; it is not a
Generation parameter, shared public setting or Credit/Comparison mutation.

## Inspection And Responsive Behavior

- Preserve slot order, page navigation, image metadata, Winner/Clear winner,
  public vote where already present, Add to collection and individual Download.
- Preserve synchronized zoom/pan, reset and fullscreen. Layout changes do not
  alter originals. A stacked viewer must remain scrollable with reachable actions.
- At default fit, use contain and stable frame dimensions: no cropping of a
  different-aspect source to make the comparison appear more consistent.
- Stacked landscape frames use the available readable width rather than small
  side-by-side thumbnails. Portrait/square images retain the compact row default.
- Mobile can reduce visible columns or stack panels to avoid overflow. This is
  a responsive screen adaptation, not a change to the chosen export layout.
  Make the resolved export arrangement available in the download control/preview.
- Verify 390/820/1440px with portrait, landscape, square and mixed images;
  no clipping, unreachable footer actions or unexpected page-wide scrolling.

## Rules

- Require a terminal completed/partially-completed run and at least two usable
  completed results. Pending, cancelled or failed slots are never blank images
  silently presented as successful model outputs.
- For a partial run, show the completed-image count before download. Export only
  those completed slots; unavailable source media causes a clear export error,
  not silent replacement from another run or another actor.
- Pin set ID + run ID + result IDs/order + permitted captions, requested layout,
  resolved arrangement and layout policy version at export start.
  New runs or winner changes during export cannot produce a mixed snapshot.
- Server rechecks membership/owner and count through ComparisonOrchestrator's
  public projection. Do not trust arbitrary result-ID arrays from React.
- Export accepts only `auto`, `side_by_side` or `stacked`. The server resolves
  Auto from the pinned authorized metadata under the same Comparison policy;
  Assets renders that arrangement rather than introducing another heuristic.
  Add client/server parity fixtures and reject invalid/stale policy inputs.
- For side-by-side export, use one row for 2-3 images and a bounded grid for
  4-6 when permitted by existing limits. Stacked export always uses one column.
  Keep all sources complete with contain. Scale the whole composition uniformly
  within 005's pixel/dimension limits, or return a clear limit error; never drop
  images, crop, or silently switch the requested layout to make it fit.
- Export the completed authorized results of the pinned run, including those
  beyond the currently visible page. Display the export image count. Inspection
  zoom/pan/fullscreen and viewport dimensions must not change export pixels.
- Include resolved arrangement and layout policy version in the render
  fingerprint/coalescing key, so switching layout cannot return a previous file.
- Optional captions are limited to authorized provider/model display labels and
  winner state from the pinned projection. No hidden prompt or credit/cost data.
- Reuse the same validated logo/config/layout/version/error handling as 005.
  No Comparison-specific watermark renderer or export billing lifecycle.

## Tasks

- [x] CMP-01 Add bounded, authorized export-source projection to owning facade.
- [x] CMP-02 Add Comparison composition profile using shared export primitives.
- [x] CMP-03 Add controlled shared workspace action; preserve existing actions.
- [x] CMP-04 Wire private route and generation result consumers with valid run IDs.
  Hide unsupported consumers instead of fabricating IDs or broadening access.
- [ ] CMP-05 Verify full/partial/empty/foreign/stale runs and fixed output layout.
- [x] CMP-06 Define orientation/Auto/fallback rules and normalized layout inputs
  under Comparison ownership; add client/server policy parity fixtures.
- [ ] CMP-07 Add accessible controlled layout selector and responsive stacked
  inspection; preserve pagination, zoom/fullscreen and actor isolation.
- [ ] CMP-08 Add stacked export profile and layout-aware fingerprint/limits;
  verify consistency independent of mobile reflow, pagination and zoom.

Implementation order is CMP-06 -> CMP-07 for presentation, then CMP-01/02/08
for export, CMP-03/04 for wiring, and CMP-05 for verification. Follow G7 in PLAN.

## Acceptance

CMP-A1: 2+ completed owned images produce one branded PNG in displayed order.
CMP-A2: partial count is explicit; missing/foreign sources cannot leak or mix.
CMP-A3: individual downloads and Winner/collection/share continue to work.
CMP-A4: export never calls a provider or mutates Comparison/Credit state.
CMP-A5: desktop/mobile action placement and exported grid remain readable.
CMP-A6: Auto stacks landscape sets; portrait/square/mixed/unknown metadata uses
the documented fallback. Explicit mode wins and image loading causes no churn.
CMP-A7: both manual layouts preserve source order, contain fit, metadata/actions,
pagination, synchronized zoom/reset and fullscreen in all existing image viewers.
CMP-A8: downloaded arrangement matches the selected logical mode for the pinned
run, independent of viewport, current image page and inspection transforms.
CMP-A9: different layouts cannot collide in export fingerprints; invalid layout
or oversized stacked output fails clearly without source mutation or extra charge.
CMP-A10: Video Comparison and public export permissions remain unchanged.
Groups: `comparison`, `privacy`, `layout-comparison`, `layout-export` in [009](009-verification-and-release.md).
