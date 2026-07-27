# 006 Creator, User and Character Profile Migration

**Status:** Planned after Community  
**Depends on:** 005 shared Community/media components

## 1. Business Requirement

React must provide one coherent profile system for:

- a public visitor viewing a creator;
- an owner viewing the same page with management capability;
- Creator portfolio sections;
- reusable Character discovery and Character detail;
- Character sharing/reuse policy;
- Character handoff to Fashion and Scene workflows.

Public and owner views compose the same components. Permission props change
available actions without creating duplicate pages.

## 2. Canonical Existing Owners

```text
client/community/creatorProfile*.js
client/character-profiles/
server/app/routes/communityCreatorRoutes.js
server/app/routes/characterProfileRoutes.js
server/domain/community/CreatorProfile*.js
server/domain/character-profiles/
requirements/006-implementation-character-profile/
requirements/007-implement-user-profile/
requirements/008-implement-adjusment-ui/002-character-profile-detail-page-adjustment.md
```

Do not create a second profile, Character, usage or sharing repository.

## 3. Routes

```text
/creators/:handle
/creators/:handle/gallery
/creators/:handle/characters
/creators/:handle/templates
/creators/:handle/comparisons
/creators/:handle/collections
/community/characters
/community/characters/:characterId
```

The active Creator tab derives from route matching. “My Profile” first resolves
the actor handle and navigates to the canonical public route.

## 4. Reusable Components

```text
ProfileShell
ProfileHero
CreatorIdentity
CreatorStats
ProfileTabs
ProfileSection
PortfolioGrid
FollowButton
OwnerActionMenu
CharacterCard
CharacterPickerCard
CharacterProfileHero
CharacterUsageSummary
CharacterSharingControl
CharacterHandoffAction
```

Community cards, Comparison summaries, Collection cards and media components
must be adapted, not copied.

## 5. Owner and Viewer Mode

The route receives a normalized server model:

```text
profile
viewer capabilities
counts
available tabs
selected tab data
overview composition
```

Owner mode:

- edit public presentation fields;
- curate featured content through existing feature mutations;
- manage Character name/personality/reuse policy;
- archive/moderate only when authorized.

Public mode:

- follow when permitted;
- view only public approved content;
- report when permitted;
- select reusable Character only when its handoff capability permits.

Do not infer owner status from handle, display name or client actor ID.

## 6. Character Contract

Preserve:

```text
reusable_model
styled_character
approved immutable profile versions
three-view modest white casting contract
public sharing projection
usage analytics
fashion and scene destination policy
```

React Character cards must clearly show:

- reusable;
- view only;
- owner only;
- unavailable destination and reason.

Private face/outfit references and original provider payloads are never exposed.

## 7. Data Loading

- Profile shell query loads identity, permissions and summary.
- Active tab query loads only the selected section.
- Tabs use bounded cursor pagination.
- Cards do not create per-record requests.
- Owner mutation invalidates only affected profile/section queries.
- Actor change recomputes viewer controls and cancels prior owner requests.

## 8. Fashion/Scene Handoff

Character handoff must carry canonical IDs and version:

```text
characterProfileId
characterProfileVersionId
destination
personalitySnapshot
attribution
authorizedReference
```

Do not transfer private raw image data or clone the Character into route state.
Destination routes resolve the handoff through their canonical state/API.

## 9. Migration Order

1. Shared Profile shell and creator read route.
2. Tabs and reusable portfolio adapters.
3. Follow and owner editing.
4. Character directory/cards.
5. Character detail and sharing controls.
6. Character handoff to current legacy destinations.
7. Cut over Creator routes.
8. Cut over Character routes.

Cross-runtime handoff may use a short-lived versioned server/session transfer
record. Do not create permanent duplicated localStorage payloads.

## 10. Tests

- public vs owner profile;
- missing/invalid handle;
- lazy tab and pagination;
- follow/unfollow;
- edit validation and stale response;
- Character reuse visibility;
- private Character rejection;
- reusable vs styled destination rules;
- actor switch on owner page;
- direct Character route and handoff;
- desktop/mobile profile and Character layout.

## 11. Exit Criteria

- Creator and Character routes are React-owned.
- Owner/public pages use the same reusable shell.
- Community/Profile cards share components.
- Character permission and handoff behavior matches server policy.
- Private media and identity data remain protected.

