# ModelPromptForge Agent Instructions

These rules apply to every task in this repository. Preserve them when handing
work to another agent.

## 0. Case-Based Execution Policy

Use the smallest sufficient workflow. Classify once from the requested behavior
and actual risk; reclassify only when new findings change scope or risk. This
section controls the effort required by later planning, role and validation
rules. It does not waive security, financial or destructive-action safeguards.

| Case | Examples and boundary | Required work |
|---|---|---|
| A - Discussion or read-only lookup | Explain a setting, locate configuration, compare approaches; no implementation requested | Answer or inspect only relevant sources. No file edits, task plan, agent delegation, build or tests. |
| B - Small documentation or presentation edit | Existing rule/document update, translation, label, local CSS or prompt wording; runtime contracts and sensitive behavior unchanged | One agent. Read the owning section and affected files; use at most a short checkpoint in the existing requirement. Inspect the edit and relevant format/links or affected presentation. No JSON plan, specialist review or new tests merely for this case. |
| C - Bounded local bug | Restore existing behavior within one capability; API/persistence/shared interaction contracts unchanged, no sensitive transition | One agent, existing requirement checkpoint, smallest fix. Run the nearest meaningful regression check; add coverage for a reproducible regression when useful. No new requirement tree, runner or agent solely because several files change. |
| D - Feature or changed workflow | New registration flow, material form interaction or changed shared component behavior within one capability | Compact plan beside the owning requirement, one primary implementer, applicable UX/QA roles and focused checks. Apply non-sensitive reviews sequentially by default. BSA only when requested or when decomposition is needed for independently verifiable tasks. |
| E - Cross-capability or migration | Changed public/shared contract, queue/provider lifecycle, data migration or uncertain ownership | Record owners, contracts, dependencies, acceptance and integration checks in the owning task plan. Main agent coordinates; delegate only independent substantial work with disjoint writes when coordination is likely to save time. |
| F - Sensitive change, overrides B-E | Login/session/authorization logic, private media access, secrets/PII, Credit/pricing/settlement, destructive operations | Keep required security/commercial/backend/QA gates and independent sensitive review. Limit reviews and checks to changed invariants. A label or CSS edit on a Login/Credits page alone does not trigger this case. |

### Effort Limits

- One agent is the default. A role is a perspective, not an instruction to spawn
  another agent. Delegate only when requested, required for independent sensitive
  review, or justified by independent complex work. Never fill available slots.
- Reuse sources and evidence already read in this session while relevant and
  current. Re-read when files, requirements, dependencies or task scope change;
  do not rescan the repository, every role, or every Skill on each turn.
- Keep short checkpoints together: outcome, affected scope, expected behavior,
  checks/results and material gaps. Do not create separate plan, status, evidence
  and handoff files for a local fix or documentation edit.
- Prefer the existing implementation, requirement and test runner. Do not invent
  new abstractions, refactors, runners or adjacent improvements to finish a fix.
- Choose validation from what changed: documentation needs content/link checks;
  code needs relevant static/behavior checks; layout changes need affected
  viewport checks; sensitive changes need invariant and negative-case checks.
  Run one focused pass after the fix. Repeat or broaden only for new edits,
  failures, changed inputs, unresolved risk or an explicit release/UAT request.
- Build when needed to deliver or verify the changed application, normally once
  after source edits are ready. Do not build for documentation-only changes or
  rerun a successful build for an unchanged handoff.
- For urgent non-sensitive fixes, implement the usable correction before broader
  testing; run necessary focused checks before claiming completion. Keep optional
  UAT or release suites separate and state unverified behavior accurately.
- Do not manage Git (branches, worktrees, commits, merges or PRs) unless the user
  requests it. Do not repeat permission questions for work already authorized.
- Stop when the requested outcome and necessary checks are complete. Report the
  result and material gaps briefly; no extra review cycle for reporting alone.

## 1. Sources of Truth

Before implementation:

1. Read the requirement file that owns the requested feature.
2. Read `requirements/099-technical-dept/000-master.md` for current architecture
   and file ownership. Start with its "Agent Start Here" index, then read the
   relevant ownership section and capability addenda rather than scanning the
   entire repository by default.
3. Inspect the nearest existing modules, tests, and runtime data contracts.
4. Treat current canonical modules as authoritative over stale paths in older
   requirements. Update stale requirement paths when implementation changes them.

Do not infer architecture from old compatibility folders or deleted module paths.
Use already-read relevant sections when still current; Case A does not require
loading implementation guides merely to answer a question.

### Requirement-First Delivery Pattern

- Apply Section0 first: Cases B/C use a short checkpoint in the existing owning
  requirement; Cases D/E/F need a plan with scope, dependencies and acceptance.
  Discussion alone needs neither. Do not create a new requirement when the
  current owner already covers the work.
- When complex work has independently verifiable responsibilities, split it into cohesive numbered
  requirements and small ordered tasks under a master plan. Reuse existing
  ownership and contracts rather than duplicating requirements or workflows.
- Implement and verify one task at a time, updating its evidence/status before
  advancing. Record gaps or deferred work explicitly; do not silently expand scope.
- Use existing focused tests/runners first. Add a grouped runner under `scripts/`
  only when reusable multi-task validation needs it; a local fix or documentation
  edit does not require one. Document relevant commands in the owning checkpoint
  or plan without creating duplicate test infrastructure.
- Aggregate runs must be explicit, fail on errors, and must not silently start
  paid generation, mutate live data or restart workers. Keep live UAT separate
  from isolated automated checks and report unverified runtime behavior.

## 1.1 Professional Role Routing

Follow `requirements/015-professional-agent-orchestration/` for substantial
requirements, UX/UI, Cinematic, backend, commercial and release work. Select
the smallest sufficient role set automatically; do not ask the user to choose a
role when ownership is clear.

### Primary Role Selection

For Cases D/E/F choose exactly one primary role. Cases B/C use
`base-implementation-owner` unless an actual specialist trigger applies:

| Task outcome | Primary role charter |
|---|---|
| New feature, changed workflow, requirement creation/reconciliation | `requirements/015-professional-agent-orchestration/roles/product-requirement-architect.md` |
| BSA analysis, reviewed-requirement decomposition and task acceptance traceability | `requirements/015-professional-agent-orchestration/roles/business-system-analyst.md` |
| Material screen, navigation, interaction, theme or accessibility work | `requirements/009-migration-to-react/roles/ux-ui-product-designer.md` |
| Video, film, shot, sequence, continuity, motion or audio work | `requirements/016-cinematic-studio/roles/cinematic-experience-director.md` |
| AI video execution packets, temporal prompting, provider-aware Shot attempts or drift diagnosis | `requirements/016-cinematic-studio/roles/generative-cinematic-production-director.md` |
| API, domain, repository, database, durable Job or infrastructure work | `requirements/018-implementation-backend/roles/backend-platform-architect.md` |
| Pricing, Credits, payments, payouts, refunds or billable recovery | `requirements/019-implementation-commercial-feature-plan/roles/commercial-financial-integrity.md` |
| Explicit review, regression audit, release gate or requirement closure | `requirements/015-professional-agent-orchestration/roles/qa-release-engineer.md` |

For a tiny local copy, translation, CSS, test expectation or prompt-wording
correction with an unchanged contract, use `base-implementation-owner`: follow
the owning requirement and repository rules without loading a specialist role.

### Reviewers And Mandatory Gates

- Add QA for substantial implementations, changed shared behavior, bug clusters,
  migrations, release gates and requirement closure.
- Add Backend and QA for financial or billable workflow changes.
- Add security/privacy review for authentication, authorization, public/private
  media, secrets, PII or destructive Support access.
- Add UX for material user-facing workflows.
- Add Cinematic for multi-shot storytelling or continuity decisions.
- Add Generative Cinematic Production for provider-aware AI video attempts,
  temporal continuity or Shot failure diagnosis.
- Use one primary plus at most two reviewers by default. More than three active
  roles requires a written reason.
- A user override may choose a role or request review-only work, but it cannot
  silently disable financial, security or destructive-action gates.
- Review roles do not automatically require separate agents. Use sequential
  scoped review for non-sensitive work and disclose its limited independence.
  File location alone does not trigger a gate; review the behavior being changed.

### Skill Routing

Load a Skill only after its trigger matches:

- `design-cinematic-experience`: Cinematic sequences, shots and continuity;
  `.agents/skills/design-cinematic-experience/SKILL.md`.
- `direct-generative-cinematic-production`: approved Shot execution, temporal
  motion, AI video provider constraints and attempt diagnosis;
  `.agents/skills/direct-generative-cinematic-production/SKILL.md`.
- `review-product-ux`: substantial flows or reusable UI contracts;
  `.agents/skills/review-product-ux/SKILL.md`.
- `review-commercial-integrity`: billable and financial state transitions;
  `.agents/skills/review-commercial-integrity/SKILL.md`.
- `verify-release-regressions`: substantial QA, regression and release work;
  `.agents/skills/verify-release-regressions/SKILL.md`.
- `review-generative-media-pipeline`: provider/reference/media qualification;
  `.agents/skills/review-generative-media-pipeline/SKILL.md`.
- `implement-generation-workflow`: cross-stage Generation lifecycle work;
  `.agents/skills/implement-generation-workflow/SKILL.md` and Section 6 below.
- `plan-database-migration`: relational schema readiness, JSON-to-database
  cutovers, backfills and rollback; `.agents/skills/plan-database-migration/SKILL.md`.

Do not load Skills for their documented non-trigger cases. Do not create a
second copy of a Skill under a requirement folder.

### Clarification And Execution

Ask one concise question only when different answers materially change price,
rights, retention, public visibility, destructive scope, capability ownership
or the requested artifact (discussion/requirement versus implementation). Do
not ask when repository inspection can resolve the choice safely.

For substantial work, state or record the primary role, reviewers, triggered
Skills, owning requirement and capability. Load only the primary charter first;
load reviewer charters immediately before review. If independent subagents are
unavailable, apply roles sequentially and disclose limited review independence
rather than claiming parallel or independent execution. If required independent
sensitive review is unavailable, report that gate as pending, not passed.

## 2. Project Structure Gate

### Requirement-Linked Coordination

Follow `requirements/015-professional-agent-orchestration/008-coordinated-requirement-delivery.md`
and `009-task-contract-and-handoff.md` in that directory. Classify from behavior
and risk, not line count. Simple bounded, low-risk, unchanged-contract work uses
one agent and a short requirement checkpoint; do not split it or spawn agents
merely to use parallelism. Cross-capability, shared-contract, migration or
sensitive work is complex, but can still be sequential.

For complex work the main thread performs Technical Lead coordination using
`requirements/015-professional-agent-orchestration/roles/technical-lead.md`.
This is not a second primary role or a mandatory extra process. Assign one
domain primary per task, explicit write scopes, stable contracts, dependencies,
acceptance checks and reviewers. Keep the task plan beside its owning requirement.
Parallelize only independent complex tasks with completed dependencies and
non-overlapping writes when this saves time after coordination. Children must
not spawn more agents. One agent is the default; main plus two subagents is the
maximum, not a staffing target. Perform required independent reviews in waves.

Project profiles are indexed in
`requirements/015-professional-agent-orchestration/agent-artifact-map.json`.
Additional specialists are frontend-engineer and user-journey-tester under
`requirements/009-migration-to-react/roles/`; api-service-engineer and
database-engineer under `requirements/018-implementation-backend/roles/`; and
security-reviewer under `requirements/015-professional-agent-orchestration/roles/`.
They refine implementation/review assignments, never duplicate capability ownership.

BSA (`business-system-analyst`) decomposes reviewed requirements into bounded
task packets when explicitly requested or when complex work needs decomposition;
follow orchestration requirement011. Do not add BSA to every implementation.
For material user flows, obtain UX review before freezing requirement/task details.
BSA does not replace Product approval, UX design, implementation owners or QA.

The Lead sends the task packet and collects a handoff with changed files,
contracts, test evidence, risks and next action. Integrate and verify before
marking complete. Never weaken acceptance criteria to pass a check. Require
independent sensitive review; disclose sequential fallback when unavailable.
Review-only agents do not edit application code. Role/write-scope instructions
do not grant permissions or constitute filesystem enforcement. Do not change
global Codex trust/config, spend live Credits or mutate production during tests.

Run `node scripts/verify-agent-orchestration.mjs --plan <task-plan.json>` when
creating or changing a complex JSON plan, not for Cases A/B/C or every resumed
turn. Focused tooling checks use `--group legacy|contracts|inventory`;
aggregate checks require explicit `--all`. If custom profiles are unavailable,
use the same charter/task packet through built-in agents and report that fallback.

Before creating, moving, or renaming any file:

1. Identify the capability that owns it.
2. Prefer an existing capability folder and naming pattern.
3. Do not place a file in a project root because ownership is unclear.
4. Create a new folder only when the capability needs multiple cohesive modules
   and its dependency direction is clear.
5. If no documented location owns the capability, update
   `requirements/099-technical-dept/000-master.md` in the same change.
6. Update imports, browser script ordering, fixtures, tests, and documentation
   whenever a file moves.
7. Verify all new or moved files against this map during final validation.

The central map maintenance contract in `requirements/099-technical-dept/000-master.md`
applies to every task. Update its affected ownership rows in the same change set
whenever capability boundaries, public entry points, dependency direction,
configuration ownership or runtime data locations change, including removals.
Update affected requirement links and registries too; an appended progress note
alone must not leave the canonical map stale. Changes within an existing mapped
boundary require no artificial map edit: record "architecture map unchanged" in
task evidence instead. Verify changed map links/paths before handoff.

Canonical placement:

```text
Process bootstrap                    server/server.js
Express composition                  server/app/createApp.js
HTTP routes                          server/app/routes/
Server business logic               server/domain/<capability>/
Persistence adapters                server/repositories/<capability>/
Atomic JSON storage helper           server/repositories/json/
Local runtime JSON                   server/data/<capability>/
Server middleware                    server/middleware/
AI provider integrations             server/providers/
Server configuration                 server/config/

React bootstrap and routing           web/src/main.tsx and web/src/app/
React shared components               web/src/components/
React feature modules                 web/src/features/<feature>/
React shared infrastructure           web/src/lib/
React navigation metadata             web/src/app/routeRegistry/
React actor-scoped persistence        web/src/lib/persistence/
React feature exposure policy         web/src/lib/permissions/
React styles and tokens               web/src/styles/
Localization catalogs/runtime data    client/i18n/
Client runtime visual assets         client/assets/<feature>/
Generated image output               client/outputs/

Visual authoring source sets          visual-assets/character-builder/
Maintenance/migration scripts         scripts/
Automated tests and fixtures           test/ and test/fixtures/
Requirements and plans                requirements/<phase-or-domain>/
```

Current React feature owners include:

```text
web/src/features/admin/
web/src/features/collections/
web/src/features/community/
web/src/features/comparisons/
web/src/features/credits/
web/src/features/fashion-blueprint/
web/src/features/generation/
web/src/features/history/
web/src/features/playground/
web/src/features/profiles/
web/src/features/prompt-composer/
web/src/features/scene-builder/
web/src/features/studio/
web/src/features/templates/
```

Current server domain and repository capabilities should follow matching
capability names where practical.

## 2.1 Capability Ownership and Workflow Entry-Point Gate

Follow
`requirements/009-migration-to-react/016-capability-ownership-and-single-workflow-entry-points.md`
for every new service, material workflow, cross-capability dependency, or
repository access.

Before implementation:

1. Name the capability that owns the business rule and runtime state.
2. Find its canonical application/domain entry point and existing callers.
3. Search for an existing workflow before adding another service, manager,
   mutation hook, storage path, prompt compiler, or queue path.
4. Extend the owning public contract instead of assembling the same workflow in
   another route or feature.
5. Keep cross-capability dependencies directed through the target capability's
   public facade. Do not mutate another capability's repository directly.
6. Keep provider dispatch behind Generation, Credit mutations behind Credits,
   reference authority behind Reference Processing, and public snapshot policy
   behind the owning source capability plus Community publication.
7. If migration temporarily requires two paths, document the canonical owner,
   compatibility reason, parity test, and deletion checkpoint in the owning
   requirement.

One entry point means one canonical use-case contract, not one oversized
service. Internal focused services remain encouraged when they are hidden
behind the owning workflow boundary.

## 2.2 Performance Ownership and Measurement Gate

Follow
`requirements/009-migration-to-react/017-performance-ownership-observability-and-tuning.md`
for performance-sensitive work.

- Measure or establish a reproducible baseline before speculative tuning.
- Name the owner, key scope, source of truth, TTL/terminal condition,
  invalidation events and size bound for every new cache or polling loop.
- Do not create feature-local polling, thumbnail, provider, Credit or reference
  caches when a canonical owner exists.
- Bound list queries, payload size, reference count, retained image buffers and
  browser persistence. Do not retain Base64 images in durable client state.
- Separate application latency, queue wait, reference processing, provider
  duration and persistence time in diagnostics.
- Preserve actor isolation, authorization, idempotency and Credit consistency;
  performance is not justification to bypass owning capability contracts.
- Design APIs and repositories for pagination, cursor/filter contracts and
  stable IDs before database migration. Keep SQL/index/pool tuning in future
  repository/database work after representative data exists.
- For a performance change, report the baseline, expected budget/improvement,
  validation method and remaining capacity risk.

## 3. Server Architecture Rules

- Keep `server/server.js` limited to environment loading, process bootstrap,
  startup tasks, and HTTP listen.
- Register endpoints through `server/app/createApp.js` and
  `server/app/routes/`.
- Routes validate/translate HTTP input and delegate business behavior. Do not
  embed persistence or provider logic in routes.
- Domain code must not hard-code raw JSON paths. Resolve paths through
  `server/config/paths.js` and depend on repository contracts.
- New JSON mutation code must use
  `server/repositories/json/jsonFileStore.js` through an owning repository.
- Keep runtime data under `server/data/<capability>/`; never mix generated data
  with source modules.
- Do not recreate root-level compatibility wrappers under `server/`.
- Existing legacy folders at the server root are migration residue, not a
  placement precedent for new files.
- Provider capabilities and defaults come from server provider configuration and
  the public provider catalog. Do not duplicate model capability tables in UI
  code.

## 4. Client Architecture Rules

- React + TypeScript + Vite under `web/` is the only browser runtime owner.
- Do not add customer behavior to `client/index.html`, `client/app.js`, legacy
  IIFEs, `window.state`, or `window.ModelPromptForge*` globals.
- `client/i18n/`, `client/assets/`, and `client/outputs/` remain server-served
  data/assets until their storage migration requirements are implemented.
- Use React Router for internal navigation and TanStack Query for server state.
- API calls use `web/src/lib/api/apiClient.ts`; every response boundary should
  have an owning Zod schema.
- Actor-relative query keys include actor identity, and actor switching clears
  the Query cache and actor-owned drafts.
- Reuse components under `web/src/components/`; feature orchestration belongs
  under `web/src/features/<feature>/`.
- Shared components receive state, options, and callbacks. They must not call AI
  providers or create a parallel generation/credit pipeline.
- Capability-driven controls must hide unsupported fields. For example, Output
  Resolution appears only when the active model exposes
  `capabilities.resolutions`.
- Use React Router `Link`, `NavLink`, and navigation hooks for internal routes.
- Design every user-visible layout for mobile, tablet, and desktop from the
  outset. Use responsive constraints rather than assuming the desktop layout
  will collapse safely; explicitly consider grids, navigation, sticky panels,
  dialogs, forms, media previews, footers, and action placement at each size.
- Keep fixed-format controls dimensionally stable and responsive. Verify that
  content remains readable and operable with no overlap, clipping, horizontal
  overflow, inaccessible controls, or unintended reordering at mobile, tablet,
  and desktop widths.
- Follow the component, UX/UI, accessibility, API, state, and release rules in
  `requirements/009-migration-to-react/SKILL.md`.
- Before creating or substantially changing user-visible UI, read
  `requirements/Knowledge/ui-design-system-and-visual-language.md` and the
  visual reference named by the owning requirement.

### Shared Processing Feedback

- Processing/loading icons must use `web/src/components/ui/ProcessingSpinner.tsx`.
  Media Generation placeholders use the existing GenerationStageState wrapper
  and its yellow glow treatment; compact controls use the same spinner at a
  smaller size. Do not import independent LoaderCircle/Loader2 icons or invent
  feature-specific spinners. Preserve reduced-motion behavior.
- Show localized accessible status while work is pending, including each active
  Comparison slot. Completed results stay visible; failed/cancelled states stop
  spinning. Keep duplicate prevention, cancellation and error/retry controls.
- Skeletons may describe loading content, but must not replace processing feedback
  with a blank viewport or a bare internal status code. Do not fabricate progress.

### 4.1 Scoped UI Preservation Gate

For every screen or shared-component change:

1. Name the exact section, interaction, and responsive states owned by the
   request before editing.
2. Preserve all sibling sections, established actions, loading/error states,
   sticky summaries, navigation, and responsive behavior unless an explicit
   acceptance criterion changes them.
3. Extend an existing component when its ownership and contract match. Create
   a new component only when the new responsibility is cohesive and cannot be
   expressed safely through the existing public contract.
4. Do not use a nearby redesign as permission to move, remove, restyle, or
   replace unrelated working UI. Requirement reconciliation must identify each
   intentional removal or relocation explicitly.
5. Add regression assertions for both the requested behavior and adjacent
   behavior that has previously regressed. A changed section is not complete
   merely because its new state renders.
6. Review the scoped diff before handoff and revert only agent-authored,
   out-of-scope UI churn. Never revert unrelated user changes.

## 5. State, Identity, and Ownership

- Feature state belongs to its React route/store and versioned persistence
  contract. Do not revive the legacy compatibility state.
- Browser persistence containing user work must be actor-scoped. Switching mock
  users must not leak history, queue state, prompts, templates, or settings.
- Client API calls use `web/src/lib/api/apiClient.ts` so the active actor header
  is attached consistently.
- Server ownership decisions must use `req.actorContext`, not a trusted
  `username` supplied in request body or query parameters.
- Keep mock actor contracts migration-compatible with future authentication and
  user management. Do not make `username` the durable primary key.
- Public snapshots must pass the relevant ownership, visibility, and reference
  sanitization policy before leaving owner scope.

## 6. Generation, References, and Credits

- For changes crossing multiple Generation lifecycle stages, or changing
  Credit settlement, idempotency, Queue/provider dispatch, terminal polling,
  reference-count parity, Comparison ownership or multi-output groups, follow
  `.agents/skills/implement-generation-workflow/SKILL.md`.
  Do not load that Skill for isolated CSS, copy, localization, prompt wording
  or presentation-only changes with unchanged workflow contracts.
- Use the existing canonical generation pipeline. UI modules must not call AI
  providers or mutate the queue directly.
- Final prompt generation remains owned by the canonical client/server prompt
  compiler modules. Prompt Composer and templates propose inputs; they do not
  fork final compilation.
- Respect reference slot ownership and provider limits. Do not persist large
  Base64 references in snapshots when a job/output reference can be used.
- Never silently send a reference type the active model does not support.
- Credit estimates, reservations, capture, refund, and idempotency belong to the
  credit domain and repository modules.
- The displayed estimate and submitted generation parameters must describe the
  same provider, model, resolution, references, and output count.
- Comparison credit totals include only enabled comparison slots. Normal mode
  uses the single active provider/model estimate.
- Do not hard-code model pricing in client code. Pricing policy belongs to server
  configuration and the credit pricing service.

## 7. Localization

- All new React user-visible strings must use `react-i18next`.
- Add keys to an appropriate namespace under
  `client/i18n/locales/<locale>/<namespace>.json`.
- Keep key and interpolation-variable parity for every enabled locale.
- Add a namespace to `client/i18n/manifest.json` when introducing one.
- Do not store AI prompt text or user runtime data in translation catalogs.
- Do not introduce new inline language maps inside feature modules.

## 8. Security and Data Hygiene

- Never commit API keys, tokens, secrets, or private user references.
- Do not log raw sensitive prompts, Base64 images, or private reference payloads
  in normal application logs.
- Validate actor ownership again on the server even when the client already
  filtered the action.
- Sanitize errors returned to the client while preserving stable error codes for
  UI handling.
- Keep admin/support actions role-gated and audit material state changes.
- Preserve unrelated user changes in a dirty worktree. Never revert files you did
  not own for the task.

## 9. Editing and Validation

- Use `apply_patch` for manual source and documentation edits.
- Prefer `rg` or `rg --files` for repository search.
- Keep edits scoped to the requested capability and avoid unrelated formatting
  churn.
<!-- - Do not run Node commands or Node tests directly in this repository. -->
<!-- - Tell the user exactly which `node --check`, `node --test`, or npm command to
  execute and ask them to report failures. -->
- Read-only checks such as JSON parsing, `git diff --check`, and file inspection
  are allowed.
- For frontend changes, verify the affected interaction in the in-app browser
  when available. Layout/responsive changes need mobile, tablet, and desktop
  viewports; representative targets are approximately 390px, 768px or 820px,
  and1440px wide. For unchanged layout, inspect only states/viewports affected
  by the change; do not repeat a three-viewport audit for copy or logic alone.
  Record relevant visual checks that could not be performed and remaining risk.

## 10. Required Handoff

Every implementation handoff should report only relevant items:

```text
behavior completed
new files and owning capability
moved files and updated consumers
runtime data paths introduced or changed
requirement/architecture updates
validation performed
Node commands the user should run
remaining test gap or risk
```

Do not mark a requirement complete until behavior is implemented and required
validation has passed.
