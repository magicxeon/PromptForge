# ModelPromptForge Agent Instructions

These rules apply to every task in this repository. Preserve them when handing
work to another agent.

## 1. Sources of Truth

Before implementation:

1. Read the requirement file that owns the requested feature.
2. Read `requirements/099-technical-dept/000-master.md` for current architecture
   and file ownership.
3. Inspect the nearest existing modules, tests, and runtime data contracts.
4. Treat current canonical modules as authoritative over stale paths in older
   requirements. Update stale requirement paths when implementation changes them.

Do not infer architecture from old compatibility folders or deleted module paths.

### Requirement-First Delivery Pattern

- Before implementation, create or update the owning requirement and complete
  the implementation plan, including scope, dependencies and acceptance checks.
- When work has multiple responsibilities, split it into cohesive numbered
  requirements and small ordered tasks under a master plan. Reuse existing
  ownership and contracts rather than duplicating requirements or workflows.
- Implement and verify one task at a time, updating its evidence/status before
  advancing. Record gaps or deferred work explicitly; do not silently expand scope.
- Split automated validation into short focused groups. Extend an existing
  appropriate runner or add an owning runner under `scripts/` with selectable
  groups and one aggregate entry point for later UAT or pre-production-build
  execution. Document commands and prerequisites in the implementation plan.
- Aggregate runs must be explicit, fail on errors, and must not silently start
  paid generation, mutate live data or restart workers. Keep live UAT separate
  from isolated automated checks and report unverified runtime behavior.

## 1.1 Professional Role Routing

Follow `requirements/015-professional-agent-orchestration/` for substantial
requirements, UX/UI, Cinematic, backend, commercial and release work. Select
the smallest sufficient role set automatically; do not ask the user to choose a
role when ownership is clear.

### Primary Role Selection

Choose exactly one primary role:

| Task outcome | Primary role charter |
|---|---|
| New feature, changed workflow, requirement creation/reconciliation | `requirements/015-professional-agent-orchestration/roles/product-requirement-architect.md` |
| Material screen, navigation, interaction, theme or accessibility work | `requirements/009-migration-to-react/roles/ux-ui-product-designer.md` |
| Video, film, shot, sequence, continuity, motion or audio work | `requirements/016-cinematic-studio/roles/cinematic-experience-director.md` |
| AI video execution packets, temporal prompting, provider-aware Shot attempts or drift diagnosis | `requirements/016-cinematic-studio/roles/generative-cinematic-production-director.md` |
| API, domain, repository, database, durable Job or infrastructure work | `requirements/017-implementation-backend/roles/backend-platform-architect.md` |
| Pricing, Credits, payments, payouts, refunds or billable recovery | `requirements/018-implementation-commercial-feature-plan/roles/commercial-financial-integrity.md` |
| Explicit review, regression audit, release gate or requirement closure | `requirements/015-professional-agent-orchestration/roles/qa-release-engineer.md` |

For a tiny local copy, translation, CSS, test expectation or prompt-wording
correction with an unchanged contract, use `base-implementation-owner`: follow
the owning requirement and repository rules without loading a specialist role.

### Reviewers And Mandatory Gates

- Add QA for substantial implementations, shared components, bug clusters,
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
rather than claiming parallel or independent execution.

## 2. Project Structure Gate

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
- For frontend changes, verify the visible result in the in-app browser when it
  is available. Check the affected layout at mobile, tablet, and desktop
  viewports; representative targets are approximately 390px, 768px or 820px,
  and 1440px wide. Record any viewport that could not be verified and the
  remaining responsive risk.

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
