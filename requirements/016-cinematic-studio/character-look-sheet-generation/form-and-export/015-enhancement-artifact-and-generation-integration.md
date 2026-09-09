# Enhancement Artifact And Generation Integration

ID: ME-INTEGRATION. Status: implemented; isolated reuse/ownership/recovery verified. Parent: [011](011-momelo-enhancement-master.md).
Owner: Generation with Character Profiles, References and Credits public contracts.

## Single Entry Point

Extend GenerationApplicationService with estimate/execute/read/resolve enhancement
use cases. Thin routes live in existing generationRoutes.js. Reuse
PromptRefinementService for the provider call; no direct provider call from React,
Credit route or a second prompt compiler. Internal focused services are acceptable.
The inspected file has duplicate look-sheet-preview registrations: reconcile
that exact duplicate with route tests when touching this owner; no broad route cleanup.

Implemented APIs: POST `/api/generation/look-sheet-enhancement/quote`, POST
`/api/generation/look-sheet-enhancement/execute`, GET
`/api/generation/look-sheet-enhancement/:id`. The durable opaque quote ID is the
single-operation idempotency key; replaying it cannot purchase a second operation.
The image request carries `lookSheetEnhancementId`, not a client-authored final prompt.

Contracts:

| Operation | Contract |
|---|---|
| Estimate enhancement | POST complete Look Sheet inputs; authorize/normalize; return private server Credit quote; no AI call |
| Execute enhancement | POST same input, estimateId, idempotency key; reserve, execute once, validate, persist and settle |
| Read enhancement | GET actor-owned operation/artifact by opaque ID; bounded status and review projection; no redispatch |
| Generate sheet | Existing /api/generate with artifact ID when ON; server resolves authorized matching successful artifact |

No final client prompt is trusted to skip billing. OFF remains canonical deterministic
Look Sheet compilation. ON without a settled current artifact is rejected by the
server even if the UI is bypassed. Keep automatic generation-time Prompt Refine
disabled for this mode so a paid accepted artifact is not rewritten twice.

## Durable Artifact

Server-owned record: operation/artifact ID, actor ID, task kind/status, immutable
normalized form/defaults, approved Character/version and identity fingerprint,
reference authority fingerprint, sheet/realism recipe versions, effective prompt,
text provider/model, quote/rate/reservation references, usage and terminal evidence.
Financial references outlive prompt content according to owning retention policies.
Never expose another actor's artifact or include it automatically in a public post.

Implemented focused repository under
`server/repositories/generation/PromptEnhancementRepository.js`, using jsonFileStore
and private `server/data/generation/promptEnhancements.json` configured by
`DATA_FILES.promptEnhancements`. No image Queue Job is fabricated. Current JSON
storage supports one API writer, not multi-process financial transactions. Thirty-day
artifacts expire; later mutation purges expired private text while retaining
settlement evidence. The 5,000-record cap fails closed pending archival/DB work.

## Invalidation And Reuse

- Editing any normalized form field/default, identity/version, reference authority,
  sheet recipe, realism version or prompt-affecting constraint makes the artifact
  stale. Never delete already-paid evidence merely because it is stale.
- Bind effective aspect ratio/layout constraints. Image provider/model changes
  invalidate image quotes; reuse enhancement only if its prompt-authority contract
  remains compatible. No silent AI call on engine change.
- A changed text pricing/model configuration does not retroactively reprice an
  already successful artifact. New enhancement quotes use current active policy.
- Generate reauthorizes Character/reference access and resolves the artifact on
  the server. Revoked access or incompatible snapshot blocks reuse.
- Duplicate image-submit retries reuse the same artifact; an explicit new rewrite
  requires new consent/quote. Enhanced output remains reviewable across reload.
- A late completion for old input may be retained in its operation record but must
  not overwrite current form, active preview or another actor's screen.

## Client State And History

Controlled form has no API dependencies. Profiles' CharacterLookSheetExperience
orchestrates through typed Generation API hooks, Zod responses and actor query keys.
Use versioned actor-scoped drafts for original form, enhancement preference and
operation/artifact IDs. Do not persist Base64 or provider secrets in browser state.
Old draft v1 migrates without text loss; defaults enhancement OFF. Schema and byte
limits must change together with the 2,000-code-point appearance limit.

No feature-local polling/cache if Generation's status owner supports this kind.
If status polling is necessary, document source of truth, actor key, interval,
terminal stop, bounded entries, invalidation and unmount behavior before coding.
Private read endpoints use no-store and existing ownership middleware/contracts.

Image quote/accepted Job/History snapshot records artifact identity and effective
prompt fingerprint so generation and later inspection agree. Export reads the
original accepted name/age/notes, not the newest unsent draft. Branding remains
Download-only and does not touch trusted provider originals.

## Rollout

One dedicated server-owned capability for paid Look Sheet enhancement, combined
with Look Sheet exposure, provider availability and valid pricing. First visible
only in Playground Look Sheet; crafted requests from unsupported surfaces fail.
Shared visual form changes do not enable a paid Studio call. Existing Studio
Natural Realism remains unchanged. Disabling exposure stops new paid operations,
not status reads/reconciliation of already accepted ones. No automatic migration
of old best-effort Prompt Refine charges or global surface enablement.

Acceptance: stale/foreign/unsettled artifacts cannot generate; valid reuse performs
no extra AI call; actor switch/reload and old result Export remain correct; OFF,
ordinary Image/Studio/Scene/Template/Comparison/Video continue unchanged.
