# Phase 2-05 Projects, Ownership and Collections

**Status:** Local Collections and actor ownership exist; Project aggregate and production persistence pending

## Current Baseline (2026-09-07)

This phase's new Project is a commercial workspace, not the existing
`server/domain/cinematic/` Project aggregate. Preserve Cinematic IDs, Cast,
Storyboard and approved media. Any workspace link needs a separate reviewed
mapping. Reuse current Collections and their owner-scoped repository instead
of creating a commercial-only copy. Standalone Playground/Studio work must not
suddenly require a new Project selector.

## 1. Business Requirement

`Project` is the commercial workspace. It owns Products, Assets, Model Profiles, Consistency Profiles, Batches and Collections. Collection remains a flexible grouping of outputs inside a Project.

## 2. Domain Model

```text
User 1--* Project
Project 1--* Collection
Project 1--* ProductItem
Project 1--* Asset
Project 1--* Batch
Collection *--* GenerationResult
```

Initial Project types:

- `fashion_selling`
- `advanced_custom`
- Future commercial workspace integration: `product_review`, Cinematic Project links

Project state:

```text
draft -> active -> archived -> scheduled_for_deletion -> deleted
```

## 3. Collection Policy

- Create one default Collection per Product Item for Fashion workflow.
- Allow custom Collections such as Approved, Social Outputs and Campaign Cover.
- A result may belong to multiple Collections in the same Project.
- Cross-Project membership is prohibited.
- Cover image must belong to the Project and remain accessible.
- Deleting a Collection never deletes source generation results automatically.

## 4. Ownership and Future Teams

- MVP has one owner.
- `project_members` supports later roles without exposing team UI initially.
- All child records inherit the Project authorization boundary.
- Ownership transfer is out of MVP and must not be simulated by changing `ownerUserId` directly.

## 5. UX

- Solution Home creates or resumes Projects.
- Project dashboard shows products, active batches, approved outputs and credit summary.
- Advanced Studio can open within a Project context.
- Existing unscoped history uses a deterministic private Project mapping only
  after Product approval; never infer cross-user membership or rewrite source IDs.

## 6. Service/API Requirements

- Create/list/read/update/archive Project
- Create/list/update/delete Collection
- Add/remove Collection membership idempotently
- Set default Collection and cover
- Enforce optimistic concurrency or version checks on conflicting edits
- Pagination for Project and Collection results

## 7. Audit Events

- Project created/archived
- Collection created/deleted
- Default/cover changed
- Product/result membership changed
- Administrative access or mutation

## 8. Acceptance Criteria

- A user cannot read or mutate another user's Project.
- Every migrated commercial Collection belongs to exactly one Project under
  the approved mapping. Define links in Wave 2, migrate Collection sources in
  Wave 6; preserve local standalone Collections until that cutover.
- Fashion Project automatically creates expected default structures.
- Existing Collections migrate without membership loss.
- Archive is reversible; deletion follows retention policy.
- Project dashboard remains usable with large result counts through pagination.
