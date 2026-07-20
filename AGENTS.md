# ModelPromptForge Agent Instructions

These rules apply to every task in this repository.

## Project Structure Gate

Before creating, moving, or renaming any file:

1. Inspect the existing project structure and the nearest related modules.
2. Read `requirements/007-technical-dept/000-master.md` as the current architecture source of truth.
3. Identify the capability that owns the file before choosing its location.
4. Prefer an existing capability folder and naming pattern over introducing a new folder.
5. Do not place a file in a project root merely because its final ownership is unclear.
6. If no existing folder clearly owns the file, update the architecture document with the new ownership rule before creating the folder.
7. During final validation, verify that every new or moved file follows the documented structure.

Default placement rules:

```text
HTTP routes                         server/app/routes/
Server business logic              server/domain/<capability>/
Persistence adapters               server/repositories/<capability>/
Local runtime JSON                 server/data/<capability>/
Server middleware                  server/middleware/
AI provider integrations           server/providers/
Server configuration               server/config/
Client shared infrastructure       client/core/
Client feature modules             client/<feature>/
Client navigation and shell        client/shell/
Client runtime visual assets       client/assets/<feature>/
Visual source sets and manifests   visual-assets/character-builder/
Maintenance or migration scripts   scripts/
Automated tests                    test/
Requirements and plans             requirements/<phase-or-domain>/
```

Additional constraints:

- Do not recreate root-level compatibility wrappers under `server/`.
- Keep `server/server.js` focused on process bootstrap and startup tasks.
- Register HTTP behavior through `server/app/createApp.js` and `server/app/routes/`.
- Domain code must not own raw JSON filesystem paths. Resolve data paths through `server/config/paths.js` and use repository contracts.
- New JSON mutation code must use `server/repositories/json/jsonFileStore.js` through an owning repository or domain service.
- Do not mix generated runtime data with source modules.
- Keep tests outside production folders unless an established tool requires colocated tests.
- Update imports, documentation, fixtures, and tests whenever a file is moved.

## Node Validation

Do not run Node commands or Node tests directly. Tell the user which commands to execute and ask them to report any failures.

