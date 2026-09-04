# Canonical Cinematic Contract And Field Manifest

**Status:** Contract requirement; implementation pending  
**Owning capability:** Cinematic

## 1. Design Decision

Simple and Advanced modes persist the existing canonical Project, Story Plan,
Beat, Scene and Shot fields. Authoring metadata is additive and keyed by stable
field path. Existing primitive values are not replaced by wrapper objects.

Recommended additive shape:

```json
{
  "authoringContractVersion": "cinematic-authoring-v1",
  "authoringState": {
    "fieldStates": {
      "scene.storyChange": {
        "source": "user",
        "locked": true,
        "status": "current",
        "sourceRevision": "project-version:42"
      }
    }
  }
}
```

This shape preserves current readers while enabling provenance and targeted
staleness.

## 2. Field State Contract

Each tracked path supports:

| Field | Values | Rule |
|---|---|---|
| `source` | `user`, `ai`, `inherited`, `default`, `legacy_inferred` | Identifies value authority, not display mode |
| `locked` | boolean | AI apply cannot replace a locked value |
| `status` | `current`, `stale`, `missing`, `conflict` | Controls readiness and regeneration offer |
| `sourceRevision` | string or null | Version/fingerprint that produced the value |
| `recipe` | recipe ID/version/fingerprint or null | Required for AI-derived fields |
| `updatedAt` | timestamp | Audit and conflict explanation |
| `updatedByActorId` | actor ID or null | Present for user writes; actor access remains server-validated |

Raw prompt text, private references and provider responses must not be copied
into this metadata.

## 3. Field Manifest Configuration

Create a schema-validated server configuration owned by Cinematic, for example:

```text
server/config/cinematic/
  authoring-field-manifest.v1.json
  field-dependencies.v1.json
  readiness-policy.v1.json
```

Each manifest entry defines:

- canonical field path and owning entity;
- user-facing group and localization key;
- Simple, Advanced or system-only visibility;
- required, optional or derived status;
- allowed source authorities;
- validation and maximum length rule;
- upstream dependencies;
- downstream consumers;
- whether changing it invalidates a proposal, Storyboard source or video packet;
- whether AI may propose or apply it;
- fallback policy for legacy Projects.

Client code consumes a safe public projection of this manifest. The server
remains authoritative for validation and staleness.

## 4. Field Groups

### 4.1 Setup

User intent fields include format, platform, aspect ratio, target duration,
genre, audience feeling, pacing, ending intent, Story Brief, Creative Direction
and Character Role Slots.

These fields own global constraints. They must not be duplicated into every
Scene as independently editable values.

### 4.2 Cast

Cast authority includes stable Assignment ID, Role Slot ID, Character Profile
Version ID, story Character alias, performance dossier, approved Look Version
and rights/readiness state.

Display names and Look names are presentation only. Downstream linkage uses IDs.

### 4.3 Story Plan And Beat

Plan fields own objective, logline, emotional arc, dialogue/text policy and
global promise/payoff. A Beat owns one narrative change, cause, consequence,
emotional transition and target duration.

### 4.4 Scene

Simple Scene fields:

- title;
- location and time;
- visible story change;
- exit state;
- emotional end;
- participating Cast and selected approved Look;
- duration through its Shot list;
- optional additional direction.

Advanced or AI-derived Scene fields:

- dramatic purpose;
- entry state, objective and visible pressure;
- emotional start;
- blocking and screen direction;
- lighting and environment state;
- performance, dialogue and audio intent;
- prop and continuity state;
- transition intent.

Simple save may derive safe missing values but must never overwrite current
Advanced values.

### 4.5 Shot

Simple Shot fields:

- title;
- exact visible moment;
- one primary physical action;
- one visible emotional target;
- duration;
- Cast/Look selection inherited from Scene unless explicitly narrowed.

Advanced or AI-derived Shot fields:

- visual purpose;
- performance cue and gaze;
- framing, angle, movement and lens intent;
- blocking, lighting and environment;
- dialogue/audio cues;
- continuity entry/exit and transition;
- estimated action duration;
- still-frame position derived from video movement.

## 5. Dependency And Stale Rules

Minimum dependency rules:

| Changed authority | Mark stale | Preserve |
|---|---|---|
| Story Brief/Creative Direction | AI Plan proposal, derived Plan/Beat/Scene direction | Current approved version until user creates/applies a new draft |
| Role Slot | affected Cast recommendation and unapproved Scene casting | Unrelated Cast and Looks |
| Character replacement | affected Scene/Shot identity references and generated candidates | Story events, timing and other Characters |
| Approved Look binding | affected Scene/Shot Look references and generated candidates | Character identity and narrative structure |
| Beat visible change | dependent Scene purpose/change and Shot purpose | locked Scene/Shot fields |
| Scene story change/exit/emotion | dependent AI direction, Shot summary and keyframe contract | locked Advanced fields and approved source until save confirmation |
| Shot visible moment/action/emotion | keyframe contract and unapproved attempts | other Shots |
| Shot timing/order | continuity transition and video duration reconciliation | identity/Look authority |

Stale marking does not delete data. The UI presents `Review`, `Regenerate` or
`Keep current` depending on authority and downstream impact.

## 6. AI Apply Merge Rules

1. AI output is a proposal with field-level provenance.
2. Applying compares proposal source revision with current Project version.
3. Locked fields retain their current values.
4. Current user fields are not overwritten without an explicit selected diff.
5. Missing or stale unlocked AI/default fields may be selected by default.
6. Apply writes through the canonical Cinematic Project mutation.
7. Version conflict keeps the proposal available and refreshes the comparison.
8. Apply returns updated Project version plus a list of applied, skipped,
   stale and conflicting paths.

## 7. Legacy Compatibility

For Projects without authoring metadata:

- populated manually saved fields infer `legacy_inferred/current`;
- generated Plan provenance may infer `ai/current` when recipe evidence exists;
- absent optional fields remain `missing` without schema failure;
- approved Story Plans and media remain valid;
- metadata is persisted only on the next normal owning mutation;
- migration must be idempotent and must not regenerate content.

## 8. Acceptance Criteria

- Simple and Advanced read and write one canonical data shape.
- Switching mode does not mutate Project data.
- Every AI-filled field records recipe provenance.
- A user lock survives regeneration and mode switching.
- An upstream edit marks only configured dependents stale.
- Legacy Projects parse and retain approval/media lineage.
- Field manifest and dependency configuration fail startup validation when a
  path, owner, visibility, dependency or consumer is invalid.

