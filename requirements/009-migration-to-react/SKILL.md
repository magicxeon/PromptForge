---
name: migrate-model-prompt-forge-to-react
description: Plan, implement or review the complete ModelPromptForge frontend migration from browser-native Vanilla JavaScript to a reusable React, TypeScript and Vite application while preserving API, actor, ownership, generation, credit, reference, localization and UX contracts.
---

# Migrate ModelPromptForge to React

For work that crosses Generation lifecycle stages or changes Credit, Queue,
provider dispatch, terminal polling, reference-count parity, Comparison
ownership or multi-output groups, use
`skills/implement-generation-workflow/SKILL.md`. Do not load that specialized
Skill for isolated presentation, copy or prompt-wording changes.

## Required Reading

1. `AGENTS.md`
2. `requirements/099-technical-dept/000-master.md`
3. `requirements/009-migration-to-react/000-master-react-migration-roadmap.md`
4. `001-current-system-inventory-and-parity-baseline.md`
5. `016-capability-ownership-and-single-workflow-entry-points.md` for any new
   service, workflow, cross-capability dependency or repository access
6. `017-performance-ownership-observability-and-tuning.md` for caching, polling,
   concurrency, media, payload, repository or performance-sensitive changes
7. the numbered migration requirement owning the task
8. the original feature requirement
9. current feature code, server route/domain and tests

Code and tests outrank stale requirement paths. Record discrepancies before
changing behavior.

## Core Skill Set

An implementation agent must apply all relevant skills below.

### React and TypeScript Engineering

- React component composition and controlled APIs
- strict TypeScript and discriminated unions
- React Router data routes and lazy modules
- TanStack Query cache/mutation design
- React Hook Form and Zod validation
- reducer/store ownership for editor workflows
- Vite build, proxy and environment configuration

### Reusable Component Architecture

- separate primitives, product components and feature containers
- prefer typed variants over growing boolean props
- keep API/state out of presentational components
- create adapters between feature DTOs and shared component models
- reuse media, engagement, profile, comparison and generation components
- do not copy legacy markup into multiple React features

### Capability and Workflow Architecture

- name the owning capability before adding a service or state container
- enter each business workflow through its documented application facade
- do not assemble Credit, Generation, Reference or publication lifecycles in a
  second route or feature
- do not import a foreign capability repository to bypass its domain contract
- keep cross-capability dependencies directed through public use-case contracts
- classify duplicate-looking behavior as shared policy, reusable workflow or
  intentionally different presentation before extracting it
- update Requirement 016 and the technical-debt master when ownership changes

### Performance Engineering

- measure a workflow baseline before speculative optimization
- assign one owner to each cache, polling loop and concurrency policy
- keep lists, payloads, reference counts and retained image memory bounded
- separate application, queue, provider and persistence timing
- use previews for discovery and authorized originals for inspection/download
- preserve actor isolation, idempotency, Credit integrity and authorization
- design repository contracts for pagination/filtering before database migration
- defer SQL/index/pool tuning until the database and representative data exist

### UX/UI Design

- read the relevant visual reference before layout work
- identify user goal, hierarchy and shortest task path
- build responsive desktop/mobile compositions
- preserve stable dimensions and avoid overlapping content
- use progressive disclosure for expert controls
- distinguish primary, secondary, destructive and unavailable actions
- inspect loading, empty, error, disabled and permission states
- validate Thai, English and Japanese content
- use Lucide icons and accessible tooltips

### Accessibility

- semantic HTML and landmarks
- keyboard operation and visible focus
- dialog focus trap/restoration
- form labels, descriptions and errors
- async status announcements
- color contrast and non-color status
- reduced motion
- practical touch targets

### API and Security

- use the shared API client
- parse critical responses with Zod
- keep authorization on the server
- derive permissions from viewer projections
- actor-scope cache and persistence
- never log secrets, Base64, private references or raw sensitive prompts
- cancel stale requests and polling

### Generation Domain

- keep provider calls on the server
- preserve prompt compiler ownership
- match estimate and submission snapshots
- support enabled-slot Comparison totals
- enforce reference roles/capabilities/ownership
- handle queue terminal, missing and restart states
- avoid durable Base64 state

### Testing and Migration

- establish legacy behavior evidence first
- add unit/component tests with Testing Library
- mock HTTP with MSW
- add route E2E with Playwright
- compare canonical payloads for parity
- test actor, role, locale and viewport variants
- use route flags for cutover and rollback
- delete legacy only after the observation gate

## Standard Workflow

1. Read the route/feature inventory.
2. Inspect current code and tests.
3. Classify behavior as preserve, intentionally change, remove or defer.
4. Identify shared components and server contracts.
5. Update the parity matrix.
6. Implement pure contracts before UI when migrating editor logic.
7. Build UI states and accessibility.
8. Add tests and visual verification.
9. Cut over only the owned route.
10. Observe, then remove legacy consumers.
11. Update architecture and requirements.

## File Ownership

```text
web/src/app/                    app composition and routes
web/src/components/ui/          reusable primitives
web/src/components/<domain>/    reusable product components
web/src/features/<feature>/     route and feature orchestration
web/src/lib/                    cross-feature infrastructure
web/src/styles/                 tokens and global reset only
server/                         existing API/domain/repository ownership
requirements/009-migration-to-react/
```

Do not place React source in `client/`. Do not import legacy global scripts from
`web/`.

## UX/UI Review Checklist

- Is the primary user goal obvious without instructional marketing copy?
- Is the main media/result large enough to inspect?
- Are advanced controls hidden until needed?
- Do Back and Breadcrumb return to actual context?
- Are billable actions preceded by a current estimate?
- Are unsupported controls absent?
- Can every action be reached by keyboard?
- Does the layout work at mobile and desktop widths?
- Do all enabled locales fit?
- Are loading/error/empty states calm and recoverable?

## Review Finding Priority

1. ownership/security/data leak
2. credit or generation mismatch
3. lost workflow or corrupt persistence
4. navigation/actor/locale regression
5. accessibility failure
6. component duplication and state coupling
7. performance/bundle regression
8. visual polish

## Handoff

Report:

```text
route/behavior migrated
shared components introduced or extended
API and schema contracts consumed/changed
actor/persistence impact
legacy files still owning behavior
tests and visual checks performed
commands the user must run
rollback state and remaining parity gap
```

Do not run Node commands in this repository. Ask the user to execute the exact
commands and report failures.
