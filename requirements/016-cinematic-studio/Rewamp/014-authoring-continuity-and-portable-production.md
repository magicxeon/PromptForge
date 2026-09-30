# 014 - Authoring Continuity And Portable Production

Status: core implementation delivered; focused checks passed, live quality/UAT pending.
Q1 confirmed: Chapter only. See task packet evidence and remaining qualifications.
Date: 2026-09-26. Capability: Cinematic authoring and production preparation.
Primary: Product Requirement Architect. Review lenses: UX/UI Product Designer and
Cinematic Experience Director, applied sequentially by one agent, not independent
subagents. Skills: review-product-ux and design-cinematic-experience.
Execution: [task packet 014](tasks/014-authoring-continuity-and-portable-production.md).

## 1. Outcome And Scope

Let authors reorder existing Chapters/Scenes, maintain narrative continuity, read
and edit long Thai/English prose comfortably, and take owned Shot images and a
usable Video Prompt to another tool without generating video inside Momelo.

Seven workstreams:
1. Reorder Chapters.
2. Reorder Scenes.
3. Portable Shot images/prompts.
4. Manual Project-wide video direction, inherited by Shots.
5. Consistent centered Character portraits throughout Cinematic.
6. A new editorial 9:16 Look Sheet layout based on user attachment 2.
7. Continuity-aware AI authoring and writer readability (separate delivery slices).

Non-goals: another Simple/Advanced mode; replacing the canonical Shot document;
redesigning Engine & Target Output, Render, Queue or Credits; running paid AI while
opening a screen, reordering, copying or editing defaults; deleting existing work.
Only additive authoring/export actions may be placed beside protected Render UI.

## 2. Inspected Baseline And Reconciliation

| Area | Current evidence | Required delta |
|---|---|---|
| Chapters | CinematicChapterWriter sorts workspace order; CinematicSeriesService owns membership and proposal application | Add explicit reorder command and controls for existing Chapters, not merely outline rows |
| Scenes | CinematicSceneOverview sorts orderKey; older CinematicStageContent has draft Scene movement; dedicated reorderSceneShots moves Shots, not Scenes | Add Scene-order command to the current facade and new Scene UI; do not route through legacy editor |
| Context | proposeChapters passes Full Story and existing Chapter prose; CinematicFullStoryService caps neighboring prose at 6,000 characters | Replace indiscriminate prefix-only context with ordered, source-backed continuity context |
| Scenes/Shots | proposeScenes passes Chapter/current Scenes but no explicit previous-Chapter exit; proposeShots passes adjacent Scenes | Add predecessor state and exact relevant boundary evidence through existing text entry points |
| Empty revision | Chapter UI disables empty instruction and server rejects selected revision without instruction | Add explicit continuity intent; ordinary manual revision validation stays intact until Q1 is resolved |
| Prompt | CinematicShotWriter already supports editable/copyable Video Prompt and fingerprints | Reuse it; add external handoff and shared video direction, not a second compiler |
| Portraits | SharedCharactersPanel, Cast cards and authoring/SceneCastLookSelector use different slots/crop styles; one Cast style uses center 20% | Audit all Cinematic consumers and separate avatar vs full-sheet rendering |
| Look Sheet | look-sheet.v4.json already requests 9:16 with asymmetric front/side/back and fixed face cropManifest | Introduce versioned editorial layout and matching crop contract; do not reuse old coordinates |
| Writer | cinematic.css mixes body text with compact metadata sizes and multiple textarea styles | Scope readable prose surfaces across Brief, Full Story, Chapter, Scene, Shot and Video Prompt |

This addendum extends 003/011 (authoring), 004 (assets), 005/009 (Shot preparation)
and 006/010 (UX). It does not declare their remaining work complete. Explicit
continuity mode is the only proposed exception to the earlier nonempty Revise
instruction rule. Normal users still cannot inspect internal technical payloads;
portable creator-facing prompts are distinct from admin/support diagnostics.

## 3. Chapter And Scene Ordering

- Default proposal: move a Chapter within its current Season; without Seasons,
  within its Project. Move a Scene within its Chapter. Cross-Season and cross-Chapter
  transfers are separate operations, not silently inferred from arrow clicks.
- Put familiar up/down icon actions in the relevant outline/list, with localized
  tooltips and accessible names. Retain selected item ID, editor text and scroll.
  Dragging can supplement these controls later; keyboard/mobile cannot depend on it.
- Disable only the unavailable direction at a boundary, or mutation during pending,
  offline/unauthorized state. Handle dirty edits through existing Save/Discard/Cancel.
- Server accepts the complete sibling-ID permutation and expected workspace/order
  version. Validate duplicates, omissions, unknown IDs, actor ownership and scope.
  Persist ordering atomically through the owning repository transaction.
- Stable Project/Chapter/Scene/Shot IDs, URLs, prose revisions, Cast/Looks, environments,
  First Frames, Takes and receipt history must not be recreated. The Full Story root
  must remain the root even if a Chapter backed by that record changes position.
- Update displayed numbers and navigation from canonical order. Do not rewrite
  numbers embedded in authored titles or dialogue. Do not rewrite confirmed Full
  Story/outline text just because production order changes; show a review notice.
- Reordering invokes no AI and does not rewrite story content. Mark affected
  adjacency-derived continuity context/proposals for review, not every Asset invalid.
  Preserve pinned previous-frame references and Takes; explain when their original
  predecessor differs from the new predecessor. Offer keep/reselect explicitly.
- Refresh library/workspace/detail queries using existing actor-scoped keys. Failed
  moves restore the previous order and focus; stale requests offer reload/retry.
- Do not lock a moved item merely because it has rendered media. Audit the legacy
  cinematicOpening-first restriction; offer an explicit role reassignment or warning
  rather than making ordinary Scene reorder depend on finding the old editor.

## 4. Continuity Context Algorithm

Extend the Cinematic facade and existing text-generation normalization/recipes.
Use one reusable context builder with level-specific projections, not separately
implemented neighbor logic for Chapters, Scenes and Shots.

### Input Selection

1. Resolve owned root, selected stable ID, canonical Season/Chapter/Scene/Shot order,
   active saved revision IDs and confirmed story canon. Never use creation time or
   the first N characters as the sole definition of narrative context.
2. Protect explicit author instruction, current target prose, assigned Characters,
   Look/wardrobe IDs, voice baseline and required plot anchors.
3. Read the direct predecessor's authored exit and the target's entry/exit. Include
   the following unit's planned entry as an endpoint constraint, not as knowledge
   already held by a Character. A first item uses its parent opening, not a fake
   predecessor. Across Season boundaries use the previous Season finale only when
   ordered story continuity exists; preserve explicit time jumps/flashbacks.
4. Build a small continuity ledger: place/time/weather; Character location, knowledge,
   relationships, objective and emotional state; held props/hand contact and condition;
   wardrobe/appearance; unfinished action/dialogue and unresolved story obligations.
   Each fact carries source ID/revision and evidence or an explicit unknown/conflict.
5. Prefer existing structured facts and authored entry/exit blocks. When absent,
   use bounded exact ending/beginning excerpts with an excerpt label. Missing facts
   remain unknown; a substring is not presented as an AI-understood summary.
6. Fill remaining budget with relevant older unresolved facts and next-unit anchors.
   Bound predecessor depth, neighbor excerpts, cast count and input/output budgets
   in validated workflow/text policy. Preserve Thai dialogue/speaker mapping and
   required facts. Deduplicate by stable entity/fact identity, not fuzzy name merging.
7. Include source versions plus an ordered-ID digest in proposal provenance. On
   Apply, reject stale proposals if source text, order or pertinent bindings changed.
   Preserve the proposal for inspection; regenerating is a new explicit operation.

### Generation And Revision

- Chapter generation preserves the confirmed Full Story's canon and approved count;
  Scene generation also includes the predecessor Chapter exit when relevant; Shot
  generation includes the preceding Shot exit, not just the neighboring Scene title.
- For all-item generation, use one bounded ordered batch where feasible, with
  explicit entry/exit obligations between returned items. If batching cannot fit,
  present scoped work/cost before any sequential requests. Do not hide extra AI calls.
- AI semantic summaries are optional future explicit work through the existing text
  workflow; do not add automatic per-neighbor paid summaries or a new background job.
- Generate/Revise remains Proposal -> Preview -> Apply/Discard. Show concise changes
  and continuity warnings. Revise only the selected unit; never cascade into children
  or neighboring prose/media automatically.
- With an empty instruction, proposed explicit intent is `continuity`: change the
  action label to Improve continuity and show localized scope copy. Whitespace is
  empty. With text, use normal Revise with AI. Never silently send an empty request
  to the current manual-revision contract. Q1 below gates this behavior.
- First item with no prior context can use saved parent canon/current text; if both
  are absent, explain missing source and disable. Ordinary validation, pending
  proposal/version checks and configured pricing consent remain.
- Continuity is advisory unless ownership, invalid input, real provider constraints
  or stale Apply make the operation unsafe. Do not promise model-perfect continuity.

## 5. Manual Project Video Direction

- Add a collapsed Project video direction section at the root Setup/production
  settings, with one manual multiline field. Show an inherited summary/link near
  each Shot Video Prompt. Editing here is not an AI request.
- This is user creative direction, not the provider's privileged system role or
  Momelo's internal system instructions. Store it once on the root with revision;
  child Chapters/Scenes inherit it without copied mutable strings.
- Examples: no background music; no spoken dialogue; silent output; natural soft
  lighting; restrained camera movement. Keep these distinct. No music must not
  erase dialogue/ambience; silent output includes both. Prompt text alone cannot
  guarantee silence, so map supported explicit audio settings through existing
  provider contracts when unambiguous; otherwise show the effective limitation.
- Proposed precedence: platform/reference/technical constraints remain mandatory;
  explicit Shot-local exceptions override Project creative defaults; Project
  defaults override recipe creative defaults. Surface contradictory prose for review
  rather than attempting to infer all free-text semantics with string matching.
- Reuse existing Shot custom prompt/reset flow for exceptions; do not introduce
  per-attribute Shot forms. Preserve existing custom text and historical Take packets.
  A changed root direction marks derived preparation stale and offers refresh/review.
- The canonical compiler includes inherited direction once. Export and in-app video
  use the same effective snapshot and final prompt-budget owner. Root text counts
  toward limits; no silent truncation or hidden AI optimization.
- Save manual text as Project data. Configuration owns limits/default template and
  feature policy, not individual users' private instructions. Default is empty.

## 6. External Shot Handoff

Add a compact Use in another tool group beside First Frame / Video Prompt, before
the existing Render action. This is not a separate authoring mode.

- Actions: Copy prompt; Copy image; Download image. Reuse existing text-copy action
  and authenticated media delivery/download contracts. Use actual selected original
  media, not a screenshot, cropped thumbnail or temporary provider URL.
- Show First Frame and the actual ordered Character/Look/Expression/environment/prop
  references with labels identifying person, role and source. Users can copy/download
  each available image. Missing First Frame must not prevent prompt/Look export.
- Number references contiguously from actual selected attachments. Exported labels
  and prompt agree. Removing a reference recomputes numbering and warns when identity
  evidence is missing; do not invent @Image 1 for direct video with no First Frame.
- Clipboard image support depends on secure context, permissions, image type and
  browser. Feature-detect, report failure honestly, and keep Download available.
  Never auto-upload private media, publish it or expose credentials/internal URLs.
- Offer creator-readable effective prompt, including shared direction and manual
  edits. Keep admin/support compiled diagnostics role-gated. If exported text is
  unsaved or source-stale, label it and allow review/copy without pretending it is
  the saved Render snapshot. Copying must not require an in-app video quote/approval.
- External generation is outside Momelo's status/credit tracking. No Momelo media
  generation credits for copying/downloading; existing billable text generation is
  unchanged. Do not promise acceptance by another provider or bypass its policies.
- Preserve normal file ownership checks; unavailable/deleted/foreign images produce
  a useful per-image state while remaining valid references are still accessible.

## 7. Portraits And Editorial Look Sheet

### Portrait Audit

Inventory Full Story cast, Chapter cast, Scene cast/Looks, Shot Characters, pickers,
dialogs and existing Render reference strips. Reuse a consistent media-slot contract
with AuthenticatedMediaImage and stable placeholder; no global `img` CSS override.

- Avatar: use authorized face/portrait crop when present, fixed aspect ratio and
  centered subject; no stretching. Honor existing authored focal/crop metadata.
- Full Look Sheet/reference: contain the whole sheet, centered, with no face-like
  crop of a multi-panel sheet. Environment previews retain their own framing.
- If source itself is off-center, CSS center does not detect/reposition the person.
  Prefer approved crop metadata or explicit crop adjustment; no new paid generation
  or face-detection service is needed for this layout work.
- Test absent, loading, failed, portrait, landscape, sheet and off-center originals.
  Names/roles and checkbox actions must remain readable at narrow panel widths.

### New Look Sheet Template

User attachment 2 is the composition reference, not a new identity/costume authority.
Retain vertical 9:16 and use the chosen dossier/Look for identity and outfit.

```text
Compact character / Look / period header
Front full body | Three-quarter full body | Side full body
Face close-up   | Hairstyle detail        | Costume detail
Material details                         | Accessories, only if present
```

- Equal-height main figure columns, aligned baselines, full head/hands/feet, clean
  gutters, restrained section captions and neutral studio background. Header/details
  must not dominate face or wardrobe evidence. No decorative quote required.
- Accessory detail shows only authorized items; omit/collapse when none. Preserve
  garment, fabric, hairstyle and accessory consistency across views.
- New versioned recipe/template and crop manifest; maintain existing v4 assets and
  their coordinates. Audit consumers that require a back region before introducing
  front/three-quarter/side. Back remains an optional compatible variant, not an
  invented crop from the new sheet. Expression sheets remain a separate asset type.
- Titles/captions use deterministic UI/export composition where an existing owner
  supports it; generated text is not guaranteed accurate. If exact layout needs a
  new compositor, identify dependency/cost separately instead of claiming prompts
  alone guarantee fixed geometry. No added multi-image generation without consent.
- Verify generated region alignment before extracting a canonical face. Do not
  treat a prompt instruction as proof that the model followed normalized rectangles.
- Existing realism choices remain; making art 5% more illustrated does not guarantee
  video-provider acceptance. Do not add policy-bypass promises.

## 8. Writer Readability: Research And UX Proposal

Research supports sufficient contrast and controllable presentation, not a claim
that dark or light universally eliminates eyestrain. W3C specifies 4.5:1 for ordinary
text (AA); its visual-presentation criterion is AAA, not an AA obligation. Text-spacing
requirements concern tolerance of user overrides, not mandatory default spacing.
Sources: [Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
[Visual presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html),
[Text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

NN/g notes dark-mode preference varies and saturated foreground colors can impair
legibility. Keep brand accents out of long prose and validate with actual users.
Source: [Dark mode user research](https://www.nngroup.com/articles/dark-mode-users-issues/).

Proposed Momelo application (design choices to verify, not measured current defects):
- Preserve shell, theme palettes, navigation and primary action styling. Use a quiet
  neutral prose surface separated from shell/background, a restrained border and
  padding; no persistent neon glow around long text or nested decorative cards.
- Starting body size 18px (rem-based), line height about 1.8, normal 400-500 weight;
  16px minimum body option and optional 20px. No viewport-scaled type, negative
  letter spacing, monospace dialogue, full justification or muted blue body prose.
- Keep existing Thai Noto Sans Thai and English font conventions. Aim at roughly
  60-75ch desktop reading width, but validate actual Thai wrapping and diacritics;
  `ch` is not a Thai character-count guarantee. Mobile uses available width.
- Test neutral dark editor first; optionally offer a light-neutral reading surface
  inside the same theme plus compact font-size controls. Reuse actor-scoped UI
  preferences; this is a display preference, never a new Simple/Advanced mode.
- Target at least 4.5:1 measured text contrast, preferably 7:1 for prose where the
  selected palette permits. Readable labels, caret, selection, placeholder and focus.
- Keep native textarea editing first: correct Thai IME, caret, undo, selection and
  newline preservation. Present timeline sections/dialogue in a separate lightweight
  reading view only if needed. Do not rewrite stored text to format the screen.
- Avoid several nested scrolling editors. Keep Save/status reachable without covering
  content. Collapse secondary AI/history/reference detail, retaining their discoverability.
- Verify 390/820/1440px, TH/EN, all existing themes, 200% zoom, keyboard and text-spacing
  overrides. Measure an actual long Chapter and alternating dialogue before choosing
  new editor libraries. No visual change to protected Engine/Render/Queue sections.

## 9. Questions And Proposed Defaults

Q1 - Confirmed and implemented: empty Revise Chapter revises ONLY that Chapter for continuity.
It never regenerates or revises child Scenes. Approved UI:
empty input -> Improve chapter continuity; a separate Generate/Revise Scenes action.

Proposed reversible defaults unless the user says otherwise: Chapter movement stays
inside the current Season; shared video direction lives at the Project root with
Shot-local exceptions; original theme remains default with an optional reading
surface; editorial sheet remains 9:16. These are proposals, not confirmed decisions.

Implementation is authorized; record each completed slice and its evidence in task
packet 014. Do not mutate existing live projects or invoke paid provider trials.
