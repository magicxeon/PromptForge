---
name: implement-fashion-blueprint
description: Implement or review ModelPromptForge Fashion Blueprint for simple e-commerce clothing image generation, including final-result templates, reusable Characters, pose/environment variation, single/bulk outfit references, Simple/Advanced quality modes, quotes, credits, processing and results while reusing shared platform components.
---

# Implement Fashion Blueprint

## Read First

1. `AGENTS.md`
2. `requirements/099-technical-dept/000-master.md`
3. `000-master-fashion-blueprint-roadmap.md`
4. The numbered requirement owning the task
   - Model qualification or prompt-strategy work must read `009` and the
     matching provider skill under `skills/`.
   - UX/Review/production work must also read
     `010-fashion-blueprint-ux-review-and-production-results-experience.md`.
   - Correlation, provider diagnostics or credit recovery work must also read
     `010-platform-correlation-tracing-and-credit-recovery.md`.
5. Character Profile `006`
6. Template Core `010` and Reference Processing Pipeline `011`
7. Navigation/UI `008`, Community and commercial `013` requirements
8. Existing shared modules and tests

## Workflow

1. Map the requested behavior to existing components/services.
2. Extend shared owners only for genuinely reusable behavior.
3. Keep Fashion-specific orchestration under `fashion-blueprint`.
4. Build/validate a deterministic plan before requesting a quote.
5. Resolve every Product Item through the shared Reference Processing Pipeline.
6. Bind the exact processed reference count and plan fingerprint into estimate
   and run inputs.
7. Invalidate quote after any cost- or authority-affecting change.
8. Submit through canonical credit and generation services.
9. Group output by Product Item and shot operation.
10. Preserve actor scope, private references, Template lineage and Character
    attribution.
11. Add i18n keys and desktop/mobile state checks.
12. For billable execution, preserve one correlation ID across quote, run,
    operation, queue job and credit records without replacing their domain IDs.

## UX Rule

Keep the default path:

```text
Template -> Character -> Outfit -> Quality & Price -> Generate
```

Pose, environment, bulk and Advanced controls are progressive disclosure. Do
not turn Simple Mode into Studio.

Prefer one-action use of a valid Template model. Load the three-tab Character
picker only when the user asks for another model or one of their own.

## Guardrails

- Do not create a second Engine & Target Output component.
- Do not create a second prompt compiler, provider gateway, queue or ledger.
- Do not create a second Template version/use-session runtime.
- Do not create a Fashion-specific reference authority matrix or processor.
- Do not persist Base64 in plans/templates.
- Do not trust owner, price, credit or provider capability from client.
- Do not carry the white Character casting outfit as final clothing.
- Do not count failed jobs as Character usage.
- Do not hardcode tier pricing/routes in client.
- Implement the Fashion client in React under `web/` according to
  `requirements/009-migration-to-react/007-fashion-blueprint-react-first-implementation.md`;
  do not introduce new legacy globals or a duplicate Vanilla page.
- Do not implement Fashion as a new Studio mode. It owns `/create/fashion` and
  an actor-scoped Fashion state module.
- Keep AI model Comparison disabled in the Fashion MVP.
- Do not save Base64 in Fashion drafts, plans, quotes or runs.
- Do not use the Studio global credit estimate as a Fashion aggregate quote.
- Do not trust a client reference count, processing fingerprint, Template
  version, output recipe or Simple route.
- Do not enable reserved `outfit_detail` until Template, Reference Processing,
  provider and DTO contracts all support it.
- Do not create a Fashion-only queue, trace store or credit recovery path.
- Do not put prompts, image payloads, secrets or private reference URLs in
  trace/audit metadata.

## File Ownership

```text
web/src/features/fashion-blueprint/
web/src/components/generation/
server/domain/fashion-blueprint/
server/repositories/fashion-blueprint/
server/app/routes/fashionBlueprintRoutes.js
server/config/fashion-quality-tiers.json
```

## Validation Handoff

Follow repository validation rules in `AGENTS.md`. Report exact commands and
results for Fashion domain tests, React tests, typecheck, i18n, lint/build, plus
manual single-outfit, bulk, stale-quote, cross-user, reference-authority and
partial-failure scenarios.
