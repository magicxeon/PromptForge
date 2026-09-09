# Momelo Enhancement Master

ID: CLSFE-ME. Date: 2026-09-08.
Status: implemented with isolated workflow and responsive fixture verification.
Live paid AI/output-quality UAT remains open; no paid calls were made in this delivery.
User subsequently authorized rate-derived whole-Credit service pricing (014).

## Confirmed Outcome

Make Character appearance clearly recognizable as the main Character Prompt in
Playground Image > Character Look Sheet. Add optional **Momelo Enhancement**:
use Studio Natural Realism principles AND call the configured AI Prompt Refine
provider to rewrite the complete form into a coherent image prompt. Charge the
server-quoted fixed service fee derived from the configured AI rate and existing
FX/buffer/margin, rounded to one Credit. Do not invent an uncosted 1-2 Credit fee.
The user reviews the enhanced prompt before a separately quoted image generation.

This is prompt preparation, not enhancement of already-generated pixels.
Keep the one-image/five-view strategy, original-media preservation and Download-only
branding from 001-010. No changes to Seedance, Video references or trusted URLs.

## Requirement Index

| File | Responsibility | State |
|---|---|---|
| [012](012-character-prompt-form-and-enhancement-ux.md) | Shared form hierarchy, prompt field, enhancement controls/states | Implemented; fixture UX verified |
| [013](013-natural-realism-and-prompt-authority.md) | Complete form input, realism recipe, AI rewrite and identity validation | Implemented guards; live semantic/visual UAT pending |
| [014](014-enhancement-credit-and-recovery-contract.md) | Configured price, consent, durable idempotency, settlement/recovery | Implemented; isolated wallet/recovery verified |
| [015](015-enhancement-artifact-and-generation-integration.md) | Private artifact, stale detection, reuse at Generate, rollout boundaries | Implemented; existing JSON single-writer limit |
| [016](016-momelo-enhancement-implementation-plan.md) | Ordered small tasks, tests, evidence and pending register | Evidence and residual gates recorded |

## Inspected Baseline

- `web/src/components/profiles/CharacterLookSheetForm.tsx`: name/age and four
  small textareas; appearance is three rows and capped at 600 characters.
- `CharacterLookSheetExperience.tsx` under Profiles is shared by Playground and
  Studio; Look Sheet disables automatic Prompt Refine and has one read-only preview.
- `LookSheetDefinitionService.js` normalizes all fields, supplies defaults and
  compiles one five-view sheet; `document-sheet.v1.json` owns composition.
- `studioNaturalRealism.js` currently gates to Studio headshot/character-sheet/scene.
- `PromptRefinementService.js` calls the configured OpenAITextProvider, protects
  an aspect-ratio directive and reattaches Character identity; this alone does not
  validate preservation of every Look Sheet form field.
- Existing refinement is best-effort during image submission, before the image
  reservation. It is NOT a prepaid standalone text operation and must not be
  enabled unchanged for this paid preview workflow.
- Credits has image/video estimate and reservation/capture/refund owners. Finance
  inventory can show AI-text models with missing rates; a cost-planning draft is
  not an active customer Credit price. Existing text requirement explicitly
  excluded customer billing. Configuration-to-operation mapping remains a gate.

## Scope And Preservation

First exposure: Playground Look Sheet only. Shared form visual improvements may
also appear in Studio's document-sheet adapter; Studio keeps its current automatic
Natural Realism and no new paid toggle unless separately enabled and tested.
Ordinary Playground images, original Studio three-view sheets, Scene, Comparison,
Template use, post publication and export are protected sibling workflows.
Do not globally change existing free/best-effort Prompt Refine into paid mode.
Enhancement defaults OFF for existing/new drafts until explicitly selected.

## Ownership And Review

Primary: Product Requirement Architect. Mandatory sequential reviews: Backend,
Commercial, UX and QA. More than three roles is justified by new billable AI
preparation, private durable artifacts and a shared form. No independent review
or runtime verification is claimed by this documentation pass.
Skills for implementation: review-product-ux, review-generative-media-pipeline,
implement-generation-workflow, review-commercial-integrity, verify-release-regressions.

GenerationApplicationService is the public use-case owner. Existing
PromptRefinementService/provider performs AI text calls; Character Profiles owns
definition/identity; Credits owns ALL quote/reserve/capture/refund. Finance consumes
safe cost/usage evidence and never computes a second customer charge. React shared
form is controlled and has no provider, wallet or repository access.

## Sources

- [Character prompt guideline](../../../099-technical-dept/Technical-Documents/momelo-character-generation-prompt-guideline.md).
- [UI design system](../../../Knowledge/ui-design-system-and-visual-language.md).
- [Existing text refinement](../../../020-generation-providers/text/001-luna-ai-prompt-refinement-provider.md).
- [Finance runtime scope](../../../019-implementation-commercial-feature-plan/admin-finance/008-execution-tasks-and-flow-review.md).
- [Capability map](../../../099-technical-dept/000-master.md).

These numbered files supersede 002/003 only for this optional paid Look Sheet
preparation. Historical implementation claims in earlier files are not evidence
that Momelo Enhancement or AI-text billing is already implemented.
