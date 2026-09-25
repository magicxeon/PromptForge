# 002 - Project Contracts And Configuration

Status: planned. Capability owner: Cinematic. Dependencies: P00 baseline.
Parent: [delivery master](000-master.md). Tasks: P01 in [007](007-step-by-step-implementation-plan.md).

## 1. Hierarchy And Compatibility

The user sees one Project containing optional Seasons and one or more Chapters.
Movie and Mini Series share the same hierarchy. A Scene belongs to one Chapter;
a Shot belongs to one Scene. Chapter/Scene/Shot IDs are durable; display numbers
are derived from explicit order, never used as identity. Season is nullable.

Current code stores Chapters as `projects[]` and grouping in `series[]`, through
`CinematicProjectRepository` and `CinematicSeriesService`. Do not rename this whole
storage graph or copy media just to match labels.

Initial implementation strategy:

1. Extend the current Series aggregate as the persisted production Project root.
   Add format, settings, production bible, text dossiers, story revisions and
   root-level asset bindings through Cinematic's repository contract.
2. Existing Cinematic Project records remain internal Chapter production units.
   They continue to own their Scenes, Shots, attempts and historical receipts.
   One root controls their membership, order and optional Season.
3. Public workspace DTOs distinguish `productionProjectId`, `chapterId` and the
   internal `productionUnitId`. UI and routes never guess which ID a command needs.
4. Map an existing Series to one root with its current ID and memberships. Project
   assets become shared bindings with explicit Chapter/Scene/Shot overrides.
5. A standalone legacy Project reads as one Chapter before any migration. On an
   explicit upgrade, atomically create its root and membership, keep the old
   Project ID as productionUnitId and persist an old-route-to-root mapping. Do
   not perform this mutation in a GET or silently merge independent Projects.
6. New Projects create a root and Chapter 1 in one repository operation. Enabling
   Seasons groups existing Chapters; disabling the Season UI does not delete data.

This is one product hierarchy over existing storage owners, not separate user
Projects per Chapter and not a second implementation of Shot production.

## 2. Proposed Additive Contracts

The names below describe planned DTO fields, not existing runtime fields.

| Record/projection | Minimum fields | Invariants |
|---|---|---|
| Production Project | id, ownerUserId, version, format, settings, bibleVersion, characterDossiers, seasons, chapter summaries | One actor owner; nullable Season membership; bounded summaries |
| Chapter summary | id, productionUnitId, seasonId, order, title, durationTargetMs, storyStatus, counts | No embedded full Shot/Take histories |
| Full Story revision | id, sourceRevisionId, createdAt, source, chapter prose/order, dossier version references | Saved source is explicit; restore creates a new head |
| Scene | existing fields plus environment binding/state, purpose, dialogue target/override | Location/time continuity owns boundary |
| Shot | existing fields plus `shotDocument`, document version, resolved role bindings and preparation projection | One canonical authoring document; one clip; multiple immutable attempts |
| Preparation projection | sourceVersions, policyVersion, mode, orderedReferences, promptBudget, warnings, blockers | Derived and bounded; never a second durable Shot truth |

Root/Chapter commands accept expected versions. A stale edit returns a conflict
with current version metadata; it never overwrites another tab. Apply affecting
multiple records is atomic within the current JSON repository transaction.
Persist saved authoring content, not duplicate compiled prompts or Base64 media.
For new Shot authoring, `shotDocument` is that content. Legacy attribute fields are
read only during migration/compatibility and must not become a second editable truth.

## 3. Canonical Owners And Entry Points

| Concern | Reuse/extend owner | Boundary |
|---|---|---|
| Project/Chapter/Scene/Shot commands | `server/domain/cinematic/CinematicApplicationService.js` | Sole Cinematic use-case facade |
| Hierarchy membership | `CinematicSeriesService.js`, `server/repositories/cinematic/CinematicProjectRepository.js` | Focused internal rules and one atomic store |
| Story AI | `server/domain/generation/CinematicStoryEnhancementService.js`, `CinematicStoryPlanService.js`, `CinematicTextProviderRouter.js` | Existing Generation entry and versioned recipes |
| Render/authority | `CinematicStoryboardPromptComposer.js`, `StoryboardKeyframeContractCompiler.js`, `CinematicVideoPacketCompiler.js` | Single compilers, no React-built final prompt |
| References | `server/domain/reference-processing/ReferenceProcessingService.js`, `ReferenceAuthorityPlanner.js` | Order, role, capacity and final count parity |
| Asset derivatives | Existing Assets services/repository | Immutable originals, hash/lineage, private authorization |
| Generate/quote/recovery | Existing Generation and Credits facades | No new queue, credit ledger or polling owner |
| API transport | `server/app/routes/cinematicRoutes.js`, `web/src/features/cinematic/api/` | HTTP translation; Zod at every response boundary |
| UI state | Cinematic route, TanStack Query, actor-scoped draft storage | Shared controlled components receive callbacks |

## 4. API Use Cases And Bounded Reads

Extend the existing Cinematic facade/routes for:

- Read production root summary and paged Chapter list; read one Chapter's Scenes.
- Add/reorder/update Chapter or optional Season with version checks.
- Save dossier; request scoped story/scene/shot proposal; apply proposal explicitly.
- Save/restore Full Story revision with retained production lineage.
- Read/filter Project Asset bindings by category, Character, environment and Chapter.
- Prepare one Shot; reuse existing image/video quotes and submissions.
- Read selected Takes for one Chapter and invoke existing export entry points.

Before implementing each endpoint, search current API methods for the same use
case. Add a method only where the existing public contract cannot express it.
Private read schemas omit raw technical prompts for non-admin/support actors.

List contract: cursor, pageSize, filters, items, nextCursor, summary counts.
Proposed defaults: 24 Chapter summaries/page, 12 Assets/page (maximum 24),
20 Takes/page. Load detail for one active Chapter/Shot; no eager all-film media.
Retain existing larger-project limits until explicit migration policy replaces
them; provider input capacity is never inferred from a UI page size.

## 5. Configuration Ownership

Reuse existing validated loaders and public authoring manifest. Add cohesive JSON
policy only where no current file owns the values. Planned new files are under
`server/config/cinematic/`, not React-local lookup tables.

| Policy | Location | Planned values and behavior |
|---|---|---|
| Authoring choices | existing `story-authoring.v1.json` | Existing genre/feeling/pacing/country; add period IDs and optional setting fields |
| Text AI | existing `text-model-policy.v1.json` and prompt recipes | Reuse configured model defaults, timeout and structured outputs; no model literal in UI |
| Workflow defaults | `workflow-policy.v1.json` | New Project defaults to Mini Series; defaultChapterCount=1, defaultChapterDurationSeconds=60; configured creation durations 20/30/45/60/90/120 seconds; recommendFirstFrame=true; audio default=true where supported |
| Shot document authoring | planned `shot-document-policy.v1.json` or cohesive workflow-policy section | starter template, section aliases, timeline marker syntax, autosave delay and parser policy; no provider prices or limits |
| Story revisions | workflow policy | `storyRevisionHistoryLimit=10`, bounded 1-100; scope Full Story only |
| Dialogue | existing `dialogue-timing.v1.json` plus workflow policy | target=0.60; exempt purpose IDs; estimated timing remains advisory |
| Asset authoring | planned `production-assets.v1.json` | 3x4 expression slot IDs/crop gutters, environment view IDs, optional view generation, reference-role priorities |
| Render/prompt | existing still/video/keyframe policies and provider strategies | natural/faceless/white-previs options; prompt budget owner unchanged |
| Provider capability | existing server catalogs and generated-reference policy | Actual model support/count/transport; do not duplicate or hard-code limits |
| Exposure/rollback | environment through validated server config | Proposed `CINEMATIC_REWAMP_ENABLED=false` until gate passes; safe public projection |

The 60-second Chapter default is a planning seed, not a locked duration or promised
single video duration. New Project allows a target of up to 120 seconds per Chapter.
User/provider-compatible Shot and Take durations remain separately reconciled.

Configuration precedence: explicit saved Shot override > Scene > Chapter > Project
> production profile > server default, only for fields defined as inheritable.
Provider hard limits and authorization always constrain the result. An absent
override differs from false, zero or an intentionally empty optional field.

Validate enum uniqueness, numeric bounds, role priority, slot completeness and
profile references at startup. Invalid configuration yields a specific startup
error, not silent fallback. Changes apply after restart; version/hash invalidates
derived preparation/quotes. Existing saved choices and immutable receipts are not
rewritten. New labels require locale keys, not prompt text in translation files.

## 6. State, Performance And Migration

Query keys include actor, root, Chapter and selected entity/version as relevant.
Public immutable authoring configuration may use the existing shared manifest key.
Invalidate affected summaries/detail on mutations; reuse existing Generation status
and header Job Center. Never create polling per collapsed Shot.

Asset gallery retains at most five pages using the existing owner pattern. Proposed
workspace summaries use 20s stale time, 60s unused GC, no interval polling. Reuse
existing timing where a matching query already exists; record measured payload,
request count and interaction latency before changing it.

Dry-run migration lists roots, memberships, unresolved owners and conflicting IDs.
Apply is atomic, rerunnable and records an ID map without moving original bytes.
Snapshot the affected JSON store before applying; rollback restores the snapshot
only before subsequent writes, otherwise use an additive forward repair. Turning
off the new UI must not discard new Chapters or shared assets; retain compatible
Chapter deep links and legacy views until rollback parity is proven.

## 7. Acceptance

- C01: Standalone, existing Series, one-Chapter and multi-Season fixtures resolve
  the target hierarchy with original Scene/Shot/Take/source IDs intact.
- C02: Cross-actor reads/mutations fail; concurrent updates conflict atomically.
- C03: Configuration changes affect new projections after restart and do not
  mutate saved media or produce stale quote/submission mismatch.
- C04: Chapter switching fetches bounded detail without all-project histories or
  duplicate status polling; new and old deep links identify the same Shot.
- C05: Migration dry-run is read-only; repeated apply creates no duplicate roots,
  memberships, Character bindings or assets; rollback behavior has evidence.
