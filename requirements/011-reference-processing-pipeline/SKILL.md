---
name: implement-momelo-reference-processing
description: Implement or review Momelo's config-driven reference authority, preprocessing, attribute conflict resolution, provider adaptation and processing lineage across every generation surface.
---

# Momelo Reference Processing Skill

## Required Reading

1. `AGENTS.md`
2. `requirements/099-technical-dept/000-master.md`
3. `requirements/011-reference-processing-pipeline/000-master-reference-processing-pipeline.md`
4. `requirements/011-reference-processing-pipeline/001-config-driven-reference-authority-and-preprocessing.md`
5. current Asset, Generation, Template, Character, Provider and Credit modules

Current code and server ownership contracts outrank stale legacy paths.

## Core Guardrails

- Reference role is a bounded authority, not a generic image hint.
- Use one server authority plan for UI projection, prompt compilation and
  provider payload construction.
- Never trust client owner IDs, authorization flags, local paths or directives.
- Never duplicate Provider Registry capabilities in reference policy JSON.
- Never create another upload or generated-file store.
- Preserve estimate/dispatch parity after preprocessing and deduplication.
- Store policy/processor lineage without storing raw images or prompts.
- Configuration changes require a new policy version.
- Actual model training is outside the MVP unless a later requirement enables
  it explicitly.

## Review Priority

1. identity or private-reference leakage
2. role authority crossing into unrelated attributes
3. Template locked-field or baseline violation
4. estimate/reference-count mismatch
5. actor ownership bypass
6. different behavior across Single and Comparison
7. silent low-confidence inference
8. provider-specific duplication
9. confusing non-technical UX

## Completion Gate

- JSON policy and schema validate
- authority matrix has exhaustive tests
- client consumes public authority projection
- prompt compiler receives effective selections only
- provider plan uses canonical ordered roles
- Asset derivatives preserve ownership
- diagnostics omit sensitive content
- Studio, Playground, Comparison, Template and Fashion parity tests pass
