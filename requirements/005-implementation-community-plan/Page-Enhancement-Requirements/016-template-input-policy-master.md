# Template Character And Outfit Controls

Status: Implemented; focused verification passed. Live-data smoke test pending.
Primary: Product Requirement Architect. Reviews: UX, QA with backend/privacy
and unchanged-credit checks applied sequentially. Skills: review-product-ux,
review-generative-media-pipeline, implement-generation-workflow (input parity),
verify-release-regressions. No pricing or settlement rule changes.

## Accepted Product Contract

Apply the same controls at initial Share Template and owner Edit Share Template.
Outfit front is always exposed and required. Outfit back is optional when the
source supports it. Character is optional when exposed by the owner and supported
by the source. Neither Character nor outfit back can be made required.
No separate face input, facial/expression editing, pose, gaze, scene, atmosphere,
style, lighting, camera, manual prompt or additional direction can be exposed.
Locked means retained in the source execution snapshot, not deleted.
Selecting a Character uses its approved whole identity; no separate facial edit.
Without a replacement Character, preserve the existing authorized Template
baseline behavior; never publish private face/reference assets or expand rights.

Owner controls: required outfit-front indicator, optional Character toggle and
optional outfit-back toggle. New shares default supported optional controls on;
Edit initializes from the published schema and explicitly lists legacy controls
that will be removed on save. No changes before owner saves.

## Execution Order

1. Requirement 017: canonical policy, owner read/update, immutable input version.
2. Requirement 018: shared Create/Edit UI and downstream schema compatibility.
3. Plan 021: focused domain, UI, compatibility and responsive verification.

No bulk migration or edits to existing runtime JSON. Existing versions and
started use sessions retain their inputs and credit snapshots. Saving changed
inputs creates a new version with identical execution snapshot and preview.
An unchanged source may reuse its existing approved pose preparation through
verified same-template source linkage; no automatic AI/paid preparation.
Source lacking outfit-front capability remains image-shareable but cannot adopt
this Template policy. Do not fabricate source fields or silently regenerate.

Out of scope: Character rights expansion, facial editing, favorites/storage,
provider/model changes, image regeneration, source prompt optimization, price or
earnings edits, normal Studio/Fashion controls and unrelated page design.

Acceptance details and residual risks are owned by 017/018 and plan 021.

Verification (2026-09-06): 42 focused tests passed, production web build and
localization validation passed. Create/Edit fixture layouts passed 36 cases
across EN/TH, three themes and 390/820/1440 widths. No live publication, paid
generation or runtime-data migration was performed. Restart the backend to load
server changes; an existing Template adopts this policy only after owner save.
