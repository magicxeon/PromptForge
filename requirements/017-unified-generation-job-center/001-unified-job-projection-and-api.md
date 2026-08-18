# 001 Unified Job Projection And API

## Objective

Expose one sanitized, actor-scoped projection of active and recent media work
without moving lifecycle ownership away from existing Generation services.

## API

`GET /api/generation/job-center?scope=all|active|recent&limit=1..50`

Response contains `items`, `activeCount`, `terminalCount`, and `polledAt`.
Each item contains stable navigation metadata only:

- `id`, `kind`, `mediaType`, `status`, `terminal`
- `createdAt`, `updatedAt`, `completedAt`
- `resultUrl`, `thumbnailUrl`, `detailHref`, `resumeHref`
- `providerId`, `modelId`, `billingStatus`, `estimatedCredits`
- group progress counts when applicable
- sanitized error code/message when terminal failure is safe to expose

## Source Mapping

- In-memory Image jobs: sanitized Queue snapshot.
- Durable Image groups: actor-scoped Generation Group records.
- Recent Image results: customer-visible History records.
- Durable Video work: public Video task projection.
- Comparison execution remains owned by Comparison. Its route pointer restores
  detailed UI; Job Center does not duplicate Comparison storage in MVP.

## Performance And Security

- Maximum 50 projected items per request.
- `Cache-Control: private, no-store`.
- No projection cache in MVP. App-shell polling is the load bound.
- Queue ownership uses canonical enqueue username; groups and Video use user ID;
  History uses the username compatibility boundary.
- Unknown and foreign records are omitted.

## Acceptance Criteria

- Mixed work sorts newest-first.
- `active` excludes terminal items; `recent` excludes active items.
- Child Image jobs represented by a group are not duplicated.
- Raw prompt and reference payloads never appear.

