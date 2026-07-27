# Fashion and Scene Character Handoff

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Proposed

## 1. Business Requirement

A Character selected from its profile or a picker must enter Fashion Blueprint
or Scene Builder without re-uploading images or copying prompts.

## 2. Handoff Contract

```text
CharacterDestinationHandoff
- handoffVersion
- destination: fashion_blueprint | scene_builder
- characterProfileId
- characterProfileVersionId
- characterReferenceAssetId
- displayName
- personalitySummarySnapshot
- intendedUsesSnapshot[]
- compatibleAttributeSnapshot
- attribution
- sourceOwnerUserId
- reusePolicy
- createdAt
```

Destination-specific behavior:

- Fashion Blueprint locks identity/body from Character and leaves garment, pose
  variation and environment under Blueprint ownership.
- Scene Builder maps the asset to `character_reference` and leaves expression,
  pose and environment variable according to the active template.

## 3. Client Flow

```text
Character card/profile
-> show current reuse status and destination compatibility
-> request authorized handoff
-> store actor-scoped short-lived handoff
-> router navigates to destination
-> destination hydrates Character selection
-> show source summary and clear/replace action
```

Reuse:

- `client/core/crossModeHandoff.js`
- `client/scene-builder/sceneTemplateHydrator.js`
- `client/scene-builder/sceneReplacementChecklist.js`
- `client/core/referenceManager.js`
- `window.ModelPromptForgeRouter`

Extend these contracts; do not place destination form mutations in Community
cards.

## 4. Server Flow

1. Resolve Character/Profile/version.
2. Authorize visibility and reuse policy.
3. Resolve canonical casting asset.
4. Build sanitized handoff.
5. Record selection intent only; record usage after successful generation.

Picker behavior:

- reusable Character shows a selectable check/Character icon and enabled
  `Select Character` action
- view-only/owner-only Character explains why it cannot be selected
- destination-incompatible Character is disabled with a separate compatibility
  reason, not mislabeled as an ownership restriction
- owner may select their own approved Character even when public reuse is off,
  subject to profile status and destination compatibility
- policy and compatibility are returned by server; the picker does not infer
  authorization from icon state

Endpoint:

```text
POST /api/community/characters/:id/handoffs
body: { destination }
```

## 5. Conflict Ownership

| Field | Character owns | Destination may change |
|---|---|---|
| identity/face/body | yes | no, unless Character removed |
| stable hair | yes | controlled override only if supported |
| casting white outfit | no | never carried as final Fashion garment |
| Fashion outfit | no | Fashion Blueprint |
| expression | no | Scene/Blueprint control |
| pose | no | Scene/Blueprint control |
| environment | no | Scene/Blueprint/template |

The casting outfit proves silhouette; it must not leak into final Fashion output
when an outfit reference is supplied.

## 6. Acceptance Tests

- Fashion receives canonical Character reference and not the white outfit as the
  requested garment.
- Scene Builder receives `character_reference`, not `face_reference`.
- Removing Character clears only Character-owned fields.
- Expired/unpublished handoff fails with a recoverable message.
- Switching mock actors does not leak pending handoff.
- Successful destination generation writes one usage event.
- Picker communicates reusable/view-only/owner-only state before selection.
- Personality snapshot used by a confirmed run remains stable after owner edits
  the profile.
