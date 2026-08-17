---
name: build-admin-visual-attribute-studio
description: Design, implement, test, or review the Momelo Admin Visual Attribute Studio and canonical Attribute Catalog. Use when working on Attribute taxonomy, visual option AI generation, Admin attribute authoring, compatibility and Reference override rules, catalog publication, migration from JSON/manifests, or Attribute release validation across Face Creator, Character Sheet, and Scene Builder.
---

# Build Admin Visual Attribute Studio

## Read First

1. Repository `AGENTS.md`.
2. `requirements/099-technical-dept/000-master.md`.
3. Every applicable file in `requirements/098-admin-visual-attribute-studio/`, in
   sequence.
4. `008-current-state-reconciliation-and-updated-implementation-order.md` for
   the audited runtime baseline and protected behavior.
5. `requirements/003-implementation-visual-character-builder-plan/` for the
   current semantic and visual contracts.
6. Nearest Attribute loader, compiler, React model, visual registry and tests.

## Ownership Rules

- Attribute Catalog owns definitions, lifecycle, releases and compatibility.
- Generation owns provider dispatch and final prompt compilation.
- Assets owns uploaded/generated media and derivatives.
- Credits owns estimates, reservation, capture and refund.
- Reference Processing owns source authority and override policy.
- Audit owns records of material Admin changes.
- Admin routes and components must call these public capability contracts; they
  must not duplicate them.

## Implementation Workflow

1. Inventory current sources and consumers before adding a field.
2. Complete Slice 0 parity evidence before creating mutation routes or the full
   Admin editor.
3. Identify the stable category, field and option IDs.
4. Extend the canonical schema before UI or persistence.
5. Add server validation and repository behavior behind existing Admin policy.
6. Add API response schemas and actor-scoped Query keys.
7. Build UI with shared controls and exact customer-card preview.
8. Route AI asset work through Generation Groups and Assets.
9. Add compatibility and prompt fixtures for all affected modes.
10. Verify imported catalog parity before changing runtime authority.
11. Publish through an immutable release and test rollback.

## Authoring Review

Confirm:

- semantic meaning is specific and not duplicated
- labels are localized and understandable without prompt expertise
- prompt contribution is concise and provider adaptations preserve meaning
- visual sibling differences are legible at thumbnail size
- fallback works when the asset is missing
- enable/disable scope is explicit by mode and Character type
- dependency/exclusion graph is acyclic
- Face, Character and Outfit References apply the correct authority
- saved configurations remain readable
- safety rules are enforced server-side

## Test Requirements

- Unit-test schema, rule and prompt compilation changes.
- Integration-test application service, repository and release activation.
- Test permissions for Admin, Support and customer roles.
- Test generation idempotency and Credit behavior for visual assets.
- Test customer rendering in Face Creator, Character Sheet and Scene Builder.
- Run i18n validation for every new UI string.
- Use Playwright desktop/mobile screenshots for substantial Admin UI changes.
- Record manual visual review for every new visual family.

## Prohibited Shortcuts

- Do not write Attribute JSON directly from an HTTP route.
- Do not call an AI provider from React or Admin domain code.
- Do not add another option map beside the canonical catalog.
- Do not hard-delete a published semantic ID.
- Do not publish a Category when an included visual Attribute has missing
  required assets unless an explicit text fallback has passed review.
- Never model publication as an option-level action. Attributes are saved and
  qualified individually, then published atomically with their Category.
- Do not store Base64 images in catalog records or browser persistence.
- Do not bypass Reference, safety or Credit policy because the actor is Admin.

## Handoff

Report the capability behavior, schemas and releases changed, migration/parity
result, visual assets generated, validation and tests performed, manual QA still
required, rollback path and remaining source-of-truth risk.
