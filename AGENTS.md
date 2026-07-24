# ModelPromptForge Agent Instructions

These rules apply to every task in this repository. Preserve them when handing
work to another agent.

## 1. Sources of Truth

Before implementation:

1. Read the requirement file that owns the requested feature.
2. Read `requirements/007-technical-dept/000-master.md` for current architecture
   and file ownership.
3. Inspect the nearest existing modules, tests, and runtime data contracts.
4. Treat current canonical modules as authoritative over stale paths in older
   requirements. Update stale requirement paths when implementation changes them.

Do not infer architecture from old compatibility folders or deleted module paths.

## 2. Project Structure Gate

Before creating, moving, or renaming any file:

1. Identify the capability that owns it.
2. Prefer an existing capability folder and naming pattern.
3. Do not place a file in a project root because ownership is unclear.
4. Create a new folder only when the capability needs multiple cohesive modules
   and its dependency direction is clear.
5. If no documented location owns the capability, update
   `requirements/007-technical-dept/000-master.md` in the same change.
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

Client bootstrap/orchestration       client/app.js
Client shared infrastructure         client/core/
Client feature modules               client/<feature>/
Shared generation UI                 client/generation-controls/
Client navigation and shell          client/shell/
Reusable visual controls             client/visual-controls/
Localization catalogs/runtime data   client/i18n/
Client runtime visual assets         client/assets/<feature>/
Self-hosted browser dependencies      client/assets/vendor/<library>/

Visual authoring source sets          visual-assets/character-builder/
Maintenance/migration scripts         scripts/
Automated tests and fixtures           test/ and test/fixtures/
Requirements and plans                requirements/<phase-or-domain>/
```

Current client feature owners include:

```text
client/admin/
client/clothing/
client/community/
client/comparisons/
client/credits/
client/playground/
client/prompt-composer/
client/scene-builder/
```

Current server domain and repository capabilities should follow matching
capability names where practical.

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

- The application is browser-native Vanilla JavaScript with no client build
  step. Use the established IIFE/global namespace pattern.
- Keep `client/app.js` as orchestration. Reusable behavior belongs to its feature
  module or `client/core/`.
- Register browser scripts in dependency order in `client/index.html`.
- Reuse shared components instead of copying Studio UI into Playground or other
  pages.
- `client/generation-controls/` owns shared prompt, reference, engine/comparison,
  action, and result presentation used by Studio and Playground.
- Shared components receive state, options, and callbacks. They must not create a
  second Studio state or perform provider calls directly.
- Capability-driven controls must hide unsupported fields. For example, Output
  Resolution appears only when the active model exposes
  `capabilities.resolutions`.
- Use `window.ModelPromptForgeRouter` for application navigation. Do not force
  full-page navigation for internal routes.
- Keep fixed-format controls dimensionally stable and responsive. Verify no
  overlapping or clipped text at desktop and mobile widths.

## 5. State, Identity, and Ownership

- `window.state` remains the canonical compatibility state for Studio.
- Feature-specific state such as Playground or Scene Builder must use its owning
  state module and versioned persistence contract.
- Browser persistence containing user work must be actor-scoped. Switching mock
  users must not leak history, queue state, prompts, templates, or settings.
- Client API calls should use `client/core/apiClient.js` so the active actor
  header is attached consistently.
- Server ownership decisions must use `req.actorContext`, not a trusted
  `username` supplied in request body or query parameters.
- Keep mock actor contracts migration-compatible with future authentication and
  user management. Do not make `username` the durable primary key.
- Public snapshots must pass the relevant ownership, visibility, and reference
  sanitization policy before leaving owner scope.

## 6. Generation, References, and Credits

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

- All new user-visible strings must use `client/core/i18nService.js`.
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
- Do not run Node commands or Node tests directly in this repository.
- Tell the user exactly which `node --check`, `node --test`, or npm command to
  execute and ask them to report failures.
- Read-only checks such as JSON parsing, `git diff --check`, and file inspection
  are allowed.
- For frontend changes, verify the visible result in the in-app browser when it
  is available. Check at least one desktop and one mobile viewport for substantial
  layout changes.

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
