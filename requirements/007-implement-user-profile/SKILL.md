---
name: model-prompt-forge-user-profile
description: Implement or review the unified public and owner Creator Profile in ModelPromptForge without duplicating Community, Character, Template, Comparison, Collection, engagement, routing, ownership, or media contracts.
---

# ModelPromptForge User Profile Implementation Skill

Use this workflow for every task under
`requirements/007-implement-user-profile/`.

## 1. Read Before Editing

Read in order:

1. `AGENTS.md`
2. `requirements/099-technical-dept/000-master.md`
3. `requirements/007-implement-user-profile/000-master-user-profile-roadmap.md`
4. the requested numbered requirement
5. all earlier numbered requirements that produce its input contract
6. the existing modules named by the requirement

Open `requirements/007-implement-user-profile/user-profile-concpet.png` before
frontend work. Treat it as the layout and information-hierarchy reference, not
as permission to copy tiny text, inaccessible controls or duplicate card UI.

Also inspect:

```text
requirements/005-implementation-community-plan/Community-06-creator-profile-follow-and-portfolio.md
requirements/005-implementation-community-plan/Community-09-user-gallery-character-and-template-handoff.md
requirements/006-implementation-character-profile/000-master-character-profile-roadmap.md
```

Current code is authoritative when an old requirement names a stale path.

## 2. Decide Ownership Before Creating Files

Profile Page is a Community presentation capability:

```text
Client UI/controller        client/community/
Server page composition     server/domain/community/
HTTP routes                 server/app/routes/
Existing persistence        server/repositories/community/
Runtime JSON                server/data/community/
Localization               client/i18n/locales/<locale>/community.json
Tests                       test/
```

Do not create `client/user-profile/` or `server/domain/user-profile/` unless the
architecture master is deliberately changed. Account/authentication data is not
owned by the public Creator Profile.

## 3. Reuse Gate

Before writing a component or endpoint, search for:

```text
CreatorProfileService
creatorProfilePage
creatorPortfolioGrid
followButton
communityCharacterSection
communityTemplateActions
comparisonMosaic
CommunityGalleryService
CommunityEngagementService
lightboxService
```

If a canonical implementation exists:

- add a variant/adapter or callback parameter
- do not copy its markup
- do not reproduce its permission logic
- keep mutations in the owning feature

Required shared composition boundaries:

```text
CreatorProfileSection
CreatorStatsSummary
CreatorContentCardAdapter
```

Do not recreate section headers, counts, loading/empty states or content cards
inside each tab.

## 4. Required Dependency Direction

```text
route
-> CreatorProfilePageService
-> existing domain services/repositories
-> public response builder

profile controller
-> communityCreatorApi
-> page shell
-> reusable section components
```

Routes translate HTTP only. Client components do not fetch unless they are the
designated controller/API module.

## 5. Public/Owner Rule

One component tree serves both contexts. Render from server capabilities:

```text
viewer.isOwner
viewer.canEditProfile
viewer.canManageContent
viewer.canFollow
viewer.canReport
```

Never infer ownership from username, handle, route or client state.

Public responses must not contain:

- durable user ID
- email or authentication metadata
- credit/account information
- private/draft counts
- raw prompt/provider payload
- private references or Base64
- storage filesystem paths

## 6. Query and Performance Rule

- load one selected tab
- bound Overview sections
- use cursor pagination
- no request per card
- no full History scan returned to browser
- no persistent cache for another creator's content
- invalidate actor-relative state on actor change

## 7. Implementation Routine

For each numbered requirement:

1. Confirm earlier contract tests exist.
2. Inspect current callers before editing signatures.
3. Define input/process/output.
4. Update server response builder before UI.
5. Add or extend reusable component parameters.
6. Add localization keys for all enabled locales.
7. Add focused tests and regression coverage.
8. Update the requirement status to `Implemented - validation pending`.
9. Report Node commands for the user to run.
10. Mark complete only after the user confirms tests and browser acceptance.

## 8. UI Rules

- preserve the established dark application visual system
- use compact professional controls
- avoid nested decorative cards
- keep media dimensions stable with aspect ratios
- make tabs and rails keyboard/touch usable
- use minimum 44px mobile targets
- hide unavailable controls instead of showing misleading disabled actions
- public and owner view must retain the same underlying composition

## 9. Test Matrix

Every step considers:

```text
owner vs visitor
public vs private/draft/removed
empty vs populated
desktop vs mobile
direct route vs in-app navigation
actor switch during request
missing media
stale featured IDs
feature flag disabled
localization expansion
keyboard navigation
```

## 10. Handoff Format

Report:

```text
behavior completed
canonical modules reused
new files and ownership
API/data contracts changed
runtime data paths changed
requirements updated
static validation performed
Node commands for the user
remaining browser/privacy risk
```

Do not run Node commands or tests directly. Do not alter unrelated dirty
worktree changes.
