# Community Platform Master Roadmap

**Status:** Proposed - Awaiting Review  
**Target:** Prompt discovery, remix and creator community for AI image generation  
**Architecture:** Reuse shared core platform from commercial plan; implement community as a solution module  
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

Community must reuse shared platform foundations already defined in `requirements/004-implementation-commercial-feature-plan` instead of duplicating them.

Shared dependencies:

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
  Visual Configurator
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
| Community-01 | Product Home and Workflow Launcher | Application shell, module registry |
| Community-02 | Prompt Composer AI and Structured Freestyle | Visual Configurator, provider gateway for text assistant if approved |
| Community-03 | Community Taxonomy and Auto Classification | Prompt/config schema, shared moderation baseline |
| Community-04 | Share Generated Image and Prompt Snapshot | Auth, assets, generation history, collections |
| Community-05 | Community Explore, Post Detail and Remix | Community-03, Community-04 |
| Community-06 | Creator Profile, Follow and Portfolio | Auth, Community-04 |
| Community-07 | Community Safety, Moderation and Reporting | Auth, audit, asset scan |
| Community-08 | Community MVP Integration and Launch | All Community MVP phases |

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
- Prompt visibility controls.
- Official taxonomy tags suggested by system.
- Explore feed with category filters and simple trending.
- Post detail page with image, metadata and `Use / Remix Prompt`.
- Creator mini profile and follow.
- Like and save/bookmark.

Deferred:

- Paid prompt marketplace.
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
- Public read models must not expose private prompts, private assets, internal provider payloads or hidden workflow fields.
- Shared prompt snapshots are immutable after publish; edits create a new visible revision or update only presentation fields.
- User custom tags never become official categories automatically.
- Trending uses official tags and trust/safety status, not only raw engagement.
- Community posts reference source generation results by ID, but public display uses a sanitized immutable snapshot.
- Deleting or hiding a source private result must follow retention policy and may hide the community post if public assets are no longer allowed.
- Admin/support actions require audit reason and actor.

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

