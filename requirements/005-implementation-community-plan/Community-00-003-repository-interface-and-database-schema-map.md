# Community-00-003 Repository Interface and Database Schema Map

**Status:** Proposed - Awaiting Review  
**Feature type:** JSON-to-database migration contract  
**Depends on:** Actor Context, existing JSON repositories  
**Created:** 2026-07-19

## 1. Business Requirement

The current project stores many records in JSON files. This is acceptable for prototype speed, but Community and payment features require relational data. We need database-ready repository interfaces now so migration does not force a rewrite.

## 2. System Design

### 2.1 Repository Interface Standard

Each repository should expose stable methods:

```text
create(record, actorContext)
findById(id, options)
findByOwner(ownerUserId, query)
listPublic(query, viewerContext)
updateById(id, patch, actorContext)
softDelete(id, actorContext)
appendEvent(event, actorContext)
```

Rules:

- Repositories do storage only.
- Authorization belongs in policy/service layer.
- JSON repositories and database repositories must share method names.
- No route should read/write JSON directly.

### 2.2 Common Record Fields

Every persistent domain record should include:

```text
id
schemaVersion
ownerUserId
visibility
status
createdAt
updatedAt
deletedAt
metadata
```

Where not applicable, document why.

### 2.3 Database Schema Map

### users

```text
id
username
displayName
role
status
createdAt
updatedAt
```

### creator_profiles

```text
id
userId
handle
displayName
bio
avatarAssetId
followerCount
publicPostCount
status
createdAt
updatedAt
```

### assets

```text
id
ownerUserId
assetType: generated_image | reference_image | thumbnail | source_upload
storageProvider: local | r2
storageKey
publicUrl
thumbnailUrl
mimeType
sizeBytes
width
height
visibility
status
createdAt
updatedAt
```

### generation_results

```text
id
ownerUserId
jobId
mode
promptSnapshot
sceneTemplateSnapshotId
imageAssetId
thumbnailAssetId
providerId
modelId
generationSettings
creditCostSnapshot
createdAt
updatedAt
```

### scene_template_snapshots

```text
id
ownerUserId
sourceGenerationResultId
authoringMode
finalPromptSnapshot
structuredSelectionsSnapshot
manualPromptText
replaceableVariables
referenceSlotMapping
providerModelSnapshot
generationSettingsSnapshot
visibility
createdAt
```

### community_posts

```text
id
ownerUserId
creatorProfileId
sourceGenerationResultId
title
description
imageAssetId
thumbnailAssetId
officialTags
customTags
promptVisibility
sharedPromptSnapshot
sceneTemplateSnapshotId
workflowSnapshot
visibility
status
counts
createdAt
updatedAt
```

### community_gallery_items

```text
id
ownerUserId
creatorProfileId
sourceGenerationResultId
imageAssetId
title
description
visibility
reusePolicy
sceneBuilderHandoffSnapshot
createdAt
updatedAt
```

### community_character_assets

```text
id
ownerUserId
creatorProfileId
displayName
description
characterType
previewImageAssetId
faceReferencePolicy
outfitReferencePolicy
sceneBuilderHandoffSnapshot
visibility
reusePolicy
createdAt
updatedAt
```

### credit_ledger_entries

```text
id
userId
operationType
amountCredits
balanceAfter
relatedJobId
relatedTemplateId
providerId
modelId
pricingPolicyVersion
reason
createdAt
```

### audit_events

```text
id
actorUserId
actorRole
action
targetType
targetId
reason
beforeSnapshot
afterSnapshot
requestId
createdAt
```

## 3. Software Development Specification

The repository layer must isolate current JSON storage from future database storage.

```text
Route -> Service -> Policy -> Repository Interface -> JSON or PostgreSQL implementation
```

Routes must not import JSON files directly.

## 4. Implementation Plan

### User Review Required

- This phase does not require immediate PostgreSQL migration.
- All new JSON storage must follow the schema map and repository interface.
- Existing legacy JSON can be wrapped gradually.

### Proposed Files

```text
server/repositories/BaseJsonRepository.js
server/repositories/repositoryContracts.js
server/repositories/schemaVersioning.js
server/community/CommunityPostRepository.js
server/community/CommunityGalleryRepository.js
server/community/CommunityCharacterRepository.js
server/credits/CreditLedgerRepository.js
server/audit/AuditLogRepository.js
```

## 5. Testing

- Repository create/list/update methods work against temporary JSON files.
- Records receive stable IDs and timestamps.
- Repository methods do not require route-specific request objects.
- JSON repositories can be swapped with in-memory repositories for tests.
