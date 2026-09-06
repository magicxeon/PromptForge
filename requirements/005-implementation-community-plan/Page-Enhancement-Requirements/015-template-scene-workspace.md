# Template Scene Workspace And Character Selection

Status: Implemented; focused verification passed. Live-data smoke test pending.
Primary: Product Requirement Architect. Reviewers: UX and QA/privacy.
Owners: Scene Builder composition, Profiles selection/handoff, shared UI.
Skills: review-product-ux, implement-generation-workflow (input/reference
boundary), verify-release-regressions. No Credit/Queue/provider/compiler changes.

## Workflow And Scope

Follow-up 016-018 restrict newly created and owner-adopted Template versions to
required outfit front, optional Character and optional outfit back. The broader
schema-driven controls below remain only for legacy versions/sessions; they are
not selectable through the new Create/Edit policy. No bulk migration occurs.

1. Use Template enters the existing `/create/studio/scene`. Imported snapshot
   or use session selects Template presentation inside GenerationExperience.
   Normal Scene, Character, Fashion and Cinematic remain unchanged.
2. Show Template name, original public image with enlargement and Detail link.
   Resolve metadata through existing Community reads. Loading/error/missing
   image is local, never substitute another image. Preview is display-only,
   never appended to Generation references.
3. Hide Guided/Manual switches, pose recipes, Randomize/Reset/Export and template
   browsing while using a Template. Display only unlocked publicInputSchema
   fields (legacy replaceableVariables fallback). Camera/pose or manual prompt
   are editable only when expressly exposed. Keep existing provider/settings,
   reference uploads, readiness, estimates, Generate, Queue and result preview.
   Template-only layout places configuration first and the existing result/Queue
   below it, with Template-specific headings. Normal Studio retains its order.
   Extend StudioGenerationWorkspace with optional presentation props, not a fork.
4. Confirm exit; cancel preserves work. Pause normal Scene draft persistence
   during Template use and restore the normal draft on exit. Changing a
   reference invalidates its previous selected-character label/context.
5. Shared controlled CharacterPickerDialog receives items/state/callbacks only.
   Profiles owns paginated Mine/Community/search data. Scene applies the existing
   authorized requestCharacterHandoff result, not a thumbnail URL.
6. Pin selected character above results, followed by recently confirmed choices.
   Search before server pagination with query-scoped cursors, debounce 250ms,
   page size 24. Never download all characters or search only one loaded page.
7. Template character picker requires an editable character_reference slot and
   Scene-compatible reusable identity. Fixed-outfit characters are unavailable
   in this release: no silent wardrobe override. Face-only templates retain
   existing face uploads; do not convert a character pack into a face slot.
8. Confirm selection before application. Failed/denied handoff keeps modal open
   with retryable error. Actor/template changes invalidate late responses.
   No client-derived authorization, public visibility or paid generation.

## Reuse, State And Boundaries

- Reuse Button, ConfirmDialog, Radix Dialog, authenticated images, template
  serializer, GuidedAttributeForm and existing GenerationExperience.
- Shared picker: web/src/components/profiles. Data controller: Profiles feature.
  Optional `q` filter extends existing Character repository lists, not a new API.
  Existing calls without q retain behavior and cursor compatibility.
- Recent choices: actorScopedStorage feature `character-picker-recents`, v1,
  max 8 IDs only. No names, URLs, thumbnails or Base64. Re-resolve through
  authorized Profile reads; revoked/missing entries omitted. Recent is not a
  favorite or a new personal-storage retention contract.
- Queries actor/search/scope/cursor scoped, only enabled while open; staleTime
  30s, default GC, one bounded page, no polling or durable media cache.
- Pending: favorites/personal storage/outfit library, fixed-outfit replacement
  policy, face-only Character conversion, migrating Cinematic/Fashion pickers.

## Acceptance And Rollback

Focused tests: Template/normal visibility, exposed/locked fields, preview absent
from replacements, confirmed/cancelled exit, normal draft preservation, session
retention, handoff authority, slot/wardrobe guards, recents, actor isolation,
late responses, search and cursor isolation. Narrow scripts with optional grouped
runner, not full-system tests. Build/i18n, EN/TH and 390/820/1440 in all themes;
modal keyboard/focus/escape, scrolling, image loading and overflow checks.
No paid calls or live mutations; report live gaps. Rollback presentation and
controller together; no runtime data migration. Requirement 014 retains Detail.
Execution: implementation-plan/020-template-scene-workspace.md.

## Verification Record (2026-09-06)

- 48 focused tests passed: repository/sharing 16, Template/picker UI 13,
  existing Studio/reference compatibility 19. Build and i18n validation passed.
- Playwright fixture verification passed EN/TH at 390, 820 and 1440 pixels in
  all three themes (18 combinations). Source image enlargement, modal selection,
  Escape, viewport bounds and preview/reference separation were checked.
- Independent narrow QA passed after correcting same-session rehydration,
  cross-Template reference leakage and explicit Character navigation handoff.
- No live generation, Credit mutation or runtime JSON migration was performed.
  Local backend was unavailable; actual-account handoff/generation remains a
  live smoke-test gap, not a claim of provider output qualification.
- Personal storage/favorites, fixed-outfit and face-only Character conversion
  remain pending as scoped above. See plan 020 for commands and evidence.
