---
name: implement-fashion-blueprint
description: Implement or review ModelPromptForge Fashion Blueprint for simple e-commerce clothing image generation, including final-result templates, reusable Characters, pose/environment variation, single/bulk outfit references, Simple/Advanced quality modes, quotes, credits, processing and results while reusing shared platform components.
---

# Implement Fashion Blueprint

## Read First

1. `AGENTS.md`
2. `requirements/009-technical-dept/000-master.md`
3. `000-master-fashion-blueprint-roadmap.md`
4. The numbered requirement owning the task
5. Character Profile `006`
6. Relevant Scene Builder, Community and commercial `008` requirements
7. Existing shared modules and tests

## Workflow

1. Map the requested behavior to existing components/services.
2. Extend shared owners only for genuinely reusable behavior.
3. Keep Fashion-specific orchestration under `fashion-blueprint`.
4. Build/validate a deterministic plan before requesting a quote.
5. Invalidate quote after any cost-affecting change.
6. Submit through canonical credit and generation services.
7. Group output by Product Item and shot operation.
8. Preserve actor scope, private references and Character attribution.
9. Add i18n keys and desktop/mobile state checks.

## UX Rule

Keep the default path:

```text
Template -> Character -> Outfit -> Quality & Price -> Generate
```

Pose, environment, bulk and Advanced controls are progressive disclosure. Do
not turn Simple Mode into Studio.

## Guardrails

- Do not create a second Engine & Target Output component.
- Do not create a second prompt compiler, provider gateway, queue or ledger.
- Do not persist Base64 in plans/templates.
- Do not trust owner, price, credit or provider capability from client.
- Do not carry the white Character casting outfit as final clothing.
- Do not count failed jobs as Character usage.
- Do not hardcode tier pricing/routes in client.
- Do not introduce React/Vite or new global state.

## File Ownership

```text
client/fashion-blueprint/
server/domain/fashion-blueprint/
server/repositories/fashion-blueprint/
server/app/routes/fashionBlueprintRoutes.js
server/config/fashion-quality-tiers.json
```

## Validation Handoff

Do not run Node commands. Give the user exact syntax/test commands plus manual
single-outfit, bulk, stale-quote, cross-user and partial-failure scenarios.
