# Step 1 - Runtime Control Foundation

**Status:** Complete

## Goal

Implement one versioned runtime override state and one effective availability
policy shared by Image, Video and AI Text provider decisions.

## Tasks

1. Add `providerControlState` to the canonical data-path resolver.
2. Add `ProviderControlRepository` using `jsonFileStore` mutations.
3. Validate Provider, Model and Workflow command shape in the application
   service; keep repository persistence-focused.
4. Add `ProviderAvailabilityPolicyService` with in-memory snapshot,
   inheritance and master precedence.
5. Preserve no-override behavior and accepted-job dispatch.
6. Add focused repository/policy tests before consumer integration.

## Exit Evidence

- Provider OFF dominates Model and Workflow ON.
- Model OFF dominates Workflow ON.
- Workflow OFF remains narrow.
- Version conflicts and duplicate command IDs are deterministic.
- Failed persistence never changes the active in-process snapshot.

Verified by `providerControlRepository.test.js` and
`providerAvailabilityPolicy.test.js`.
