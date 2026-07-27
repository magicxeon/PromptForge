# Character Profile Domain and Lifecycle

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Proposed

## 1. Business Requirement

An approved character must have a stable name, identity snapshot and canonical
references that can be reused across generations without depending on browser
state or a single history record.

## 2. Canonical Data Contract

```text
CharacterProfile
- id
- ownerUserId
- ownerUsernameSnapshot
- displayName
- slug
- shortDescription
- personalitySummary
- intendedUses: fashion | scene_story | general
- status: draft | export_pending | review | approved | archived | blocked
- visibility: private | unlisted | public
- reusePolicy: owner_only | view_only | public_reusable
- activeVersionId
- creatorProfileId?
- createdAt
- updatedAt
- version
```

```text
CharacterProfileVersion
- id
- characterProfileId
- versionNumber
- sourceMode: character-sheet
- structuredCharacterSnapshot
- sourceGenerationResultIds[]
- canonicalHeadshotAssetId?
- canonicalCharacterSheetAssetId?
- canonicalCastingExportAssetId?
- castingExportLayoutVersion
- castingUniformPolicyVersion
- providerModelSnapshot
- promptSnapshotHash
- consentDeclarationVersion?
- approvedAt?
- createdAt
```

```text
CharacterUsageEvent
- id
- characterProfileId
- characterProfileVersionId
- consumerUserId
- useCase: fashion | scene_story | general
- sourceType: fashion_blueprint | scene_builder | direct_generation
- sourceId
- generationJobId
- successfulOutputCount
- idempotencyKey
- createdAt
```

## 3. Lifecycle Rules

```text
draft -> export_pending -> review -> approved
review -> export_pending
approved -> archived
any non-archived -> blocked
```

- Only owner/admin policy can edit profile metadata.
- Only an approved version can be selected by another user.
- Editing identity/body snapshot creates a new version.
- Owner may edit `displayName`, `shortDescription`, `personalitySummary` and
  `intendedUses`.
- Profile metadata edits increment optimistic `version` but do not create a new
  visual CharacterProfileVersion unless identity/body/canonical assets change.
- Name/personality/description edits do not rewrite historical generation or
  handoff snapshots.
- New handoffs snapshot the current display name and personality so future
  generations can use the updated personality without changing old jobs.
- Archive blocks new selections but preserves historical jobs and usage.
- Blocked public profiles disappear from discovery immediately.

## 4. Inputs, Process and Outputs

Input:

- successful Character Sheet history result
- compatible structured attributes
- profile name and optional description/personality

Process:

1. Validate actor owns the source result.
2. Normalize compatible Character Sheet snapshot.
3. Strip Base64 and temporary/private transport data.
4. Create draft profile and version 1.
5. Require standardized export before public reusable status.

Output:

- owner-safe Character Profile detail
- immutable draft version
- next action: generate casting export

## 5. Repository and API Design

Files:

```text
server/domain/character-profiles/CharacterProfileService.js
server/domain/character-profiles/characterProfilePolicy.js
server/repositories/character-profiles/CharacterProfileRepository.js
server/repositories/character-profiles/CharacterProfileVersionRepository.js
server/repositories/character-profiles/CharacterUsageRepository.js
server/app/routes/characterProfileRoutes.js
client/character-profiles/characterProfileApi.js
client/character-profiles/characterProfileState.js
```

Endpoints:

```text
POST   /api/character-profiles
GET    /api/character-profiles
GET    /api/character-profiles/:id
PATCH  /api/character-profiles/:id
POST   /api/character-profiles/:id/archive
GET    /api/character-profiles/:id/versions
```

Repository interfaces must not expose JSON paths. Development JSON, future
PostgreSQL and test in-memory adapters must satisfy the same contract.

Editable metadata validation:

- owner only; admin moderation does not impersonate owner editing
- trim text and enforce configurable limits
- `displayName` required
- `personalitySummary` maximum 500 characters in MVP
- reject unsupported `intendedUses`
- public-profile edits refresh the sanitized Community projection
- use optimistic `version` to prevent one browser tab overwriting another

## 6. Impact

- History remains immutable and is referenced, not copied.
- Community character records become projections linked to profile/version IDs.
- Fashion Blueprint never reads raw Character Sheet form state directly.
- Migration schema must preserve profile/version/usage relationships.

## 7. Acceptance Tests

- Source result owned by another actor is rejected.
- A draft cannot be publicly reusable.
- Updating identity creates a new version.
- Archive prevents new handoffs but historical generation remains readable.
- Repeating create with the same idempotency key returns the same profile.
- Serialized records contain no embedded Base64.
- Owner can edit personality and the next handoff contains the updated snapshot.
- Existing generation lineage retains the personality snapshot used at that
  time.
- Non-owner metadata edit is rejected.
