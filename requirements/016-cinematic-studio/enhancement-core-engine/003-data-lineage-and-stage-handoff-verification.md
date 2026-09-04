# Data Lineage And Stage Handoff Verification

**Status:** Required implementation audit contract  
**Purpose:** Verify data inside each stage and at every boundary before work may continue downstream

## 1. Required Artifact

Implement one read-only Cinematic lineage projection exposed through the
Cinematic application facade. It accepts an authorized Project ID and optional
Scene/Shot scope and returns IDs, versions, fingerprints, readiness findings and
source paths. It must not expose raw provider responses, private Base64 data or
another actor's assets.

Suggested internal owner:

```text
server/domain/cinematic/CinematicDataLineageService.js
```

The first implementation may be server/test-only. A compact user-facing
readiness summary can consume its sanitized findings later.

## 2. Report Shape

```text
project
setup
storyRoles[]
castAssignments[]
lookBindings[]
storyPlan
beats[]
scenes[]
shots[]
storyboardContracts[]
approvedStoryboardSources[]
videoPackets[]
approvedVideoSources[]
timelineEntries[]
exports[]
findings[]
```

Every node reports:

- stable ID and version;
- active/approved/current status;
- owning source ID;
- consumer IDs;
- field or source fingerprint where available;
- missing, stale, duplicate, inactive and conflict findings;
- recovery path to the smallest owning stage.

## 3. Within-Stage Verification

### 3.1 Setup

Verify:

- active Story Source Version exists;
- accepted Story Brief or Creative Direction is non-empty;
- format, aspect ratio and target duration are valid;
- Role Slot IDs are stable and unique;
- required roles have meaningful labels and story functions;
- global constraints do not contradict each other;
- Setup version matches the Project version used for downstream generation.

### 3.2 Cast And Wardrobe

Verify:

- every required Role Slot has one active Assignment;
- one Assignment is not duplicated for the same Role Slot;
- Character Profile and pinned Version exist and are actor-authorized;
- identity readiness and rights state permit the requested operation;
- each required Assignment has one approved bound Look Version;
- unapproved Look preparations do not appear as Scene authority;
- display name and story alias are separated from stable IDs;
- replacement preserves Assignment identity where required by the Story Plan.

### 3.3 Story Plan And Beats

Verify:

- active Story Plan Version references the current Story Source Version;
- approved/draft/superseded status is coherent;
- objective, logline and emotional arc are present;
- every Scene belongs to one Beat;
- every Beat has one visible change, cause, consequence and reconciled duration;
- Beat Scene IDs resolve and contain no duplicates;
- Plan Scene IDs resolve to current Project Scenes;
- Character aliases resolve to active Assignments;
- total planned duration matches Project target within policy tolerance.

### 3.4 Scene Director

Verify:

- Simple required fields are complete;
- Advanced missing fields are either optional or have a valid derived source;
- participating Cast IDs are active and selected Looks belong to those Cast IDs;
- one Look per participating Character is selected unless an explicit change is
  modeled;
- entry and exit state form an observable change;
- emotional start/end align with the owning Beat;
- location, time, weather, surfaces and lighting are physically coherent;
- Scene duration equals ordered Shot duration;
- field-state paths resolve to actual Scene fields.

### 3.5 Shots

Verify:

- Shot IDs and order are stable and unique;
- each Shot has one visible moment, primary action and emotional target;
- Cast and Look IDs are a valid subset of Scene authority;
- action duration fits Shot duration;
- framing and still-frame position do not request multiple cuts in one still;
- continuity exit of Shot N can feed continuity entry of Shot N+1;
- dialogue/audio cues remain within owning duration or declare carry-over;
- current-state props, light and emotion do not leak future events.

### 3.6 Storyboard

Verify:

- keyframe contract was compiled from current Project/Plan/Scene/Shot versions;
- compiler recipe and contract fingerprints are present;
- resolved Character and Look references match the selected IDs;
- provider/model supports submitted reference roles and aspect ratio;
- displayed quote matches submitted provider, model, dimensions, count and
  references;
- manual and batch contract fingerprints match for the same Shot version;
- approved source fingerprint matches the Shot contract it approves;
- previous-frame continuity source is selected by policy and remains authorized.

### 3.7 Produce/Video Handoff

Verify:

- every video-eligible Shot has an approved Storyboard source or documented
  provider-supported alternative;
- Scene and Shot durations reconcile with selected provider capabilities;
- first/last/reference-frame strategy is explicit;
- motion, camera, performance and audio intent come from current Shot authority;
- identity, Look and continuity references remain authorized;
- packet fingerprint identifies the owning Shot and Storyboard source;
- provider submission, Credits and Queue remain behind their canonical owners.

### 3.8 Finish, Timeline And Export

Verify:

- each timeline entry resolves to one current Scene and Shot;
- timeline order follows the approved Shot order unless an explicit Finish edit
  owns the override;
- every required entry has a current approved video source and source
  fingerprint;
- trim in/out remain inside the approved source duration;
- transition duration does not create negative or overlapping playable time;
- total assembled duration is reported against the Project target duration;
- export eligibility is false when any required source is missing or stale;
- export request records Project, timeline, approved source, Asset, operation
  and lifecycle correlation IDs;
- Finish does not invent a fixed Credit amount and delegates any future quote,
  reservation and settlement to Credits;
- completed Project/export status cannot be reached from a qualification-only
  placeholder operation.

## 4. Between-Stage Handoff Matrix

| From | To | Required linkage | Blocking findings |
|---|---|---|---|
| Setup | Cast | Story Source Version, Role Slot IDs, Character count/importance | missing/duplicate Role Slot, stale Story source |
| Cast | Story Plan | Assignment IDs, story aliases, dossiers, pinned Character and bound Look Versions | inactive Assignment, identity/rights/Look not ready |
| Story Plan | Scene Director | Plan Version, Beat ID, Scene ID, Scene Cast/Look IDs, duration allocation | orphan Scene, unresolved Beat, stale Plan draft |
| Scene Director | Shot skeleton | Scene Version, Cast/Look subset, entry/exit/emotion/timing authority | invalid subset, no visible change, timing mismatch |
| Shot | Storyboard compiler | Project/Plan/Beat/Scene/Shot versions, current-state authority, references | stale field, multi-action, missing reference |
| Compiler | Generation | immutable contract fingerprint, provider-independent references and output intent | quote/request mismatch, unsupported reference/ratio |
| Generation | Storyboard approval | Job/output/Asset lineage and source fingerprint | output owner mismatch, stale Shot version |
| Approved Storyboard | Produce | approved source, Shot motion/audio/timing and continuity authority | unsupported duration, stale approved source, missing packet authority |
| Produce | Finish | approved current video source per Shot, duration, source fingerprint and timeline order | missing/stale video source, invalid trim/transition |
| Finish | Export/Asset | immutable timeline fingerprint, current source Assets, output settings and lifecycle correlation | incomplete timeline, unauthorized source, unqualified export |

## 5. Field-Level Consumer Matrix

| Source field group | Story Plan | Storyboard still | Video | Audio |
|---|---:|---:|---:|---:|
| Setup story intent/genre/audience | context | restrained global context | global direction | tone only |
| Setup format/aspect/duration | plan timing | output format | provider qualification | timeline |
| Cast identity/Profile Version | role authority | identity reference | identity reference | speaker identity label |
| Cast performance dossier | Scene proposal | observable performance | temporal performance | delivery guidance |
| Approved Look Version | Scene selection | wardrobe reference | wardrobe continuity | no |
| Beat visible change/emotion | Scene narrowing | narrative context only | sequence arc | pacing context |
| Scene state/blocking/light | Shot defaults | composition authority | spatial/light continuity | ambience context |
| Shot visible moment/action/emotion | Shot authority | highest narrative authority | motion action | cue synchronization |
| Shot camera movement | seed only | translated to still position | temporal camera authority | no |
| Shot dialogue/audio cues | script preview | excluded unless visibly relevant | dialogue/performance packet | primary authority |

## 6. Finding Contract

Each finding must include:

```text
code
severity: info | warning | blocking
stage
entityType and entityId
fieldPath
sourceId/sourceVersion
consumerId/consumerVersion
summaryKey
recoveryStage and recoveryTargetId
```

User-facing text is localized on the client from stable summary keys.

## 7. Automated Verification Requirements

- Unit fixtures cover every stage in isolation.
- One complete single-Character Project passes every handoff.
- One multi-Character Project proves per-Character Look authority.
- One legacy Project produces compatibility findings without parse failure.
- One stale Story Source, Character replacement, Look change and Shot edit each
  invalidate only their configured dependents.
- One approved Storyboard source remains valid across unrelated edits.
- One approved video source remains current in Finish across unrelated edits.
- One changed Shot invalidates only its affected timeline entry and export
  eligibility.
- Unauthorized actor reads return no lineage data.
- Report generation performs no writes and is deterministic for one Project
  version.

## 8. Implementation Checkpoint Use

Every checkpoint in `007-step-by-step-implementation-plan.md` updates this file's
traceability tests. A checkpoint cannot close when it adds a field or handoff
without adding its source, consumer, stale rule and recovery finding here.
