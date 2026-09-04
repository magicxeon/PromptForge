# Package 003 - Keyframe Compiler And Generation Cutover

**Requirement checkpoints:** Steps 7-8  
**Runtime risk:** Cross-stage Generation workflow  
**Status:** Complete

## Dependency Order

1. Trace current manual and Generate All request paths end to end.
2. Add structured server-owned Keyframe Contract and compiler.
3. Add recipe/profile/prompt-budget configuration and deterministic fingerprint.
4. Run server compiler in fixture parity against the client adapter.
5. Resolve only documented intentional differences.
6. Add compile endpoint/use case through `CinematicApplicationService`.
7. Route manual generation to the server contract.
8. Route Generate All to the same compile operation.
9. Revalidate quote/submit contract fingerprint and references.
10. Remove client final assembly only after all parity tests pass.

## Protected Generation Invariants

- Estimate and submission parameters match.
- Reservation precedes Queue visibility.
- Idempotency and terminal settlement remain unchanged.
- Reference roles/counts match provider capability.
- Manual and batch use the same source fingerprint.
- Completed attempts and approved sources remain recoverable.

## Stop Gates

- Deterministic semantic compiler tests pass.
- Manual/batch fingerprint parity passes.
- Existing shared Generation and Credit tests pass.
- No paid provider request is required for automated closure.
