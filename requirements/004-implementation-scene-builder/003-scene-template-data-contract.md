# Scene-003 Scene Template Data Contract

**Status:** Proposed - Awaiting Review  
**Feature type:** Template schema and snapshot contract  
**Depends on:** Community-04 in requirements/005-implementation-community-plan, generation history, prompt compiler  
**Created:** 2026-07-18

## 1. Objective

Define a Scene Template contract that can be stored, shared, remixed and later monetized.

## 2. Core Schema

```text
SceneTemplate
- id
- ownerUserId
- sourceGenerationResultId
- title
- description
- version
- authoringMode
- status
- visibility
- promptVisibility
- finalPromptSnapshot
- structuredSelectionsSnapshot
- manualPromptSnapshot
- referenceSlotMapping
- replaceableVariables
- providerModelSnapshot
- generationSettingsSnapshot
- taxonomyTags
- safetyStatus
- createdAt
- updatedAt
```

## 3. Authoring Mode

```text
guided
manual
hybrid_later
```

MVP supports `guided` and `manual`.

## 4. Snapshot Rules

Published template snapshots are immutable.

Edits should create:

- Draft update before publish.
- New revision after publish.

MVP may store a single published snapshot but should not mutate it silently.

## 5. Relationship To Community Post

A Community Post can reference a Scene Template.

```text
CommunityPost.sharedPromptSnapshot
CommunityPost.workflowSnapshot.sceneTemplateId
CommunityPost.workflowSnapshot.sceneTemplateSnapshot
```

If the post is `Remix Only`, users can use the template without seeing all text.

## 6. Provider Snapshot

Store display-safe provider/model metadata:

- Provider id and display name.
- Model id and display name.
- Resolution/aspect ratio.
- Reference support summary.
- Estimated credit cost at generation time.

Do not store API keys or raw provider payloads.

## 7. Acceptance Criteria

- Generated Scene Builder output can produce a template snapshot.
- Template snapshot can be serialized as JSON.
- Snapshot can prefill Scene Builder later.
- Public APIs do not expose private provider payloads or private asset URLs.

## 8. Software Development Specification

### 8.1 Snapshot Builder

Add a pure serializer function:

```text
createSceneTemplateSnapshot(input) -> SceneTemplateSnapshot
```

Input:

- `mode`
- `authoringMode`
- `selections`
- `manualPromptText`
- `finalPrompt`
- `imageReferences`
- `referenceSlotMapping`
- `provider`
- `submodel`
- `generationSettings`

Output:

- Versioned immutable snapshot object.

### 8.2 Hydrator

Add a pure hydrator function:

```text
hydrateSceneTemplate(snapshot, replacementValues) -> StudioStatePatch
```

It must map valid fields back into current Studio schema and return warnings for stale fields.

### 8.3 Server Contract

History entries generated from Scene Builder should be able to store:

```text
sceneTemplateSnapshot
sceneTemplateId
sceneTemplateVersion
```

## 9. Implementation Concerns

- Do not store raw provider request payloads.
- Do not use translated labels as canonical field names.
- Published snapshots must be immutable.
- Snapshot size can grow quickly if full base64 images are embedded; store asset IDs or replacement policies instead.
- Old snapshots must degrade gracefully when fields/options are removed.

## 10. Functional Technical Specification

### 10.1 Client Files

```text
client/scene-builder/sceneTemplateSerializer.js
client/scene-builder/sceneTemplateHydrator.js
client/scene-builder/sceneTemplateValidation.js
client/scene-builder/sceneTemplateVersioning.js
```

### 10.2 Server Files

```text
server/sceneTemplates/sceneTemplateSnapshot.js
server/sceneTemplates/SceneTemplateValidator.js
server/sceneTemplates/sceneTemplateVersioning.js
```

### 10.3 Required Functions

```text
createSceneTemplateSnapshot(context) -> SceneTemplateSnapshot
validateSceneTemplateSnapshot(snapshot) -> ValidationResult
sanitizeSceneTemplateSnapshot(snapshot, visibilityPolicy) -> PublicSceneTemplateSnapshot
hydrateSceneTemplate(snapshot, replacements) -> StudioStatePatch
migrateSceneTemplateSnapshot(snapshot) -> SceneTemplateSnapshot
getSceneTemplateVersion() -> number
```

### 10.4 Snapshot Minimum Fields

```text
sceneTemplateVersion
authoringMode
finalPromptSnapshot
structuredSelectionsSnapshot
manualPromptSnapshot
referenceSlotMapping
replaceableVariables
providerModelSnapshot
generationSettingsSnapshot
visibilityPolicySnapshot
createdFromGenerationId
```

### 10.5 Concerns For Implementing Agents

- Keep serializer and hydrator pure.
- Never include private base64 images inside a public snapshot.
- Keep `structuredSelectionsSnapshot` keyed by canonical field name and option id.
