# Capability Entry-Point Inventory - 2026-08-04

## Implemented Boundary

| Workflow | HTTP/product owner | Canonical entry point | Internal collaborators |
|---|---|---|---|
| Credit estimate, reserve, capture, refund, account, ledger and support adjustment | Credits | `server/domain/credits/CreditApplicationService.js` | Focused Credit services and Credit repositories |
| Standard Generation preview and submission | Generation | `server/domain/generation/GenerationApplicationService.js` | Prompt compiler, Reference Processing, Credits and Queue Manager |
| Comparison slot generation | Comparisons entering Generation | `ComparisonOrchestrator -> GenerationApplicationService.submitPreparedOperation` | Comparison repository and validator |
| Fashion operation dispatch | Fashion Blueprint entering Generation | `FashionRunService -> GenerationApplicationService.enqueueReservedOperation` | Fashion plan/prompt strategy and reserved Credit plan |
| Template Pose Proxy dispatch | Template Pose Proxy entering Generation | `GenerativePoseProxyProcessor -> GenerationApplicationService.enqueueReservedOperation` | Pose Proxy repository and lifecycle service |
| Provider execution and terminal Credit lifecycle | Generation | `QueueManager` | Provider registry, output/history repositories and Credit facade |

## Enforced Rules

- Generation and Credit HTTP routes delegate to application facades.
- Comparison, Fashion and Pose Proxy cannot call `QueueManager.enqueue` directly.
- Foreign workflows do not import `CreditReservationService` directly.
- Successfully queued Comparison slots retain their own terminal capture/refund
  lifecycle when a later slot fails to enqueue.
- Architecture characterization is covered by
  `test/capabilityApplicationBoundaries.test.js`.

## Deferred Consolidation

The following remain incremental work and are not represented as completed:

- durable Identity/Account facade and public Creator projection boundary;
- Character Profile lifecycle facade;
- Community publication facade;
- typed client workflow hooks for the largest Studio and Fashion route
  orchestrators;
- repository import enforcement beyond the high-risk Generation/Credit paths.

These capabilities must follow Requirement 016 when materially changed.
