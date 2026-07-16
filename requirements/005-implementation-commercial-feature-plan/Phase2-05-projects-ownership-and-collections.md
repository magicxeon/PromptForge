# Phase 2-05 Projects, Ownership and Collections

**Status:** Proposed - Awaiting Review

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
- Future: `product_review`, `storyboard`

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
- Existing unscoped history is migrated into a legacy Project per user.

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
- Every Collection belongs to exactly one Project.
- Fashion Project automatically creates expected default structures.
- Existing Collections migrate without membership loss.
- Archive is reversible; deletion follows retention policy.
- Project dashboard remains usable with large result counts through pagination.

