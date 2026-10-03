# Generation Selector Screen Inventory

Owner: [GEN-UX-021](../021-generation-options-ux.md). Inspected: 2026-10-02.
Status: R1 shared selectors adopted; R2 placement revision for GV01/GI01 is
implemented and verified with focused fixtures. Evidence below is R1;
full parent-screen manual UAT is not claimed for all 17 contexts.
R3 GI05 guided alignment and shared render signature are implemented and focused
fixture-verified; see003 for current evidence and remaining live UAT gaps.
Paths below are relative to the repository root. Count:17 live entry contexts.

R5 supersedes the R2/R3 placement descriptions below for GV01, GI01 and GI05:
expanded full-width setup with writing/details/references left and yellow render
settings right; output/Queue/Recent below. Shared disclosure folds once per usable
successful current render, defers during editing, and keeps inputs mounted.
Mobile/tablet stack authoring then settings/Generate. Other14 contexts retain their
existing placement and public Generation/credit contracts. See003 R5 evidence.

R6 refines the same three Playground contexts: enter/switch tab expanded even
with restored media; only eligible new success folds setup. GC01 within Playground
uses full-width slots in narrow render panels and two columns only with sufficient
container width. Theme-aware corner gradient is confined to these render panels.
Other Comparison hosts and the remaining14 entry contexts are not redesigned.

## Live Coverage

| ID | Screen / entry | Current runtime owner | Proposed variant / intentional change | Preserve |
| --- | --- | --- | --- | --- |
| GV01 | Playground Video, `/create/playground` Video mode | `web/src/features/playground/components/PlaygroundVideoWorkspace.tsx` -> `VideoEngineTargetPanel` | R2 implemented: left engine, compact references, Prompt, quote/Generate; right result, output actions, Queue/Recent | Accepted option controls, result selection, Job status, authenticated source picker, quote/recovery |
| GV02 | Cinematic Produce, `/create/cinematic/:projectId/produce` | `web/src/features/cinematic/components/CinematicStageContent.tsx`, `CinematicProduceRuntime` | settings in existing operation sidebar; wrap to actual column width | Shot queue, selected Shot/Take, approval/override, duration advice and locked aspect |
| GV03 | Shot writer video workspace, `/create/cinematic/:projectId/shot/:shotId` | `web/src/features/cinematic/routes/CinematicStudioRoute.tsx` -> `CinematicProduceRuntime` | same settings presentation within selected Shot context | Timeline/document, editable creator Video Prompt, references and return context |
| GV04 | Embedded storyboard video renderer | `CinematicStageContent.tsx` -> `CinematicProduceRuntime embedded` | narrow settings; no duplicate route header or Generate | Scene/Shot bindings, current row and accepted attempts |
| GI01 | Playground Image | `web/src/features/playground/routes/PlaygroundRoute.tsx` -> `GenerationExperience` | R2 implemented: same left-tools/right-result placement as GV01, using image-specific options | Image draft, negative prompt where available, reference roles, output actions, result/Recent and groups |
| GI02 | Studio Face, `/create/studio/face` | `web/src/features/studio/routes/StudioRoute.tsx` -> `GenerationExperience` | settings in current engine region | Face builder, source authority, portrait preview and guided/read-only prompt |
| GI03 | Studio Character Sheet, `/create/studio/character` | `StudioRoute.tsx` -> `GenerationExperience` | settings with current image contract | Character builder, wardrobe, dimensions/template rules and review |
| GI04 | Scene Builder, `/create/studio/scene` | `web/src/features/scene-builder/routes/SceneBuilderRoute.tsx` -> `GenerationExperience` | settings adjacent to existing Scene controls | Scene form, prompt compilation, environment/reference roles |
| GI05 | Playground Character Look Sheet, `imageMode=look-sheet` | `web/src/features/profiles/components/CharacterLookSheetExperience.tsx`, surface playground | R3 guided composer: shared compact header; left Model, mounted definition disclosure, read-only references/prompt and Generate; right result/Queue/Recent | Sheet template, identity, pending locks, references, text enhancement fee, image total and exports |
| GI06 | Studio Look Sheet, Character entry with `format=look-sheet` | `CharacterLookSheetExperience.tsx`, surface studio | existing guided Studio placement and shared chooser; yellow engine shell, no region relocation | Existing Studio authoring/navigation and generation constraints |
| GI07 | Generate Character Look Sheet modal, Profiles/Cinematic | `web/src/features/profiles/components/CharacterLookGenerationDialog.tsx` -> `GenerationExperience` | dialog-sized settings; child menu focus and clipping fixes | Candidate selection, review/approval separation, source identity and close behavior |
| GI08 | Cinematic Scene Environment modal | `web/src/features/cinematic/components/SceneEnvironmentControl.tsx` -> `GenerationExperience renderWorkspace` | settings in current generation section | Scene description, project image list, selection, completed-image refresh and reusable environment |
| GI09 | Storyboard/Shot First Frame modal | `web/src/features/cinematic/components/StoryboardShotDialog.tsx` -> `StoryboardShotWorkspace`/`GenerationExperience` | settings; readable compact options with dialog-safe menus | Direction preview, image/reference inspection, existing controls, candidate approval and old Take preservation |
| GI10 | Embedded First Frame generation | `StoryboardShotDialog.tsx embedded` -> `GenerationExperience renderWorkspace` | compact settings scoped to inline region | First Frame beside Shot direction/timeline, selected Shot, image/video separation |
| GB01 | Storyboard Generate All dialog | `web/src/features/cinematic/components/StoryboardGenerateAllDialog.tsx` -> direct `EngineTargetPanel` | one shared settings toolbar; no per-Shot duplication | Eligible/excluded counts, full batch quote, mandatory confirmation and failure details |
| GB02 | Fashion Blueprint engine selector, `/create/fashion` | `web/src/features/fashion-blueprint/routes/FashionBlueprintRoute.tsx` -> direct `EngineTargetPanel` | settings when its existing routing mode exposes engine choice | Existing automatic/manual routing, item scope, aggregate quote, confirmation and grouped results |
| GC01 | Image Comparison model slots, wherever enabled | `web/src/components/comparisons/ComparisonConfigurator.tsx` | slot; combined chooser per existing slot | Slot IDs/order/remove bounds, applicable controls, per-slot price, aggregate total and media ownership |

One row may be reachable from several links; do not create a new implementation
for each link. Conversely, a shared component passing does not prove every parent
dialog/sidebar is correctly framed. Review each row at its actual container width.

## Shared Owners

| Existing owner | Planned responsibility |
| --- | --- |
| `web/src/components/generation/VideoEngineTargetPanel.tsx` | Video option presentation; caller still owns selected state and callbacks |
| `web/src/components/generation/EngineTargetPanel.tsx` | Image options, count, refinement and eligibility-preserving Comparison entry |
| `web/src/components/generation/EngineTargetPanelFrame.tsx` | Compact semantic frame and theme treatment; preserve existing caller regions |
| `web/src/components/generation/GenerationExperience.tsx` | Existing image quote/reference/state orchestration and workspace regions |
| `web/src/components/generation/PlaygroundGenerationWorkspace.tsx` | R2 editable composer; R3 additive mounted guided builder and stable tools ref; shared render signature; non-composer placement unchanged |
| `web/src/components/generation/StudioGenerationWorkspace.tsx` | Settings placement within guided authoring; no forced duplicate prompt |
| `web/src/components/generation/GenerationCommandRegion.tsx` | Existing action composition and readiness/quote adjacency |
| `web/src/components/comparisons/ComparisonConfigurator.tsx` | Slot state/order and estimates; consume shared chooser presentation |
| `web/src/components/ui/` and current Radix usage | Buttons, spinner, focus-managed selection/dialog primitives |
| Existing feature preferences, Generation/References/Credits APIs | State, capabilities, source authority and quotes remain canonical |

## R2 Scope Gate

R3 supersedes the following R2-only GI05 exclusion. GI05 Playground Character
Look Sheet now uses the compact common header and guided composer, with its
definition form preserved. GI06 Studio Look Sheet retains its placement. All
live shared engine settings receive the yellow signature via the existing frame
and shell owners; no other context's regions move. Standalone Comparison settings
inherit through their existing EngineTargetPanelFrame host. New evidence belongs
to the R3 verification section, not the historical R1 table below.

Only GV01/GI01 change region placement. Their active Comparison uses the right
output region on desktop and follows the creation tools in stacked layouts; its
former full-width result-first placement is superseded for this host. GC01 slot
controls remain unchanged. GI05 Playground Look Sheet is a guided form and does
not adopt this relocation merely because its route includes Playground.

GO-T14-T18 and the R2 acceptance matrix own new layout evidence. R1 test and
screenshot counts below must not be used to mark this revision implemented.

## R1 Implementation Coverage And Remaining UAT

All rows use the shared chooser through the existing public panels. No new feature
controller, queue path or preference key was introduced. Evidence is deliberately
split between shared behavior, owner integration and full browser routes.

| Context | Focused evidence performed | Remaining screen-specific check |
| --- | --- | --- |
| GV01 | `PlaygroundVideoWorkspace`, model/readiness and workspace tests; actual mocked Playground route TH/EN at 390/820/1440; composer visual fixture | Live draft, real provider and wallet UAT |
| GV02 | `CinematicProduceRuntime` 59 tests, including approval, quote consent and selected Shot/actor isolation; narrow settings visual fixture | Actual Project sidebar screenshots and Take switching UAT |
| GV03-GV04 | Same public runtime/panel contract and tests as GV02 | Shot writer and embedded parent framing/UAT, separately |
| GI01 | `GenerationExperience` and workspace tests; image shared panel tests | Full Playground Image route screenshots and saved image draft UAT |
| GI02-GI04 | Guided opt-out retained; `StudioGenerationWorkspace` and `GenerationExperience` tests | Each actual guided authoring form, source controls and parent layout |
| GI05-GI06 | `CharacterLookSheetForm`, `CharacterLookDialog`, enhancement and shared image tests; composer explicitly excluded for Look Sheets | Both route contexts with saved sheet/candidate and price breakdown |
| GI07 | Shared chooser in a real Radix dialog fixture across all widths/themes/locales; Look dialog integration tests | Actual Generate Look Sheet modal with current candidate/review actions |
| GI08 | `SceneEnvironmentControl` 11 tests including completed-image reconciliation/close; shared dialog fixture | Actual environment modal and selected Scene image walkthrough |
| GI09-GI10 | `StoryboardShotDialog` 18 tests; shared dialog fixture | First Frame modal and embedded direction/timeline layout separately |
| GB01 | `StoryboardGenerateAllDialog` 21 tests; price/consent and surface eligibility preserved | Actual batch scope/exclusion list and quote walkthrough |
| GB02 | Fashion tests and image helper tests (9 checks in Fashion group) | Actual Fashion manual engine region and aggregate quote layout |
| GC01 | `ComparisonConfigurator` 5 tests; slot visual fixture | Comparison slots inside each real host with selected results |

Visual fixtures cover composer/settings/dialog/slot, including a 360px sidebar
inside a wide desktop viewport. They are not screenshots of every parent route.
Existing detailed reference editing is retained rather than replaced with a new
upload workflow. Its ordered summary now includes 64x80 thumbnails, role/name and
exact rejected-image treatment. Missing/failed previews use an icon. Trusted
previews resolve by source identity, not draft-array position. No reference order
or payload index was changed; detailed editing density can be refined after UAT.

## Non-Live Findings

- `web/src/features/cinematic/components/CinematicEngineTargetPanel.tsx` has no
  inspected runtime import consumer. It is a preview/read-only component with
  its own test; do not count it as a live generation selector or delete it merely
  because a text search found no caller. Recheck consumers before any cleanup.
- `ProduceStage` in `CinematicStageContent.tsx` has a no-Project prototype branch
  with hard-coded models/prices. A real Project uses `CinematicProduceRuntime`.
  Exclude the prototype from paid UI evidence; do not promote its model list,
  numbers or fake operation controls into the new shared catalog.
- Gallery/History media metadata and Admin provider configuration are not
  generation-option selectors. Keep them outside this redesign.

## Reconciliation With Existing Requirements

- Cinematic Rewamp000/010/tasks000 previously protected Engine presentation.
  GEN-UX-021 opens only this selector presentation boundary; result/queue and
  Take workflows retain their prior protection.
- Shared references continue using existing source eligibility and provider
  reference contracts, including the Playground reference requirement packet.
- Commercial Phase2-23 owns the current free/paid matrix, actual-usage maximum,
  consent and settlement. Earlier fixed/POC quote assumptions are not UX defaults.
- Fashion retains its own routing modes; the Cinematic one-mode rule does not
  authorize removal of a Fashion workflow control.
- The clip is interaction inspiration. Model names, selectable values and prices
  are always provided by Momelo's effective catalog/quote, not copied from it.
