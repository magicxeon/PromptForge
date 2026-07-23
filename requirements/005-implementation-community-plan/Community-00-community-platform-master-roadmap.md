# Community Platform Master Roadmap

**Status:** Proposed - Awaiting Review  
**Target:** Prompt discovery, remix and creator community for AI image generation  
**Architecture:** Reuse Visual Character Builder and shared core platform; implement community as a solution module  
**Created:** 2026-07-15

## 1. Product Vision

ModelPromptForge should become a community for AI image creators who focus on Fashion, Product Photography and Commercial Content. The community layer is not a generic social network. Its first job is to help users discover high-quality generated images, understand the prompt/workflow behind them, and immediately reuse or remix that prompt inside the existing generation system.

Core positioning:

- Search, create, share and remix prompts and workflows.
- Support multiple AI providers without tying users to one provider.
- Let creators build identity, followers and portfolio over time.
- Create an ecosystem where users can browse inspiration and save ideas even when they are not generating images.
- Prepare for future marketplace and membership features without adding paid community complexity to the first MVP.

## 2. MVP Product Decision

The first MVP is **Community Prompt Gallery + Remix**, not a full marketplace and not a full social platform.

The primary loop:

```text
see strong image -> inspect shared prompt/workflow -> remix in Studio
-> generate new image -> share back to Community
```

The MVP must prove this loop before adding comments, paid prompts, memberships, advanced creator ranking or revenue sharing.

## 3. Relationship to Commercial Plan

Community must reuse the character/configuration contracts defined in `requirements/003-implementation-visual-character-builder-plan`, Scene Builder template contracts defined in `requirements/004-implementation-scene-builder`, and shared platform foundations defined in `requirements/006-implementation-commercial-feature-plan` instead of duplicating them.

Shared dependencies:

- `003 Visual Character Builder - semantic configuration, visual controls and saved character contract`
- `004 Scene Builder - guided/manual final image workflow and reusable template contract`
- `Phase2-02 Modular Core Architecture and Module Registry`
- `Phase2-03 Database Architecture and JSON Migration`
- `Phase2-04 Authentication, Sessions and Authorization`
- `Phase2-05 Projects, Ownership and Collections`
- `Phase2-06 Assets, Storage and Product Catalog`
- `Phase2-10 Durable Jobs and Batch Orchestration`

Do not copy account, session, asset storage, ownership or job execution rules into community-specific code. Community module calls published core services and owns only community-specific domain records such as posts, creator profiles, follows, likes, taxonomy tags and remix events.

## 4. Architecture Direction

Community is a solution module registered through the same module registry as commercial modules.

```text
Core Platform
  Identity and Access
  Application Shell and Routing
  Projects, Collections and Ownership
  Assets and Storage
  Generation Results and Provider Gateway
  Jobs and Audit

Reusable Modules
  Advanced Studio
  Visual Character Builder
  Prompt Composer AI
  Character / Model Profiles
  Collections

Solution Modules
  Community
  Fashion Selling
  Commercial Marketplace (later)
```

Community module must not call image providers directly and must not mutate credit balances. Remix starts a normal generation flow through Advanced Studio or an approved generation use case.

## 5. Requirement Sequence

| Phase | Requirement | Dependency |
|---|---|---|
| Community-00-001 | Platform Foundation Priority Plan | Scene Builder contracts, current JSON storage |
| Community-00-002 | Mock User, Actor Context and Auth Migration | Application shell, local JSON repositories |
| Community-00-003 | Repository Interface and Database Schema Map | Actor Context, existing JSON repositories |
| Community-00-004 | Ownership, Visibility Policy and Public Snapshot | Actor Context, Scene Builder reference policy |
| Community-00-004-001 | Localization and Language Extension Foundation | Application shell, current Thai/English localization |
| Community-00-005 | Credit Ledger Mock and Generation Billing | Provider registry, generation queue |
| Community-00-006 | Admin, Support Audit and Backoffice Foundation | Actor Context, ownership policy |
| Community-01 | Product Home and Workflow Launcher | Application shell, module registry |
| Community-02 | Prompt Composer AI and Structured Freestyle | Visual Character Builder, provider gateway for text assistant if approved |
| Community-03 | Community Taxonomy and Auto Classification | Prompt/config schema, shared moderation baseline |
| Community-04 | Share Generated Image and Prompt Snapshot | Auth, assets, generation history, collections |
| Community-05 | Community Explore, Post Detail and Remix | Community-03, Community-04 |
| Community-06 | Creator Profile, Follow and Portfolio | Auth, Community-04 |
| Community-07 | Community Safety, Moderation and Reporting | Auth, audit, asset scan |
| Community-08 | Community MVP Integration and Launch | All Community MVP phases |
| Community-09 | User Gallery, Character Showcase and Template Handoff | Community-04, Community-06, Scene Builder |
| Community-10 | Local Mock User and Actor Switcher | Application shell, local JSON repositories |
| Community-11 | Credit Deduction and Provider Routing Foundation | Provider registry, generation queue, business credit policy |

`Community-10` and `Community-11` remain feature-level implementation documents. The `Community-00-002` and `Community-00-005` foundation documents define the earlier schema and migration contracts that those feature-level tasks must follow. `Community-00-004-001` defines the localization contract that all new Community UI must follow.

## 6. MVP Navigation

Initial navigation once community is enabled:

```text
Home
Studio
Community
Image History
Comparisons
Collections
Account
```

Rules:

- `Home` is a workflow launcher, not a long marketing landing page.
- `Community` shows public discovery and remixable posts.
- Unauthorized or disabled modules must not appear as working navigation items.
- Deep links must support browser Back/Forward and authorization checks.

## 7. MVP Scope

Included:

- Product Home / workflow launcher.
- Freestyle idea input assisted by AI Prompt Composer.
- Structured prompt/config output that can prefill dropdowns.
- Share generated image with prompt snapshot.
- Share Scene Builder templates with prompt, selections and replaceable reference slot mapping.
- Local mock user switching for internal testing until real auth is implemented.
- Credit estimate, reservation and deduction foundation for real AI generation.
- Prompt visibility controls.
- Official taxonomy tags suggested by system.
- Explore feed with category filters and simple trending.
- Post detail page with image, metadata and `Use / Remix Prompt`.
- Guided and Manual Scene Builder authoring modes on the same Studio surface.
- Creator mini profile and follow.
- Like and save/bookmark.
- User-curated creator gallery that shows only selected public images.
- Separate creator character area for headshot/full-character reusable assets.
- Community `Use Template` and `Use Character` entry points that route into Scene Builder.
- Simple/Advanced provider routing contract prepared, but not active as an automatic router in Community MVP.

Deferred:

- Paid prompt marketplace.
- Product-only Scene Builder workflows.
- Creator membership.
- Comment threads.
- Creator ranking leaderboard.
- Badges beyond simple internal metadata.
- Public collection marketplace.
- Revenue sharing.
- Advanced recommendation engine.
- Complex moderation queues beyond MVP safety/reporting.

## 8. Delivery Gates

### Gate A: Concept Prototype

- Home page clarifies major workflows.
- Freestyle AI can convert a user idea into structured prompt/config.
- Share preview can create a draft community post from an existing generated result.

### Gate B: Private Community Beta

- Public feed, post detail and remix flow work end to end.
- Official taxonomy prevents messy category creation.
- Basic creator profile and follows are available.
- Community content can be hidden or removed by admin/support.

### Gate C: Public MVP

- Safety, reporting, terms and AI disclosure are ready.
- Trending cannot be trivially polluted by low-confidence or unclassified posts.
- Remix flow routes users into generation with clear provider/model fallback.
- Launch metrics are instrumented.

## 9. Cross-Cutting Rules

- Every community mutation requires an authenticated actor.
- Until real authentication exists, development builds may use a mock actor switcher. All domain services must still receive an actor context shaped like future auth.
- Public read models must not expose private prompts, private assets, internal provider payloads or hidden workflow fields.
- Shared prompt snapshots are immutable after publish; edits create a new visible revision or update only presentation fields.
- User custom tags never become official categories automatically.
- Trending uses official tags and trust/safety status, not only raw engagement.
- Community posts reference source generation results by ID, but public display uses a sanitized immutable snapshot.
- Deleting or hiding a source private result must follow retention policy and may hide the community post if public assets are no longer allowed.
- Admin/support actions require audit reason and actor.

## 11. Compatibility With Existing Scene Builder Work

Community must integrate with the Scene Builder implementation in `requirements/004-implementation-scene-builder` by reusing these contracts:

- `SceneTemplateSnapshot` for share/remix templates.
- `replaceableVariables` and `referenceSlotMapping` for Use Template flows.
- reference privacy policies from Scene-007.
- payload optimization from Scene-005.
- local shared template mock flow from Scene-008 as the prototype baseline.
- client module boundary from Scene-009.

Community must not create a second template serializer, a second reference slot resolver or a second credit deduction path. New code should wrap the existing Scene Builder and generation services.

## 12. Implementation Plan

### User Review Required

- Community MVP will use a local mock user switcher first, not production auth.
- Community post/feed APIs may use local JSON persistence during development.
- Real creator marketplace, payout and membership remain deferred.
- Credit deduction foundation will be implemented as a reusable platform service, not community-only billing logic.
- Simple/Advanced provider routing is a contract in this phase; automatic routing can be implemented later after provider cost and quality metrics are stable.

### Proposed Modules

```text
client/community/communityModule.js
client/community/communityApi.js
client/community/communityRoutes.js
client/community/communityFeed.js
client/community/communityPostDetail.js
client/community/communityShareActions.js
client/community/communityMockUserSwitcher.js
server/community/CommunityPostRepository.js
server/community/CommunityProfileRepository.js
server/community/CommunityEventRepository.js
server/community/CommunityPolicyService.js
server/community/communityRoutes.js
server/identity/MockUserRepository.js
server/identity/mockActorContext.js
server/credits/CreditLedgerRepository.js
server/credits/CreditPolicyService.js
server/credits/CreditReservationService.js
server/routing/ProviderRoutingPolicyService.js
```

### Rollout Order

1. Add mock actor/user switcher so ownership, gallery and remix flows can be tested with multiple users.
2. Normalize Community post, creator profile, gallery and character records around `ownerUserId`.
3. Connect Share/Use Template to existing Scene Builder snapshot/handoff modules.
4. Add credit estimate and reservation hooks to generation requests.
5. Add Community feed/detail UI after share/remix data is stable.

### Testing

- Unit test actor switching and ownership checks with at least `user_demo`, `user_alice`, `user_bob`.
- Unit test public post sanitization against Scene Builder reference policies.
- Unit test credit reservation, capture and refund without calling real providers.
- Manual test: switch user, publish post as Alice, Use Template as Bob, verify private references require replacement.

## 13. Foundation Completion Gate

Do not start the richer Community feed/profile work until these foundation checks are complete:

```text
ActorContext exists and is passed to mutating APIs.
Repositories hide JSON implementation behind stable interfaces.
Ownership/visibility policy exists and is server-enforced.
Public snapshot sanitizer exists for posts/templates/assets.
Credit ledger mock can reserve/capture/refund generation credits.
Admin/support audit can record moderation and credit adjustment actions.
```

If a later Community task needs one of these capabilities and it does not exist yet, implement the missing foundation piece first instead of adding one-off logic inside the feature.

## 10. Success Metrics

MVP should measure:

- Community post views.
- Prompt detail opens.
- Remix clicks.
- Remix-to-generation conversion.
- Share-after-generation conversion.
- Creator follows.
- Saves/bookmarks.
- Low-confidence classification rate.
- Reports and admin removals.
