# Scene-011 Current React Readiness Audit

**Status:** Deterministic foundation verified; live image Generation and full
manual release flow pending
**Date:** 2026-09-05
**Primary role:** QA And Release Engineer
**Reviewer:** Generative Media Pipeline review applied sequentially by the same
agent; no independent review claimed

## 1. Purpose

Reconcile the 2026-07 Scene Builder plan with the current React/server
implementation before adding more functionality. This audit sends no provider
request, spends no Credits and does not treat deterministic tests as visual
provider qualification.

## 2. Canonical Owners Found

```text
web/src/features/scene-builder/routes/SceneBuilderRoute.tsx
web/src/features/scene-builder/components/
web/src/features/scene-builder/api/sceneTemplateApi.ts
web/src/features/scene-builder/schemas/sceneTemplateSchemas.ts
server/domain/scene-templates/
server/repositories/scene-templates/SceneTemplateSnapshotRepository.js
server/domain/templates/TemplateCoreService.js
```

The old `client/scene-builder/` modules remain compatibility/test evidence and
must not receive new customer behavior.

## 3. Verified Behavior

- Stable `/create/studio/scene` route and Studio navigation entry.
- Guided and Manual authoring state, including guarded Guided-to-Manual prompt
  copy.
- Versioned Scene Template snapshots and schema parsing.
- Replaceable scalar and reference variables with required-slot validation.
- History image assignment to Face, Character, Style and Outfit slots.
- Owner/reusable/private reference policy and public Base64 stripping.
- Legacy normal/story history normalization.
- Shared Template publication/hydration and prompt-visibility enforcement.
- Provider/model availability resolution through the shared Generation
  experience rather than Scene Builder-owned provider tables.
- Actor-scoped draft and handoff persistence.

## 4. Evidence

- 40/40 Node tests passed across snapshot serialization, hydration, variables,
  reference privacy, migration, History picker, repository and Template Core.
- 14/14 focused React tests passed for schema, reference requirements,
  Character presentation, pose recipes and Shared Template presentation.
- Actual Scene Builder route passed 18 browser combinations: Thai/English,
  390/820/1440 and default/fashion/creative. No page error or horizontal
  overflow was detected and initial keyboard focus was reachable.

## 5. Remaining Gates

- Execute one creator-authorized Guided generation and one Manual generation,
  validating quote, submit, terminal result, History snapshot and Credits.
- Exercise Character Sheet -> Scene Builder handoff and Use Template replacement
  in the browser with owned media, without exposing private references.
- Reconcile child requirements 001-010 from `Proposed` to their actual scoped
  implementation status rather than bulk-marking the package complete.
- Decide whether official reusable templates are still a release requirement;
  this audit does not invent or publish them.

## 6. Decision

**Conditional pass for the deterministic Scene Builder foundation.** There is
no justification to rebuild the feature from the old file plan. New work must
extend the canonical React/server owners above. The customer Generation path
is not marked fully released until the live gates in section 5 are recorded.
