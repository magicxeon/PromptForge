# 005 - Shot Production And Final

Status: planned. Owner: Cinematic orchestration; dependencies: 002-004.
UX: [006](006-ux-ui-workspaces-and-interactions.md). Verification: [008](008-verification-migration-and-cleanup.md).
Single authoring mode and Shot document: [009](009-single-mode-writer-shot-authoring.md).
Screen replacement boundary: [010](010-complete-authoring-screen-redesign.md).

## 1. One Shot, One Work Item

Production lists Scenes within the selected Chapter. Each Scene has shared
environment and ordered Shot rows. Each Shot opens a writer with optional First
Frame and Video Render entry points. Existing Engine, Render, Take and Queue
surfaces remain intact under 010. One row produces one clip, with multiple Takes.
Add/reorder Shots and inline editing remain available; no forced trip back to Story Plan.

Save direction uses the single versioned `shotDocument` command defined by 009.
There is no Advanced authoring path. Preserve images/Takes until explicit replacement
or existing authorized deletion. Distinguish previewed Take from the Take selected/
approved for final assembly.

## 2. Prepare Shot

On save or authoritative input change, parse the Shot document and derive the
following using existing rules:

1. Start/action/end, continuity entry, gaze, hand/prop contacts and timed direction.
2. Visible Cast, explicit Looks, optional Expressions, Environment and Props.
3. Selected reference mode, actual provider capability and render style.
4. First Frame prompt if requested; video packet with exact reference roles.
5. Dialogue estimate, artistic warnings, hard blockers and final prompt budget.

Preparation is deterministic and non-billable. The parsed execution model is a
versioned projection, never a second editable Shot truth. Missing creative content
can be proposed through explicit Enhance/Generate Direction as a complete document
proposal using existing text operations.
Opening/closing a Shot must not invoke AI, spend Credits, create media or approve it.
Persist authored inputs; preparation is a derived versioned projection.

Per the 2026-09-25 update in 009 section 13, expose a separate creator-readable
Video Prompt projection with Copy and freshness status. Resolve the Scene Cast,
per-line speakers, shared voice baseline and local performance through the same
preparation owner. First Frame uses the visible opening and selected Looks; video
also uses the timed exchange/reactions. A readable prompt preview is not the raw
provider packet and does not replace the final quote/submission contract.

Reuse prompt budget preflight before production review and the final provider guard
after references are resolved. Safe compaction removes duplicated identity/style/
environment prose while preserving dialogue, time order, reference roles, physical
contacts and end state. Never chop the prompt by character count. If safe compaction
cannot fit, offer an explicit semantic optimization preview or Shot split. A billed
LLM rewrite is not an invisible automatic fallback.

## 3. First Frame And Reference Mode

User choices:

- Generate/select an image with Character Looks and optional Environment/Props.
- Reuse eligible previous selected/approved Take's last frame via existing Assets.
- Use a generated/browsed compatible image.
- Skip First Frame and use Look-only video when supported; text-only for no-person
  Shots when supported.

Default First Frame recommendation is not a lock. OFF retains the selected image
but excludes it from the submitted references and displays the Look-only icon.
Previous-last-frame is disabled if no eligible previous video exists, with a concise
reason and link to that Shot. Extraction is deterministic; no image-generation fee.

Expose natural faces, faceless previs and white-previs options from existing policies.
The optional post-processing Faceless API creates an immutable derivative; failure
keeps the original and offers existing generated treatments. No provider change or
automatic paid regeneration follows failure.

Distinguish the product's opening composition image from provider `first_frame`:
Seedance composition may use `reference_image` with Looks. Never toggle the existing
`SEEDANCE_FIRST_FRAME_ENABLED` transport gate simply because UI says First Frame.
Literal first-frame transport and multi-reference mode must match catalog/adapter.

## 4. Video, Performance And Audio

The one Shot writing surface accepts manual intervals, e.g. 0-1s reach, 1-3s effort,
3-4s reaction. Camera, performance, dialogue and audio remain readable sections in
that same document; they are not separate attribute editors.
Gaps may represent holds; overlapping independent actors/audio are legitimate.
Reject impossible numeric bounds or contradictory actions on the same actor/prop;
do not mechanically force every track into one non-overlapping sequence.

Prompt starts with reference-role assignment for the selected mode, not always
"Animate the supplied first frame". For previs it requests fully photorealistic
live action, own-Look faces from frame one and no drawing-to-human transition.
Preserve spatial layout from composition, not white faces or construction marks.
For natural-image mode preserve faces according to the designated identity authority.

Audio defaults ON for new video settings when supported, preserving explicit OFF.
Multiple dialogue lines retain exact wording, speaker, timing, delivery and reaction.
Period profile defaults to diegetic rain/traffic/etc., no music. Profiles and explicit
Shot overrides control this, rather than universal silence or music prohibition.

Mask lead-in may be roughly 0.5s according to user observation, but is not guaranteed.
Retain existing configurable usable-range/lead-in support and distinguish authored
usable duration from requested provider duration. Never silently request an
unsupported length or charge for extra duration not present in the estimate. If the
provider cannot add headroom, show the resulting shorter usable range; review after
generation. Removing the lead-in is optional, not a requirement to accept the clip.

## 5. Takes, Edits And Recovery

| Event | Expected result |
|---|---|
| Select another Shot/Take | Central preview and controls follow its ID; stop old audio/playback; no selection by array position |
| Generate another Take | Preserve all prior attempts; new task tied to submitted Shot/version |
| Change duration/direction | Save then re-quote current input; no unnecessary new still approval when composition unchanged |
| Preview older completed Take | Play it even when not currently eligible for approval; show status/reason |
| Approve Take | Reuse existing eligibility, immutable receipt and authorized duration-only override rules |
| Reload during work | Reconcile existing task; no repeat submission, bounded polling/recovery |
| Timeout/interruption | Preserve last output; stop endless spinner at recovery cutoff; explicit retry/recheck |
| Provider rejects reference | Keep attachments, source, model and failed attempt; show actionable error |

Header status reuses Job Center and terminal-state ownership. No Shot-specific
global poller. Requote after policy/provider/reference changes; stale quotes never
dispatch. Estimate, reservation, capture/refund and idempotency remain unchanged.

Continuity advances from the explicitly accepted Take. Prepare next-shot hints
from observed end state and extracted last frame; observations are manual or an
explicit supported analysis, never fabricated certainty from a completed status.
Applying downstream changes requires the user; do not overwrite planned action.

## 6. Final Workspace

Default scope is the selected Chapter: ordered selected/approved Takes, missing
clips, usable timing, rough preview, bulk clip download and current export.
Season/Project scope can list Chapter readiness without loading all media.

Bundle defaults to selected Takes, not every attempt. Optional all-Takes export is
explicit. Manifest includes root/Chapter/Scene/Shot/Take IDs and usable ranges;
original downloads keep original bytes. Missing clips allow a clearly labelled
partial bundle when current export contracts support it, never a misleading full film.

Show only existing, available post-processing operations. Upscale/assembly follows
its owning implemented contract and estimate. Do not create an unimplemented
button or claim the planned post-processing suite is ready. Billing needs the
mandatory Backend/Commercial/QA gates if its behavior changes during implementation.

## 7. Acceptance

- V01: Image, video prompt, generation and Take selection are reachable for the same
  Shot through writer/Render context navigation; editing writes shared data and
  retains historical media. Protected Render presentation remains intact.
- V02: With First Frame OFF, valid Look-only generation has no still-approval gate,
  no hidden composition attachment and correct mode-specific prompt.
- V03: Natural/faceless/white source roles, last-frame availability and optional
  processing failure preserve sources and never silently retry paid generation.
- V04: Exact dialogue/action sequence survives safe optimization; hard prompt guard
  runs against actual submitted references and provider rules.
- V05: Duration edit permits re-quote/generate when valid; Take switching updates
  preview; existing approval restrictions show specific reasons and override path.
- V06: Re-entry/recovery produces no duplicate task/charge or permanent loading;
  shared header status matches real task state.
- V07: Chapter bundle/timeline uses selected Takes with correct order, lineage and
  usable range; unsupported post-processing actions are not exposed.
