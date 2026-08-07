# 007 - QA, Security, Observability and Release Gate

**Status:** Planned  
**Depends on:** 001-006

## Objective

Define the complete release gate for a privileged tool that can alter every
guided generation workflow.

## Automated Validation

### Server

- contract and schema tests
- repository concurrency and atomic release tests
- authorization tests for Admin, Support and customer roles
- validation rule graph and prompt fixture tests
- publication, cache invalidation and rollback integration tests
- generation job idempotency and Credit failure tests
- media ownership and URL authorization tests

### React

- API boundary schema tests
- editor state and dirty-navigation tests
- filters, pagination and actor-scoped Query cache tests
- visual candidate and lifecycle state tests
- nested dialog layering tests
- i18n catalog parity

### End-to-End

1. Create a visual option draft.
2. Generate three candidate assets.
3. Approve one candidate and validate fixtures.
4. Publish a release.
5. Confirm the option appears in its intended Studio modes only.
6. Generate an image and verify prompt/release lineage.
7. Disable the option and verify saved-work compatibility.
8. Roll back the release and verify recovery.

## Security

- all mutations are role-gated and CSRF/authentication migration ready
- server revalidates every prompt/rule/asset input
- SVG or uploaded media is sanitized and content-sniffed
- no filesystem path is accepted from the client
- no raw private reference or Base64 image is logged
- generation prompts visible only to permitted roles/debug policy
- audit records include actor, action, entity/revision, correlation ID and reason

## Observability

Measure separately:

- draft validation duration
- queue wait and provider generation duration
- derivative processing duration
- release compilation and activation duration
- public bundle payload/cache behavior
- failures by stable code and lifecycle stage

Provide a safe support reference for failed jobs and releases. Apply explicit
retention to rejected candidates and raw provider output.

## Manual Visual QA

- every visual is readable at customer thumbnail size
- sibling options are distinguishable
- monochrome assets inherit theme color correctly
- no accidental cropping of face, hair, garment or body cue
- all Momelo themes remain readable
- desktop and mobile layouts have no overlap
- disabled and retired states cannot be mistaken for selected state

## Release Checkpoints

- Checkpoint 1: contract and inventory accepted
- Checkpoint 2: server draft/release workflow accepted
- Checkpoint 3: one visual family completes end to end
- Checkpoint 4: Admin UI and validation accepted
- Checkpoint 5: shadow parity accepted
- Checkpoint 6: active-release rollout and rollback drill accepted

## Acceptance Criteria

- Required automated suites pass.
- Manual visual QA evidence is recorded.
- Security and role matrix passes.
- Performance baseline and capacity risks are documented.
- Rollback drill succeeds before broad Admin access.
- Requirement is not marked complete while any production workflow still reads
  an unexplained duplicate source of truth.

