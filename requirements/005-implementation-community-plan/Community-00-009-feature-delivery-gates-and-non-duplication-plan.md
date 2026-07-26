# Community-00-009 Feature Delivery Gates and Non-Duplication Plan

**Status:** Active - Governs Community-05 through Community-12  
**Implementation status:** Complete - validated 2026-07-26
**Feature type:** Delivery sequencing, feature exposure and ownership control  
**Depends on:** Community-00-001 through Community-00-008, Community-03 and Community-04  
**Created:** 2026-07-26

## 1. Business Requirement

Community features must be delivered without exposing incomplete public
workflows or creating temporary services that are replaced in the next task.
Every Community requirement therefore has two independent gates:

```text
Development gate   Can an agent implement this requirement now?
Exposure gate      Can a user access this behavior in the application?
```

An open development gate does not automatically open the feature to users.
Incomplete features may be implemented behind an internal feature flag and
tested with mock actors before public exposure.

## 2. Gate Vocabulary

### 2.1 Development Gate

```text
CLOSED       Do not implement. A dependency or canonical owner is incomplete.
CONTRACT     Contracts, schemas, fixtures and interfaces only.
OPEN         The listed implementation scope may be developed.
VERIFY_ONLY  Implementation exists; only close gaps, migrate or test it.
COMPLETE     Exit criteria passed and no required work remains.
```

### 2.2 Exposure Gate

```text
HIDDEN        No navigation, public route or normal user action.
INTERNAL      Available only in local/development mode to mock actors.
PRIVATE_BETA  Available to approved users with safe fallback behavior.
PUBLIC        Available to all eligible users.
```

### 2.3 Canonical Ownership Rule

When two requirements mention the same capability, only the canonical owner may
create its schema, repository or domain service. Consumers call the owner:

| Capability | Canonical owner | Consumers |
|---|---|---|
| Taxonomy and category codes | Community-03 | 04, 05, 09, 12 |
| Public post/snapshot creation | Community-04 | 05, 06, 07, 09, 12 |
| Explore and post-detail presentation | Community-05 | 06, 08, 09 |
| Creator profile and follow graph | Community-06 | 05, 08, 09 |
| Reports, moderation state and ranking eligibility | Community-07 | 05, 08, 12 |
| Curated gallery, character asset and Scene Builder handoff | Community-09 | 05, 06, 08 |
| Actor context and mock switching | Community-00-002 | 05 through 12 |
| Credit estimate/reservation/capture/refund | Community-00-005 | 05, 08, 11 |
| Engagement, comments, comparison votes and ranking | Community-12 | 05, 07, 08 |
| Launch flags, integration checks and metrics wiring | Community-08 | all public exposure |

Community-10 documents the development actor-switching use case but must not
create a second identity system. Community-11 documents provider-routing
boundaries but must not create a second credit ledger or generation billing
path.

## 3. Optimized Delivery Waves

### Wave 0 - Close Existing Share Contracts

Development gate:

```text
Community-03  VERIFY_ONLY
Community-04  VERIFY_ONLY
```

Required work:

- Confirm taxonomy codes and public classification read models are stable.
- Confirm all post types use the canonical `CommunityPost` contract.
- Confirm published snapshots are sanitized and actor-owned.
- Run existing taxonomy/share/public-snapshot tests.

Exposure:

```text
Taxonomy suggestion       INTERNAL
Share generated image     INTERNAL
Public Community feed     HIDDEN
```

Exit gate:

- Community-03 and Community-04 acceptance tests pass.
- No raw private reference, prompt field or source asset leaks from a public
  snapshot.
- Community-04/05 can create an image, template, comparison or immutable
  Collection post record without
  creating post-type-specific repositories.

### Wave 1 - Build Stable Server Owners in Parallel

Development gate:

```text
Community-06  OPEN: profile contract, profile read API, follow repository/service
Community-07  OPEN: post reporting, moderation states, visibility filtering
Community-12  OPEN: engagement records, comments, comparison votes, ranking
Community-05  CONTRACT: UI read models and API consumption only
```

These three server capabilities may be developed in parallel because their data
ownership does not overlap. They all depend on the same canonical
`CommunityPost.id`, `ownerUserId` and `creatorProfileId`.

Exposure:

```text
Creator profile routes    INTERNAL
Follow actions            INTERNAL
Report/moderation         INTERNAL
Engagement/ranking        HIDDEN
```

Exit gate:

- Creator profile public responses contain no private account fields.
- Hidden/removed posts are excluded by the server query path.
- Community-12 persistence and ranking tests pass with actor-scoped reactions,
  comments and votes.
- No Community-05 browser code calculates authoritative counters or ranking.

### Wave 2 - Assemble Community Explore

Development gate:

```text
Community-05  OPEN
Community-06  VERIFY_ONLY
Community-07  VERIFY_ONLY
Community-12  VERIFY_ONLY
```

Open Community-05 scope:

- Latest feed, official-category filtering, search and pagination.
- Post detail for image, template, comparison and Collection posts.
- Creator profile links and follow controls supplied by Community-06.
- Like, save, comment, comparison vote and ranked queries supplied by
  Community-12.
- Report actions and visibility handling supplied by Community-07.
- Remix handoff using Community-04 public snapshots and existing Scene Builder
  contracts.

Closed Community-05 scope:

- New engagement repositories or ranking formulas.
- New moderation state or report storage.
- New template serializer, reference resolver or generation endpoint.
- Personalized recommendations, creator reputation and paid promotion.

Exposure:

```text
Community navigation      INTERNAL
Latest feed               INTERNAL
Post detail/remix         INTERNAL
Trending periods          INTERNAL after Community-12 tests pass
```

Exit gate:

- Alice can publish, Bob can view/remix/react and admin can hide the post.
- Image, template, comparison and Collection posts use the same feed/detail API
  family.
- Hidden or removed records disappear without client-side-only filtering.

### Wave 3 - Curated Gallery and Character Reuse

Development gate:

```text
Community-09  OPEN
Community-05  VERIFY_ONLY
Community-06  VERIFY_ONLY
```

Open scope:

- Owner-curated gallery membership referencing existing generation assets or
  Community posts.
- Character asset metadata and public-safe reference policy.
- `Use Template` and `Use Character` handoff to the existing Scene Builder.

Closed scope:

- Creating another Community post repository.
- Copying source image binary or Base64 into gallery records.
- Reimplementing Scene Builder serialization, variable resolution, reference
  privacy or credit billing.
- Marketplace, licensing, revenue share and public original downloads.

Exposure:

```text
Owner gallery controls    INTERNAL
Public gallery/character  INTERNAL
Use Template/Character    INTERNAL
```

Exit gate:

- Gallery contains only explicitly selected records.
- Cross-user private references require replacement.
- Handoff opens Scene Builder through its canonical hydrator and generation
  pipeline.

### Wave 4 - Launch Integration

Development gate:

```text
Community-08  OPEN
Community-05  VERIFY_ONLY
Community-06  VERIFY_ONLY
Community-07  VERIFY_ONLY
Community-09  VERIFY_ONLY
Community-12  VERIFY_ONLY
```

Community-08 owns integration only. It may add feature flags, metrics adapters,
readiness checks and end-to-end tests. It must not add alternate post, profile,
moderation, gallery, engagement, credit or generation business logic.

Exposure progression:

```text
INTERNAL -> PRIVATE_BETA
```

Public exposure remains closed while the application uses development-only mock
identity. A private beta may use mock actors only on an explicitly local or
isolated environment.

Exit gate:

- All required end-to-end flows pass.
- Community can be disabled without breaking Studio, Playground, History,
  Comparison or Scene Builder.
- Terms, privacy, AI disclosure, moderation and support paths are available.
- Metrics contain IDs and event metadata, not raw private prompts or references.

### Wave 5 - Public Readiness

Development gate:

```text
Community-10  VERIFY_ONLY
Community-11  VERIFY_ONLY
```

Community-10:

- Keep the existing `ActorContext` boundary and mock switcher for development
  tests.
- Hide the mock switcher outside development.
- Replace only the actor resolver when real authentication arrives.
- Do not create another mock-user repository, header contract or persistence
  key.

Community-11:

- Reuse Community-00-005 and the canonical credit domain.
- Verify Community remix and template generation use the same estimate and
  reservation lifecycle as Studio and Playground.
- Keep Simple/Advanced provider-routing interfaces compatible with current
  provider capabilities.
- Keep automated Simple routing, payment checkout, subscription billing and
  dynamic provider-price ingestion closed in this phase.

Exposure:

```text
Mock user switcher        HIDDEN outside development
Credit estimate/balance   PRIVATE_BETA where generation is enabled
Automatic provider route  HIDDEN
```

Public Community may open only after production authentication, asset delivery
and operational security gates replace their local adapters.

## 4. Requirement Gate Matrix

| Requirement | Start state | Open now | Must stay closed | Exit unlocks |
|---|---|---|---|---|
| Community-05 | IMPLEMENTED_PENDING_VALIDATION | Three-layer Explore, detail, public viewer, engagement, template, comparison and Collection flows | Personalized/ML ranking | Internal E2E acceptance |
| Community-06 | OPEN | Profile, follow, public portfolio query | Marketplace, creator ranking/analytics | Creator identity in 05/09 |
| Community-07 | OPEN | Report, hide/remove, eligibility, audit | Appeals, strikes, complex queue | Safe engagement/feed |
| Community-08 | OPEN_E2E | Readiness response, feature wiring and cross-feature tests | New post/profile/gallery domain logic | Commercial migration baseline |
| Community-09 | IMPLEMENTED_PENDING_VALIDATION | Curated Gallery, Character display and sanitized Scene Builder handoff | Marketplace/licensing/original downloads | Internal E2E acceptance |
| Community-10 | VERIFY_ONLY | Actor-scope gaps and tests | Duplicate identity/auth implementation | Production auth migration seam |
| Community-11 | VERIFY_ONLY | Credit integration gaps and routing contract | Duplicate ledger, auto routing, payment | Billable private beta |
| Community-12 | OPEN | Shared engagement and ranking backend | Personalized/ML ranking | Full Community-05 engagement UI |

## 5. Feature Flag Contract

Use server-owned configuration or the established module registry. Do not infer
feature availability only from DOM presence.

```text
server/config/community-feature-flags.json
server/domain/community/CommunityFeaturePolicyService.js
GET /api/community/features

community.enabled
community.shareEnabled
community.exploreEnabled
community.engagementEnabled
community.creatorProfilesEnabled
community.galleryEnabled
community.moderationEnabled
community.privateBeta
development.mockActorSwitcherEnabled
routing.automaticSimpleModeEnabled
```

Rules:

- A disabled write feature must be rejected by its server route with a stable
  error code, not merely hidden in the client.
- Child flags cannot be enabled when `community.enabled` is false.
- `community.exploreEnabled` requires Community-04 public snapshots and
  Community-07 visibility filtering.
- `community.engagementEnabled` requires Community-12 and Community-07.
- `community.galleryEnabled` requires Community-09 exit criteria.
- `development.mockActorSwitcherEnabled` must be false outside development.
- `routing.automaticSimpleModeEnabled` remains false in this phase.

## 6. File Ownership and Reuse

Canonical placement follows `requirements/007-technical-dept/000-master.md`:

```text
HTTP translation          server/app/routes/
Community business rules  server/domain/community/
Community persistence     server/repositories/community/
Community runtime JSON    server/data/community/
Client Community UI       client/community/
Shared client API/actor   client/core/
Automated tests           test/
```

Before adding a file, an implementing agent must search the canonical folders
for an existing owner. Compatibility wrappers or old paths in earlier
requirements are not permission to create duplicate modules.

## 7. Implementation Checklist for Every Agent

Before editing:

1. Read this gate plan, the owning requirement and technical architecture master.
2. Confirm the requirement development gate is open.
3. Identify the canonical owner for every schema and side effect.
4. List existing modules to reuse before proposing new files.
5. Confirm whether the feature remains hidden, internal or beta.

Before handoff:

1. Update the owning requirement status only after its exit gate passes.
2. Verify actor ownership and public sanitization on server responses.
3. Verify disabled feature behavior on both client and server.
4. Verify no temporary repository, scoring formula, serializer, generation path
   or credit path was introduced.
5. Report tests the user must run and any exposure gate that remains closed.

## 8. Testing

Required sequencing tests:

```text
TC-GATE-001 disabled Community module leaves Studio and Playground functional
TC-GATE-002 disabled write flag rejects the API mutation
TC-GATE-003 Explore never returns hidden/removed/private posts
TC-GATE-004 Community-05 consumes Community-12 ranking without client scoring
TC-GATE-005 gallery references existing assets and stores no Base64
TC-GATE-006 mock actor switch clears actor-scoped Community state
TC-GATE-007 Community generation uses canonical credit reservation
TC-GATE-008 automatic Simple routing remains disabled
```

Manual release test:

```text
Alice publishes -> Bob discovers -> Bob reacts/remixes
-> admin hides -> post disappears from discovery
-> owner gallery exposes an allowed character/template
-> Bob opens it in Scene Builder with private references replaced
```

## 9. Implemented Delivery Gate Foundation

### 9.1 Server-Owned Policy

- `server/config/community-feature-flags.json` remains the configuration source.
- `CommunityFeaturePolicyService` validates parent/child dependencies before flags are consumed.
- Explore requires both canonical sharing and moderation to be enabled.
- Engagement requires Explore and moderation.
- Gallery requires creator profiles.
- Automatic Simple provider routing is rejected while this phase keeps it closed.
- Disabled write routes reject before calling their domain service with stable error code `community_feature_disabled`.
- Scene Template routes preserve `{ error: { code, message } }` instead of dropping the policy code.

### 9.2 Client Read Model

`client/community/communityFeaturePolicy.js` is the only client owner for
loading and interpreting `GET /api/community/features`.

Input:

```text
server public effective feature flags
```

Process:

```text
fetch once -> normalize known booleans -> cache snapshot
-> dispatch modelpromptforge:communityfeatureschange
```

Output:

```text
getSnapshot()
isEnabled(featurePath)
isRouteEnabled(pathname)
isLoaded()
```

If feature discovery fails, Community controls fail closed while Studio,
Playground, History and Comparison routes remain available.

### 9.3 Consumers

```text
client/shell/navigationRegistry.js
  hides the Community navigation module when community.enabled is false

client/shell/router.js
  rejects disabled Community and creator-profile deep links

client/shell/applicationShell.js
  rerenders navigation and revalidates the active route after flags load

client/community/communityHomePage.js
  reads creatorProfilesEnabled from the canonical client policy

client/core/lightboxService.js
client/community/communitySharePreview.js
  hide or reject Share actions when shareEnabled is false

client/scene-builder/sharedTemplatesPanel.js
  does not request or render shared templates when Community is disabled
```

### 9.4 Non-Duplication Cleanup

The inactive `client/scene-builder/sceneSharePreview.js` implementation was
removed. Generated-image and Scene Template sharing now use the canonical
`client/community/communitySharePreview.js` owner. Older requirement path
references were updated to this owner.

### 9.5 Validation

Windows validation:

```bat
scripts\test-community-00-009.bat
```

Manual checks:

1. With current development flags, Community, creator profile, sharing and moderation remain internal and available.
2. Set every Community child flag and `community.enabled` to false, restart the server and open `/community`; the client must move to `/studio`.
3. Confirm Studio and Playground still operate while Community is disabled.
4. Confirm Share controls and Shared Templates are hidden or empty while disabled.
5. Restore the committed flag configuration after the manual disabled-state check.
