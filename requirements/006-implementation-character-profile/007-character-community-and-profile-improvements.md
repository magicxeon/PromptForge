# Character Community and Profile Improvements

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Implemented - automated and browser validation pending

## 1. Business Requirement

Character discovery and owner management must be visible without requiring the
user to know a hidden route. A public Character must also show a usable public
image to every authorized viewer, not only to its owner.

This improvement addresses four current gaps:

1. Community home has no dedicated Character row.
2. The active user area has no direct entry to `My Characters`.
3. The owner sharing section is visually weak and its controls are too short.
4. A Character may be listed publicly while another user sees
   `Casting export required` instead of its approved public image.

This is an incremental improvement before the larger Community UI redesign. It
must reuse the current Character Profile, Community card, router, actor,
ownership and media contracts.

## 2. Community Character Row

Community home must render a distinct full-width Character section between the
Community hero/create launcher and the general Community feed:

```text
Characters
Meet reusable models created by the community.               View all

[ Character card ] [ Character card ] [ Character card ] ...
```

MVP presentation:

- section heading, short supporting text and `View all` action
- horizontal card rail on desktop and touch-scroll rail on mobile
- maximum 8 Characters in the initial row
- only active profiles with `visibility: public`
- card image, Character name, prominent creator name, Character type and reuse
  status
- card image and name both open `/community/characters/:id`
- `View all` opens `/community/characters`
- `Use Character` appears only when the server reports that reuse is available
- loading, empty and error states remain inside the Character section
- the entire Community feed must remain usable when the Character API fails

Do not copy Character card markup into `communityHomePage.js`.
`communityCharacterSection.js` remains the reusable renderer and accepts a
display variant:

```text
render(container, {
  variant: directory | rail,
  limit,
  scope,
  filters
})
```

The directory uses `variant: directory`; Community home uses `variant: rail`.
Both variants share media fallback, status, navigation and permission behavior.

## 3. Character Display Image Priority

The Character row should feature a public image generated with that Character
when one exists. Until then it must show the canonical Character image.

Priority:

```text
1. featured public Community work attributed to the active Character version
2. latest public Community work attributed to the Character profile
3. approved casting front preview for reusable_model
4. approved canonical Casting Sheet for reusable_model
5. approved canonical Character Sheet for styled_character
6. neutral localized placeholder
```

Rules:

- Only public, active, moderation-approved work may become a featured image.
- A private History output must never be promoted automatically.
- The public card must not receive an owner-scoped `/outputs/...` path.
- Public card responses contain authorized API URLs, not local file paths,
  Base64 data, private reference IDs or provider payloads.
- Image selection is performed in the server domain/public projection layer.
  The client must not inspect private History to choose an image.
- Avoid one API request per card. Resolve featured work and Character summaries
  in one service operation or a bounded batch operation.
- Failure to resolve featured work falls back to canonical Character media; it
  must not make the Character disappear.

Suggested public summary extension:

```text
PublicCharacterSummary
- id
- characterProfileVersionId
- displayName
- ownerUsername
- characterType
- reuseStatus
- handoffAvailable
- displayImageUrl
- displayImageSource: featured_work | casting_preview | canonical_sheet | none
- thumbnailUrl
- stats
```

`displayImageUrl` is for the visible card/hero. `thumbnailUrl` remains available
for compact lists. Both URLs must be safe for a non-owner viewer.

## 4. Public Media Correctness

An approved public Character must not return `Casting export required` merely
because the viewer is not the owner.

Canonical server behavior:

```text
GET /api/community/character-profiles/:id/image
GET /api/community/character-profiles/:id/thumbnail
GET /api/community/character-profiles/:id/face
```

For a non-owner request, the server must:

1. authorize the Character Profile through public visibility and moderation
   status;
2. resolve the active approved Character Profile version;
3. resolve the canonical asset using `characterTypePolicy`;
4. use a derivative when it exists;
5. fall back to the owned canonical generation result when the derivative file
   is missing;
6. return the image with the correct content type and cache policy.

The server must not authorize the public request by calling an owner-only
generation-result lookup. The generation result remains private data; only the
resolved public media stream is exposed.

The following conditions are distinct:

- no approved canonical asset: `character_profile_media_not_ready`
- profile is private/unlisted to this viewer: `character_profile_not_found`
- public record points to a missing file: `character_profile_media_missing`

The client displays `Casting export required` only for an owner draft that
actually has no approved canonical asset. A public Character with a failed
media request displays a neutral image-unavailable placeholder and must report
the stable media error for diagnostics.

Historical approved `character-casting-four-view-v1` and current
`character-casting-three-view-v2` assets are both valid public media. The
current layout policy must not hide an older approved profile.

## 5. User Entry Points

The active user area must provide a clear owner entry:

```text
My Characters
```

Behavior:

- opens `/community/characters?scope=own`
- the Character Directory reads `scope=own` on initial load and selects the
  `My Characters` scope
- actor switching reloads the owner list and never leaks another actor's
  private Characters
- a direct refresh preserves the owner scope
- Community home still provides `Browse Characters` for public discovery
- the creator profile Character section remains available and links to the same
  Character Profile route

For the current mock-user shell, place the action adjacent to the active-user
control or in its user action menu. Do not add Character Profiles as a new
top-level application navigation item. The future authenticated account menu
must be able to replace the mock-user presentation without changing the route.

## 6. Sharing UX

The owner-only `Who can use this Character?` section must become a clear
permission editor, not a compressed row of small controls.

Layout:

```text
SHARING
Who can use this Character?
Control discovery and whether other people may generate with it.

Visibility        [ Private | Unlisted | Public ]
Reuse permission  [ Only me | View only | Can be reused ]

[ ] I have the right to share this Character for reuse.

Current result: Public - available for reuse
                                           Save sharing settings
```

Requirements:

- use segmented controls or full-height native selects consistent with the
  current design system
- every interactive target has a minimum height of 44px
- labels, selected state, focus state and disabled state are visually clear
- save button is a clear command and cannot collapse to text-height
- show a concise explanation beneath each permission group
- show pending, success and error state without shifting surrounding content
- prevent duplicate submission while saving
- refresh the Character detail and public projection after success
- rights declaration is required only when enabling `public_reusable`
- owner-only controls are never rendered for another viewer
- stack controls vertically on narrow screens without clipped text
- all visible text uses the `character-profiles` i18n namespace

Compatibility behavior:

- `private` is absent from public discovery regardless of reuse policy.
- `public + owner_only` is discoverable and viewable, but only its owner may
  create a generation handoff; the UI should explain the effective result.
- `public + view_only` is discoverable and openable without a handoff action.
- `public + public_reusable` is discoverable and reusable after rights
  confirmation.
- The server remains authoritative and validates every combination.

## 7. System Design

### 7.1 Client responsibilities

```text
communityHomePage
  -> creates Character section shell
  -> delegates list/card rendering to communityCharacterSection

communityCharacterSection
  -> loads PublicCharacterSummary through characterProfileApi
  -> renders directory or rail variant
  -> owns shared card interaction and media fallback

communityCharacterDirectory
  -> parses scope from the current router URL
  -> delegates list rendering to communityCharacterSection

characterProfilePage
  -> composes owner sharing controls
  -> submits through characterProfileApi
  -> never calculates public authorization locally
```

### 7.2 Server responsibilities

```text
CharacterProfileSharingService
  -> authorizes profile visibility
  -> resolves approved active version
  -> produces PublicCharacterSummary
  -> resolves safe public media fallback

CharacterUsageService / Community repositories
  -> resolve public work associated with Character profile/version

CharacterProfileVersionRepository
  -> supplies canonical and derivative asset references

characterProfileRoutes
  -> translates HTTP input/output and streams resolved media
```

Character Profile remains canonical. `CommunityCharacterRepository` is a
discoverability projection and must not become a second owner of Character
media or sharing policy.

For the MVP Character row, `CharacterProfileSharingService` may resolve featured
work with one bounded public-post query and one batch generation-result lookup,
then map `characterProfileContext.characterProfileId` to the requested profile
IDs. It must not execute one post or generation-result query per Character.
The commercial database phase may replace this with an indexed
`community_post_character` relation without changing `PublicCharacterSummary`.

## 8. File-Level Implementation Plan

### Modify

```text
client/community/communityHomePage.js
```

- add an unframed Character row mount before the general feed
- add `View all` through `ModelPromptForgeRouter`
- keep Character API failure isolated from Community feed initialization

```text
client/community/communityCharacterSection.js
```

- support `rail` and `directory` variants through options
- use `displayImageUrl`, then `thumbnailUrl`, then neutral placeholder
- keep one reusable Character card renderer and interaction contract

```text
client/community/communityCharacterDirectory.js
```

- initialize scope and filters from router query parameters
- preserve `scope=own` through direct navigation and actor refresh

```text
client/character-profiles/characterProfilePage.js
```

- restructure the owner sharing editor with accessible segmented controls or
  stable full-height fields
- render effective permission summary and stable save status

```text
client/community/communityMockUserSwitcher.js
client/index.html
```

- add the current MVP `My Characters` user action without coupling the route to
  the mock username
- keep the entry actor-aware and replaceable by the future account menu

```text
client/style.css
```

- style the Character rail and sharing editor
- use stable card dimensions, minimum 44px controls and responsive overflow
- hide the scrollbar visually only when keyboard, wheel and touch scrolling
  remain available

```text
server/domain/character-profiles/CharacterProfileSharingService.js
```

- centralize public display-image priority
- guarantee canonical media fallback for public non-owner viewers
- expose `displayImageUrl` and `displayImageSource`
- avoid per-card repository calls where a batch lookup is available

```text
server/repositories/community/CommunityPostRepository.js
server/repositories/generation/GenerationResultRepository.js
```

- reuse the existing bounded public-post query
- add a batch generation-result lookup only if no equivalent method exists
- do not expose private generation records through the public response

```text
server/app/routes/characterProfileRoutes.js
```

- preserve route-level actor context and stable media error translation
- set correct media content type/cache headers after domain authorization

```text
client/i18n/locales/en/character-profiles.json
client/i18n/locales/th/character-profiles.json
```

- add Character row, My Characters, sharing explanations, effective status and
  media placeholder keys with locale parity

### Extend tests

```text
test/characterProfileSharing.test.js
test/characterUsageAnalytics.test.js
test/communityMvpIntegration.test.js
```

Add a focused client contract test only if existing Community client policy
tests cannot cover rail rendering and owner-scope URL parsing.

No new runtime JSON file or second Character repository is required.

## 9. Impact and Migration

- Existing Character Profile and Community projection records remain valid.
- Existing approved 4-view and new 3-view Casting assets remain viewable.
- No credit behavior or generation payload changes are part of this work.
- No private History image becomes public automatically.
- Public projection records missing a preview field are repaired through
  read-time canonical fallback; a bounded migration may backfill the projection
  later but is not required for correctness.
- Community home gains one bounded list request. It must not trigger per-card
  polling or per-card History requests.

## 10. Acceptance and Testing

### Automated

1. Public approved Character is listed for a second actor.
2. Second actor receives HTTP 200 and an image content type from Character
   image and thumbnail routes.
3. Missing derivative falls back to the canonical approved generation image.
4. Private, unlisted-without-access and blocked Characters do not leak media.
5. Legacy approved 4-view media remains available.
6. Featured public work wins over Casting preview.
7. Private work never becomes a card image.
8. Character row failure does not prevent normal Community feed rendering.
9. `/community/characters?scope=own` requests only the active actor's profiles.
10. Saving sharing settings is actor-owned and idempotent.
11. i18n catalog keys and interpolation variables remain in parity.

### Manual desktop and mobile

1. Open `/community` and confirm the Character row appears before the general
   feed.
2. Confirm cards scroll horizontally and card image/name open the same profile.
3. Open `My Characters` from the active-user area and confirm owner scope.
4. Switch mock actors and confirm private owner lists do not leak.
5. As owner, open a Character Profile and verify sharing controls are at least
   44px high, readable and keyboard accessible.
6. Share an approved Character as `public_reusable`.
7. Switch to another user and confirm its image, creator and reuse status are
   visible.
8. Remove a derivative file in a test fixture and confirm canonical image
   fallback.
9. Verify the sharing editor and Character row at desktop and mobile widths
   without clipped labels or overlapping actions.

## 11. Exit Criteria

- Community home visibly presents a dedicated Character row.
- The current user can reach `My Characters` without knowing the URL.
- Sharing controls are clear, accessible and professionally sized.
- Every approved public Character has a viewer-safe display image or a neutral
  media-error placeholder; it is never mislabeled as requiring a Casting Export
  solely because the viewer is not the owner.
- Directory, Community row and creator profile use the same Character identity,
  media and permission contracts.
