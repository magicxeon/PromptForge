# Cinematic Studio Fix Tickets

**Status:** Implemented; live media validation pending
**Owner:** Cinematic Studio
**Ticket format:** `CINE-FIX-###`

This folder tracks defects discovered while validating the implemented
Cinematic workflow. A ticket owns one observable defect, its source contract,
implementation boundary, regression evidence and closure state. Existing
Requirement 016 files remain the feature source of truth; tickets reconcile a
specific defect back into those requirements instead of replacing them.

| Ticket | Outcome | Priority | Status |
|---|---|---:|---|
| `CINE-FIX-001` | Explain qualification mode and make Story Plan approval/Next-stage gating coherent | P0 | Implemented |
| `CINE-FIX-002` | Compile Scene Director and Story Plan visual authority into Storyboard image prompts | P0 | Implemented; live output pending |
| `CINE-FIX-003` | Constrain the Storyboard Shot inline result while preserving the full viewer | P1 | Implemented; populated visual pending |
| `CINE-FIX-004` | Enforce per-Shot emotion and configurable cinematic photographic realism | P0 | Implemented; live output pending |
| `CINE-FIX-005` | Preserve canonical Project status after Generate All and restore actor-scoped engine preference | P0 | Implemented; owner revalidation pending |
| `CINE-FIX-006` | Complete Character Look preparation in Cast and block new Story Plans without wardrobe authority | P0 | Implementation in progress |
| `CINE-FIX-007` | Replace referenced Cast safely and explain why direct removal is unavailable | P0 | Implemented, pending manual verification |
| `CINE-FIX-008` | Reconcile Story sources with an AI Director and gate Storyboard on film-ready story, script and continuity | P0 | Implemented; live provider film qualification pending |
| `CINE-FIX-009` | Reconcile Story Plan Shot timing with provider-supported video duration and migrate Omni to GA | P0 | Implemented; provider evidence gated |

## Closure gate

- The owning Requirement is updated when behavior changes.
- Adjacent working UI and manual authoring remain unchanged.
- Automated tests cover the reported failure and preserved behavior.
- Provider, Credit and reference authority remain behind canonical owners.
- Manual visual qualification records the resulting prompt and image Job IDs.
