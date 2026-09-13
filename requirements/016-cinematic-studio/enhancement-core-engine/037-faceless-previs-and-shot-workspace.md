# Faceless Previs And Storyboard Shot Workspace

Status: implemented; focused contract/UI checks passed. Real AI-output UAT pending.
Primary: UX/UI Product Designer. Review lenses: Generative Media and QA, applied
sequentially in this session; no independent subagent execution is claimed.
Owners: Cinematic still/video prompt policies and the Storyboard Shot modal.

## 1. Correct Visual Contract

The user clarified after Job `job_1789229304585_obyuqhkrv` that 036 implemented
facial reconstruction in the WRONG stage. This supersedes 036's new-still facial
authority, not its legacy source/ownership protection.

1. Storyboard is a full-color realistic previs: physical scene, light, props,
   wardrobe, hair, body proportions and blocking. Every visible face is a smooth,
   blank skin-toned area with at most a faint thin face-center/eye-axis guide.
   No rendered eyes, eyebrows, nose, lips, teeth, facial likeness or expressions.
   This is NOT an all-over sketch, mannequin body, blur, pixelation or mask.
2. Look Sheets remain attached for the bound person's wardrobe, silhouette, hair,
   body proportions and head shape/orientation. Do NOT reconstruct their face at
   this stage. Performance is readable through body, hands, shoulders and head
   direction. Current Shot start state, light and setting remain authoritative.
3. All still-policy branches must agree, including single Character/face inputs,
   named Cast mappings, Natural Realism, baseline capture and final negatives.
   Blank-face rendering overrides facial-detail cues in older Shot direction.
4. New stills use honest server-derived `faceless_previs_v1` metadata. Preserve
   existing concept_sketch_v1 and photorealistic_storyboard_v1 assets and readers.
   No image editing/backfill/relabeling; generate a NEW image to use the correction.
5. Video uses the blank-face image as composition reference, not an immutable
   first_frame. Its fine guides mean head angle ONLY. Reconstruct each real face
   from that person's Look Sheet; no blank faces or guides in the video. Keep
   full photoreal live-action from frame one and the existing first_frame gate.
6. No extra AI calls, reference removal, provider swap, pricing or queue changes.
   Preserve ordered mappings, byte/owner checks, budget and quote/submit parity.

## 2. Modal UX Contract

Exact scope: `.cinematic-dialog__content.cinematic-storyboard-shot-dialog`.
Other dialogs, Plan, Produce, Playground and shared default layouts stay unchanged.

Current issue: long metadata, edit fields, audio and reference controls precede
the result. Compiled prompt and all controls compete in one long scrolling column.

1. Keep the Shot title, compact duration/Cast metadata and close action in a fixed
   modal header. Readable labels, not a stack of decorated metadata cards.
2. Desktop: media review on the left; organized controls on the right. Tablet and
   mobile: media first, controls below, bounded modal height and reachable actions.
   Inspect the complete portrait/landscape image with contain and retain zoom,
   fullscreen, download, result history and explicit approval controls.
3. Three keyboard-accessible tabs: image settings, Shot direction, video & sound.
   Image settings opens first; direct Edit Shot opens the direction tab. Keep
   editor and form state mounted across tabs. Never unmount the generation owner
   or active result when switching tabs or editing.
4. Keep Edit Shot, existing direction Save/Reset, compiled prompt Copy, model,
   resolution/aspect, references, Natural Realism, estimates, Generate, approval,
   video-reference toggle and Dialogue & Sound actions. The full compiled prompt
   is collapsed initially, not removed. Approved media and previous Takes remain.
5. Reuse GenerationExperience via an opt-in presentation-slot renderer. Cinematic
   owns the layout component; Generation retains all dispatch, credit, polling,
   result and error state. Existing studio/playground/stacked callers unchanged.
6. Pending states use ProcessingSpinner/GenerationStageState. Display errors and
   blockers regardless of active tab; retain cancellation/retry and duplicate
   prevention. Save/approval block conflicting Generate actions as before.
7. Use existing Momelo tokens, Lucide icons, Radix focus/keyboard behavior and
   EN/TH localization. No unrelated redesign, decorative cards inside cards,
   hidden action areas, overlapping text or horizontal overflow.

## 3. Ordered Tasks And Verification

1. Implemented; prompt checks passed (16): reconcile 036; implement faceless still
   authority and new style metadata while preserving video facial reconstruction.
2. Implemented; modal/Produce interaction checks passed (41): add the Generation presentation slot and the feature-owned workspace;
   move only the modal's sections into its media/control hierarchy.
3. Implemented and visually checked: scoped CSS, locale keys, accessible tabs,
   mobile Edit Shot scrolling and pending states. Desktop Generate remains above
   the footer; media uses contain with a bounded review height and existing viewer.
4. Passed: short focused offline prompt/schema/UI checks and isolated Playwright
   screenshots at 390/820/1440px in EN/TH. No paid media generation, live JSON
   changes, full production build or worker restart. Film Readiness tests remain
   deferred per the user's separate request.

Acceptance evidence must distinguish deterministic prompt/interaction correctness
from visual AI output. The creator reviews the next faceless image and resulting
video manually. Do not declare provider success from a compiler test.

## 4. Evidence And Handoff (2026-09-12)

Run short groups separately using `node scripts/test-cinematic-simple-production.mjs <group>`:

| Group | Result | Protected behavior |
| --- | --- | --- |
| photoreal-prompts | 16 passed | Blank-face still authority; six named references; prompt budget; non-Cinematic baseline |
| photoreal-references | 13 passed | Three styles round-trip; local bytes and actor ownership; video restores Look faces |
| photoreal-quote | 3 passed | Legacy/new composition accepted with first_frame disabled; forged style rejected |
| photoreal-ui | 41 passed | Produce controls and Shot save/version/idempotency/engine state |
| workspace-ui | 34 passed | Modal state survives tabs; old shared result, Studio and Playground layouts |
| types | passed | Web TypeScript, no emit |
| workspace-layout | passed | Real modal and GenerationExperience; EN/TH at 390/820/1440; default/fashion/creative; completed/processing/failed |

`workspace-all` is the explicit aggregate for later UAT/release checks. Browser
groups require an existing Vite server at `http://127.0.0.1:6501`, overridable with
`CINEMATIC_WEB_ORIGIN`, plus installed Playwright Chromium. The runner does NOT
start servers or workers. All API/media responses in this browser fixture are
intercepted; unexpected requests fail. No real saves, approvals, credit charges,
generation requests or live data writes occur.

Screenshots: `C:/Users/punya/AppData/Local/Temp/mpf-shot-workspace-5oI64A/`.
Screenshots show an existing fixture photograph to validate layout, NOT newly
generated faceless output. Portrait fit was visually inspected; landscape uses
the same contain contract but a separate landscape-photo visual case is deferred.
CSS collision with Produce was removed by using a dedicated namespace. Theme
contrast for fixed aspect labels and warnings was corrected within this modal.
`git diff --check` passed. No independent review execution was available; UX,
media and QA lenses were applied sequentially.

New files: this requirement; Cinematic's `StoryboardShotWorkspace.tsx`; scoped
browser runner `scripts/verify-storyboard-shot-workspace.mjs`. No files moved and
no new runtime data directories. Existing History/Group/Asset metadata carries
the new style only on new jobs; old jobs and Takes are untouched. Architecture
and enhancement master link to this correction. Default shared layouts remain.

Manual UAT: start the normal backend/worker processes with the changed code after
existing tasks finish, then open a Shot, Generate a NEW still and inspect blank
faces/faint guides, physical materials, head direction and hand/prop placement.
Approve it explicitly, then verify video has complete faces matching each Look.
Policy text and schema tests cannot guarantee provider output or acceptance.
Backend port 6500 was not reachable at final inspection; this session did not
restart it. Film Readiness tests remain explicitly deferred and out of this gate.

## 5. Prompt Hotfix (2026-09-13)

Job `job_1789232339155_ynxfikgdw` used faceless_previs_v1 but still rendered faces.
Its stored final prompt retained `preserve authorized identity` and facial
performance cues. The lighting/environment section was lost during compaction.
This is failed visual UAT, not evidence that the provider cannot render blank faces.

Scope: the still provider prompt only. Remove the mixed facial-performance section
from the faceless still projection; opening body posture/head direction remains in
the opening moment and composition. Replace generic identity-preservation wording
with body/hair/wardrobe authority. Prioritize opening moment, setting/light/weather
and camera ahead of optional prose, with less budget spent repeating style rules.
Keep reference bindings intact and the existing 4700-character limit. Do not edit
stored Shot direction, Video prompts, references, old images, Takes or pricing.

Order: update this requirement, adjust still projection and policy, then hand back
for one manual image generation. No automated tests, paid generation or process
restart in this hotfix, explicitly requested by the user. Prior test evidence above
does not cover these new edits; prompt/output validation remains pending.

## 6. Produce Quote Reader Parity (2026-09-13)

Status: implemented; focused checks and web build passed. Scope: existing Cinematic client quote
schema and reference labels only. The server correctly returns the new
storyboard_composition purpose, but cinematicVideoQuoteSchema rejects it at
referenceSummary[0].purpose. The quote cannot reach Produce and Generate stays
disabled. Previous mocked workspace tests bypassed this response boundary.

Ordered tasks:
1. Add storyboard_composition to the explicit quote-purpose enum, preserving
   existing purposes and rejection of unknown values. Passed.
2. Label this reference as Storyboard, not Look Sheet. No layout, source mode,
   prompt, provider, pricing, reference ordering or saved media changes. Passed.
3. Verify a full quote through the real API client with intercepted JSON, plus
   the parsed quote's reference labels and enabled Generate state. Passed.
   Command: node scripts/test-cinematic-simple-production.mjs composition-quote
   (focused offline tests, no paid generation or live-data writes). This group
   is also part of the explicit photoreal-all/workspace-all/all aggregates.
   Browser deployment/reload and provider video output remain separate UAT.

Evidence: composition-quote passed 8 focused cases; 32 unrelated cases were
explicitly skipped. The actual quote API function and apiRequest/Zod boundary
read a mocked HTTP JSON response; no quote/provider call reached the backend.
Produce renders the parsed ordered references with Storyboard/Look labels and
enables Generate. Unknown purposes still fail. No live submission was tested.

Both web tsconfig.app.json and tsconfig.node.json passed tsc --noEmit
--incremental false. Standard build hit write permissions on .tsbuildinfo and
dist/index.html; after approved write escalation, Vite build --configLoader
runner --emptyOutDir false passed and updated web/dist without removing older
assets. This is the build served by port 6500, not only the Vite source on 6501.
No server restart, new source file, schema migration or runtime-data mutation.
git diff --check passed. Final HTTP/browser recheck could not finish because
port 6500 returned ECONNREFUSED; responsive screenshots were not taken for this
enum/label-only correction. Reopen Produce with a hard refresh for live UAT.

## 6. Produce Quote Reader Parity (2026-09-13)

Status: implementation in progress. Scope: existing Cinematic client quote
schema and reference labels only. The server correctly returns the new
storyboard_composition purpose, but cinematicVideoQuoteSchema rejects it at
referenceSummary[0].purpose. The quote cannot reach Produce and Generate stays
disabled. Previous mocked workspace tests bypassed this response boundary.

Ordered tasks:
1. Add storyboard_composition to the explicit quote-purpose enum, preserving
   existing purposes and rejection of unknown values. Pending.
2. Label this reference as Storyboard, not Look Sheet. No layout, source mode,
   prompt, provider, pricing, reference ordering or saved media changes. Pending.
3. Verify a full quote through the real API client with intercepted JSON, plus
   the parsed quote's reference labels and enabled Generate state. Pending.
   Command: node scripts/test-cinematic-simple-production.mjs composition-quote
   (focused offline tests, no paid generation or live-data writes). This group
   is also part of the explicit photoreal-all/workspace-all/all aggregates.
   Browser deployment/reload and provider video output remain separate UAT.
