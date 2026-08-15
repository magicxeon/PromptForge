# User Profile 008 - Responsive, Accessibility, Migration and Release Gates

**Status:** Implementation complete; validation pending

## 1. Objective

Validate the integrated profile experience and remove obsolete entry points
only after the replacement is proven.

## 2. Migration

After acceptance:

- remove `My Characters` header action
- retain Character directory route as a Community discovery surface
- route owner profile entry through account menu
- replace the old monolithic Creator Profile rendering path
- preserve existing public `/creators/:handle` links
- keep old API endpoints until all consumers move to page model

Do not delete compatibility APIs in the same release unless repository-wide
search proves no consumers remain.

Implementation sequence:

1. Add full-profile fixtures and automated privacy assertions.
2. Complete desktop layout validation.
3. Complete tablet/mobile and keyboard validation.
4. Verify direct-route server fallback.
5. Migrate remaining old consumers.
6. Remove obsolete account entry/UI only.
7. Keep compatibility APIs until a separate cleanup proves them unused.

## 3. Responsive Requirements

Desktop:

- stable hero with avatar, identity and actions
- main/supporting columns do not overlap
- mosaic has explicit tracks/aspect ratios

Tablet:

- supporting rail moves below main content
- actions wrap without changing hero media dimensions unexpectedly

Mobile:

- one-column hero
- minimum 44px interactive targets
- horizontally scrollable tabs/rails with hidden or restrained scrollbar
- no clipped creator names, localized labels or status badges
- no hover-only action

## 4. Accessibility

- semantic heading order
- tabs implement correct roles, selected state and keyboard navigation
- visible focus
- avatar/cover/card alt text
- loading and mutation states announced appropriately
- dialogs trap/restore focus through existing dialog system
- color is not the only visibility/reuse indicator
- reduced motion respected
- owner controls are removed from accessibility tree when hidden

## 5. Performance Budget

- selected tab only
- Overview uses bounded preview counts
- no N+1 media or History queries
- lazy-load below-fold media
- stable media aspect ratios prevent layout shift
- one in-flight page request per route state
- actor/tab cache is bounded and in-memory

## 6. Security and Privacy Gate

- public fixture contains no user IDs, email, credit or auth data
- private content/media endpoints remain inaccessible
- all owner mutations use actor context
- featured IDs cannot reference another owner
- media URL failures do not reveal filesystem paths
- report and Follow actions enforce server policy

## 7. Impact

- The old Creator Profile renderer and account shortcut can be retired.
- Public routes expand but remain within the Community feature gate.
- Compatibility APIs remain temporarily, limiting migration blast radius.
- Production exposure remains blocked by infrastructure requirements.

## 8. Automated Test Plan

Create or extend:

```text
test/creatorProfilePage.test.js
test/creatorProfileRouting.test.js
test/creatorProfileCuration.test.js
test/creatorProfilePrivacy.test.js
test/creatorProfile.test.js
test/communityMvpIntegration.test.js
test/i18nCatalogParity.test.js
```

Test fixtures:

- empty legacy creator
- public creator with all section types
- owner with private/draft content
- viewer following creator
- stale featured IDs
- removed media
- moderated profile

## 9. Manual E2E

1. Alice opens her profile through account menu.
2. Alice edits identity and curates featured content.
3. Alice previews public mode.
4. Switch to Bob without reloading manually.
5. Bob sees only public content and follows Alice.
6. Bob opens Gallery, Character, Template, Comparison and Collection routes.
7. Bob uses allowed Character/Template handoff.
8. Bob reports profile/content through existing moderation UI.
9. Directly refresh each route.
10. Repeat key flows on mobile viewport and keyboard only.

## 10. Regression Gate

Must remain operational:

- Community home/feed/detail
- Character Profile discovery and handoff
- Comparison workspace/voting
- Collection detail/share
- Scene Template use
- owner-scoped History
- mock actor switching
- localization

## 11. Validation Commands

Agents must not run Node commands in this repository. Ask the user to execute:

```powershell
node --check <each changed JavaScript file>
node --test test/creatorProfilePage.test.js test/creatorProfile.test.js test/communityMvpIntegration.test.js test/i18nCatalogParity.test.js
```

Create a focused Windows batch script only when the final changed-file set is
known.

## 12. Release Gate

Internal exposure may open when:

- all automated tests pass
- desktop/mobile browser acceptance passes
- public response snapshot passes privacy review
- no obsolete `My Characters` account action remains
- direct routes survive server refresh
- Community feature flags can disable the profile safely

Production remains blocked by real authentication, durable database, object
storage, abuse controls and commercial readiness requirements.
