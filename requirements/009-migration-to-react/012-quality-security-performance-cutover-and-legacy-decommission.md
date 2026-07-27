# 012 Quality, Security, Performance, Cutover and Legacy Decommission

**Status:** Final release gate, applied incrementally to every phase  
**Depends on:** 001-011

## 1. Business Requirement

The React migration is successful only if it improves maintainability without
reducing security, correctness, accessibility or operational reliability. The
project must end with one frontend runtime.

## 2. Test Pyramid

### Existing server regression

Continue current Node tests for:

- providers;
- references;
- generation;
- credits;
- comparisons;
- Community;
- Character;
- templates;
- repositories;
- identity and ownership.

### React unit/component

Use Vitest + Testing Library for:

- pure selectors/mappers;
- component states and keyboard behavior;
- permission variants;
- forms and validation;
- query/mutation behavior through MSW;
- actor switch and persistence.

### E2E

Use Playwright for:

- route/deep-link/back/forward;
- Community discovery/detail/engagement;
- Creator/Character public and owner journeys;
- Fashion one/bulk workflow;
- Playground single/Comparison generation;
- Studio Headshot/Character Sheet;
- Scene Guided/Manual/template remix;
- History/Collection/Comparison;
- Admin role gate;
- locale and actor switching.

Provider-costly tests use deterministic mocks except explicitly approved smoke tests.

## 3. Contract Parity

For each migrated route:

- API fixtures validate React Zod schemas;
- legacy and React requests are compared for canonical fields;
- prompt/reference/credit snapshots are compared where applicable;
- stable error codes have UI handling;
- server tests remain green.

No parity test may compare private raw references in logs or snapshots.

## 4. Security Gate

- no secret in bundle/source map;
- no client-side authorization assumption;
- actor headers are attached centrally;
- owner-relative cache is actor-scoped;
- private queries are not persisted publicly;
- prompt/reference logs are sanitized;
- uploaded media validates type/size on server;
- external URLs are not blindly rendered or fetched;
- admin routes are server role-gated;
- public snapshots pass sanitization;
- dependency audit findings are triaged before release.

## 5. Performance Budgets

Set measured budgets after the first production build, then enforce:

- route-level lazy loading;
- no full app feature bundle on Community entry;
- stable image dimensions;
- responsive image/thumbnail usage;
- bounded Query cache;
- no duplicate requests per card;
- virtualize only lists that measurably need it;
- avoid unnecessary global rerenders;
- monitor bundle growth by feature chunk.

Initial target guidance:

```text
Community initial JS: keep under an approved compressed budget
route chunk: no unrelated editor/provider code
layout shift: primary surfaces dimensionally stable
interaction: no long main-thread task from rendering large option lists
```

Record real baselines rather than claiming arbitrary scores.

## 6. Accessibility and Visual QA

Every route gate includes:

- keyboard-only workflow;
- focus order/restoration;
- accessible-name audit;
- contrast and non-color state;
- reduced motion;
- 390px-class mobile and desktop viewport;
- Thai/English/Japanese longest-label checks;
- empty/loading/error/permission screenshots;
- media failure and slow-loading behavior.

## 7. Observability

Add a frontend telemetry adapter, initially console/local in development and
replaceable for production:

```text
route error
API error code/status
generation lifecycle transition
unexpected contract parse failure
feature flag/route runtime
build SHA
```

Never emit full prompts, Base64, private image URLs, secrets or personal data.
React error boundaries must show a recovery path and correlation identifier
when available.

## 8. Cutover Checklist Per Route

1. Inventory/parity rows complete.
2. React route feature complete.
3. Unit/component/E2E pass.
4. Existing server tests pass.
5. desktop/mobile visual review approved.
6. actor/permission/locale states approved.
7. route ownership switched to React.
8. observation period monitored.
9. rollback no longer required.
10. legacy route modules/styles/tests removed.

Do not mark a route complete at step 7.

## 9. Final Legacy Decommission

After every route is React-owned:

- remove legacy browser route serving;
- remove `client/index.html` script graph;
- remove `client/app.js`, feature scripts and compatibility globals;
- remove legacy-only `client/style.css`;
- remove obsolete vendored browser libraries;
- migrate retained source-controlled assets to final documented owner;
- migrate generated outputs to server/object-storage ownership;
- remove legacy persistence migration after its support window;
- update AGENTS, architecture master, README, scripts and deployment docs;
- archive parity inventory as release evidence.

Deletion must be based on import/route/runtime evidence. Do not delete visual
assets or server contracts simply because the legacy consumer disappeared.

## 10. Production Alignment

Final frontend:

```text
Firebase Hosting static React build
-> /api rewrites to Cloud Run API
-> authorized media through API/storage contract
```

The React migration does not block local JSON MVP operation, but production
readiness still depends on Commercial requirements for real auth, PostgreSQL,
Cloud Storage, durable jobs and payments.

## 11. Final Exit Criteria

- One frontend runtime remains.
- Every parity workflow is green.
- No `window.ModelPromptForge*` compatibility API is required.
- No actor/private data cache leak exists.
- Generation, credits and references pass canonical tests.
- Frontend build/deployment is documented and reproducible.
- Legacy files are removed only after observation and rollback closure.

