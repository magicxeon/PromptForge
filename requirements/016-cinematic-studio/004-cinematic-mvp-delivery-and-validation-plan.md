# Cinematic Studio MVP Delivery And Validation Plan

**Primary role:** Product And Requirement Architect
**Reviewers:** Backend Platform Architect, QA And Release Engineer
**Skills:** `design-cinematic-experience`, `verify-release-regressions`

## 1. Delivery Principle

Build vertical slices through existing capability facades. Do not build all UI,
then all server code, then connect providers. Each checkpoint must preserve old
Studio, Scene Builder, Character, Fashion, Generation and Credit behavior.

## 2. Checkpoints

### C0 - Contract freeze

- Approve six-stage UX, operation names, IDs, state machines and owner map.
- Confirm video provider qualification inputs and output/storage constraints.
- Confirm commercial pricing/refund decisions.
- Add protected-behavior inventory for existing shared components.

Exit: schemas and open decisions are recorded; no runtime implementation.

### C1 - Private project and cast draft

- Cinematic route/shell, Setup, Cast/Wardrobe and actor-scoped autosave.
- Use the canonical Project service. If the commercial Project capability is
  not yet implemented, first deliver its minimum private-owner local adapter in
  the Project capability; Cinematic must not create a substitute project store.
- Cinematic repository interface and local adapter for film-specific state.
- Character/Profile Version and Asset authorization through owners.

Exit: restart and actor switch tests pass; no paid generation.

### C2 - Structured story and storyboard

- text planning operation, validation and Story Plan versions;
- scene/shot editor, continuity ledger and storyboard stills;
- quote/reservation for planning/stills through canonical owners.

Exit: one approved storyboard is reproducible from stored structure.

### C3 - Draft production

- qualified draft video operation and durable Generation Groups;
- result viewer, attempt history, selective regenerate and partial batch;
- settlement/reconciliation and terminal error behavior.

Exit: 3-6 shot film can be generated and one failed shot retried safely.

### C4 - Finish and export

- simple timeline, trim, transition, subtitle/music and final assembly;
- final quote, export Asset and download;
- support correlation and recovery evidence.

Exit: complete 20-60 second film survives restart and exports once.

### C5 - Series-lite and launch hardening

- Series Bible and episode linkage behind feature flag;
- retention, quotas, accessibility, responsive and performance validation;
- provider qualification and commercial launch gate.

## 3. Automated Test Suites

- contract/schema tests for every API boundary;
- lifecycle tests for project, plan, Shot, attempt and export;
- actor/permission tests for private projects and shared Characters;
- idempotency tests for planning, generation, settlement and export;
- stale quote and stale downstream dependency tests;
- partial batch, cancellation, restart and orphan reconciliation tests;
- shared component regressions for loader, queue, viewer, credit dialog and
  Character/outfit pickers;
- i18n key parity and route registry tests;
- repository adapter parity before database migration.

## 4. Manual Film Qualification

Use at least three films:

1. one Character, one wardrobe, daylight lifestyle;
2. two Characters, dialogue-like reaction sequence and wardrobe continuity;
3. one Character with a deliberate wardrobe/location change.

For each film record:

```text
Project and Job IDs
Provider/model per operation
Duration and aspect ratio
Character identity /5
Wardrobe continuity /5
Scene continuity /5
Motion/anatomy /5
Camera and performance /5
Audio/subtitle sync /5
Commercial polish /5
Unexpected identity/wardrobe/prop leakage
Credits quoted/captured/refunded
Result: pass / conditional pass / fail
```

No provider is promoted when identity or wardrobe is below 4/5, when reference
authority leaks, when multi-person anatomy fails materially, or when two of
three runs error.

## 5. UX Manual Matrix

- desktop 1440px and mobile 360px;
- default, Pearl and dark themes;
- EN and TH locales;
- mouse and keyboard only;
- owner, unauthorized actor and insufficient-Credit actor;
- empty, loading, saving, stale, partial, failed and completed states.

## 6. Performance Budgets To Baseline

Before tuning, capture:

- project summary/list p95 and payload size;
- stage load and autosave p95;
- story-plan application latency;
- queue wait, reference processing and provider duration separately;
- polling request rate per active project;
- storyboard/timeline render with 12 shots;
- retained browser memory and thumbnail payload.

Any cache requires owner, key, bound, TTL/terminal condition and invalidation.

## 7. Rollout And Rollback

- Ship behind `cinematicStudioEnabled` and operation-specific provider flags.
- Enable internal users, then limited creators, then launch cohort.
- Disable new submissions independently of read/review/export access.
- Rollback never deletes accepted Jobs, Assets or ledger entries.
- A provider flag can stop one operation while preserving completed projects.

## 8. Definition Of Done

- C0-C4 acceptance passes with automated and manual evidence.
- No Severity 1/2 privacy, financial, orphaned Job or cross-actor defect remains.
- Existing Studio/Playground/Fashion shared-component suites remain green.
- Support can diagnose any billed project operation from a safe reference.
- Open provider-quality limitations are visible and assigned to a follow-up.
