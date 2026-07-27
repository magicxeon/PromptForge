---
name: implement-character-profile
description: Implement or review ModelPromptForge Character Profile creation, standardized casting export, public sharing, profile pages, usage analytics, and Fashion/Scene handoff while reusing existing Character Sheet, Community, generation, credit, ownership, and i18n contracts.
---

# Implement Character Profile

## Read First

1. `AGENTS.md`
2. `requirements/009-technical-dept/000-master.md`
3. `000-master-character-profile-roadmap.md`
4. The numbered requirement owning the task
5. Referenced Character Sheet, Scene Builder and Community requirements
6. Nearest implementation modules and tests

## Workflow

1. Inventory existing behavior before adding files.
2. Classify each need as reuse, extend or new.
3. Keep Character Profile canonical data outside Community; Community is a
   sanitized public projection.
4. Use normal generation, reference capability and credit services for casting
   export.
5. Enforce actor ownership on the server.
6. Keep public handoffs asset-ID based and Base64-free.
7. Record usage only after successful generation with an idempotency key.
8. Keep Community Character discovery, reuse badges and profile edit state
   consistent with server policy.
9. Snapshot editable personality metadata into each new handoff; never rewrite
   historical jobs.
10. Add i18n keys for every visible string.
11. Update requirement implementation notes and architecture paths if ownership
   changes.

## File Ownership

```text
client/character-profiles/                 Character Profile UI/state/API
server/domain/character-profiles/          lifecycle, export, sharing, usage
server/repositories/character-profiles/    persistence contracts/adapters
server/app/routes/characterProfileRoutes.js
```

Extend existing modules for Community projection, generation, credits,
references and cross-mode handoff. Do not copy them.

## Guardrails

- Never publish original private face/outfit references.
- Never make the white casting outfit the final Fashion garment.
- Never call providers or mutate credits from Character modules.
- Never trust owner IDs from request body/query.
- Never count selection/click as successful Character usage.
- Never make canonical versions mutable after downstream use.
- Do not add React/Vite or a second client state system.

## Validation Handoff

Do not run Node commands. Report exact `node --check` and `node --test` commands
for the user, plus manual two-actor privacy and handoff tests.
