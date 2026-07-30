---
name: implement-momelo-template-core
description: Implement or review the Momelo Template Core, including versioned authoring, secure hidden-prompt execution, typed replacement inputs, Community discovery, credit pricing, remix lineage and Fashion Studio reuse.
---

# Momelo Template Core Skill

## Required Reading

1. `AGENTS.md`
2. `requirements/099-technical-dept/000-master.md`
3. `requirements/10-implement-template-core/000-master-template-core-roadmap.md`
4. the numbered requirement owning the task
5. `requirements/Knowledge/ui-design-system-and-visual-language.md`
6. current Template, Scene Builder, Community, Generation, Credit and Fashion code

Current canonical code and tests outrank stale legacy paths.

## Functional Guardrails

- Template is a Definition plus immutable Versions, not a Community post.
- Public clients receive public input schema, never a hidden execution prompt.
- Server resolves the pinned version and rejects undeclared replacements.
- Use existing generation, reference, credit and Community pipelines.
- Estimate and generation must use the same Template version and pricing.
- Store actor/version/use-session lineage on every Template result.
- Published Versions are immutable; edits create a new Version.
- Do not persist Base64, blob URLs or private source paths.
- Future kinds use discriminated contracts; do not prematurely implement Video.

## UX/UI Guardrails

- Design for a user who does not know prompts, providers or camera vocabulary.
- Lead with the final preview image and a clear `Use Template` action.
- Show required replacements first; collapse optional and advanced controls.
- Use visual Character, Outfit and Environment inputs where possible.
- Show one combined total with a readable AI/Template breakdown.
- Never expose hidden prompt text through preview, copy, errors or debug UI.
- Reuse Template card, preview, replacement form and pricing components across
  Community, Profiles, Scene Builder and Fashion Studio.
- Use professional media presentations; do not crop the important subject.
- Provide loading, empty, blocked, expired, insufficient-credit and incompatible
  provider states.
- Validate desktop/mobile, keyboard, reduced motion and enabled locales.

## Canonical File Ownership

```text
server/domain/templates/
server/repositories/templates/
server/data/templates/
server/app/routes/templateRoutes.js
web/src/features/templates/
web/src/components/templates/
test/template*.test.js
web/src/**/*.test.tsx
```

## Review Priority

1. hidden prompt/reference leak
2. ownership or entitlement bypass
3. credit mismatch or duplicate charge
4. wrong version/lineage
5. failed required/locked replacement enforcement
6. duplicated generation or Community behavior
7. inaccessible or confusing non-technical workflow
8. visual polish

## Completion Checklist

- requirements and architecture map updated
- repository and runtime paths declared
- server DTOs validated
- React boundaries use Zod
- actor-scoped query/persistence
- Template fee appears in locked estimate
- legacy snapshot compatibility covered
- functional, security and visual tests pass

