# UI Adjustment 002 - Character Profile Detail Page

**Status:** Ready for implementation  
**Depends on:** `requirements/006-implementation-character-profile`  
**Owning capability:** Character Profiles

## 1. Visual Reference

Use [`002-mode-character.png`](./002-mode-character.png) as the visual reference for:

- page hierarchy and information density
- a dominant Character image beside a concise profile summary
- clear owner/viewer state
- primary Scene Builder and Fashion Blueprint handoff actions
- usage statistics
- public work and owner sharing settings below the hero

The reference is directional rather than pixel-perfect. Existing application
navigation, colors, typography, localization, responsive behavior and
accessibility rules take precedence.

### Required Difference From Reference

The application must **not** render front, side and back view selectors below
the primary image.

The detail page shows one primary Character image at a time. The canonical
Casting Sheet may still contain multiple views internally and remains the
generation/reference source, but the page must not expose angle switching,
angle thumbnails or angle-specific controls.

## 2. Business Requirement

The Character Profile page must make the Character immediately understandable
and usable by both technical and non-technical users.

A visitor must be able to answer, without opening another screen:

1. Who owns this Character?
2. What kind of Character is it?
3. Is it available for reuse?
4. Where can it be used?
5. How often has it been used?
6. What public images have already been created with it?

An owner must additionally be able to:

- edit Character metadata
- choose a display cover without changing the canonical Character reference
- manage visibility and reuse permission
- preview the visitor presentation
- continue creating images with the Character

The page is a Character asset detail surface. It must not become another
Character Builder, History page or Community feed.

## 3. Canonical Data Decisions

### 3.1 Canonical Reference Versus Display Cover

These concepts must remain separate:

```text
canonicalReferenceAsset
  immutable approved Casting Sheet or Character Sheet
  used for Scene Builder and Fashion Blueprint handoff
  never changed by choosing another profile cover

displayCoverAsset
  image shown as the primary profile media
  defaults to canonicalReferenceAsset
  may reference an owner-controlled public work associated with this Character
  presentation only; never enters generation payload automatically
```

The first implementation may show only the canonical image when no display
cover contract exists. It must not render a non-functional Change Cover button.

If cover selection is implemented, an eligible image must:

- belong to the Character owner
- be associated with the same `characterProfileId`
- have active public media
- pass Community visibility and moderation policy
- use an asset/result ID rather than Base64 data

### 3.2 Existing Character Contract

Reuse the canonical fields already owned by Character Profile:

```text
id
displayName
shortDescription
personalitySummary
characterType
status
visibility
reusePolicy
reuseStatus
ownerUsername
ownerUsernameSnapshot
intendedUses[]
destinationCapabilities[]
handoffAvailable
activeVersionId
versions[]
stats.totalOutputs
stats.byUseCase.fashion
stats.byUseCase.sceneStory
stats.byUseCase.other
isOwner
recordVersion
```

Do not create a second Character record or duplicate usage statistics in a UI
specific JSON file.

## 4. Page Composition

### 4.1 Context Header

Display a compact context row above the Character:

```text
Community / Characters / Character name
Owner View | Visitor View
Preview as visitor (owner only)
```

Use the existing application router. Breadcrumb links must not cause a full
page reload.

### 4.2 Character Hero

Desktop:

```text
Primary Character media               Character summary
- one image only                       - CHARACTER PROFILE kicker
- zoom/lightbox                        - Character name
- download when authorized             - creator attribution
- no angle controls                    - description/personality
                                       - type/use/status badges
                                       - destination actions
                                       - owner actions
```

The media area must:

- use a stable aspect ratio and minimum height
- use a neutral light media background so white casting clothing remains clear
- display the complete available image with `object-fit: contain`
- use the existing lightbox or media viewer for zoom
- show a localized unavailable state when media loading fails
- never reveal a private filesystem path or source upload URL

The summary must show:

- Character name as the only page `h1`
- creator avatar/identity when available
- link to `/creators/:handle`
- short description and personality
- Character type: `Reusable Model` or `Outfit bound`
- intended uses such as Fashion and Scene / Story
- availability state using both text and color
- compact metadata for subject type/style only when canonical data provides it

Do not infer missing metadata from the image on the client.

### 4.3 Action Priority

Primary command:

```text
Use in Scene Builder
```

Secondary command:

```text
Use in Fashion Blueprint
```

Owner commands:

```text
Edit Character
Change display cover (only when supported)
More actions
```

Action visibility matrix:

| Condition | Scene Builder | Fashion Blueprint | Edit | Sharing settings |
|---|---:|---:|---:|---:|
| Owner + approved + destination enabled | show | show when enabled | show | show |
| Viewer + public reusable | show when enabled | show when enabled | hide | hide |
| Viewer + view only | hide | hide | hide | hide |
| Owner draft/review | hide until eligible | hide until eligible | show | hide until approved |
| Unsupported destination | hide | hide | unchanged | unchanged |

Do not render disabled primary actions merely to match the reference image.
Unsupported or unavailable actions are removed from the interaction and
accessibility trees.

## 5. Usage Statistics

Render one reusable statistics row immediately below the hero:

```text
Generated images
Fashion
Scene / Story
Other
```

Rules:

- use privacy-safe server aggregates only
- never expose identities of users who reused the Character
- render zero explicitly
- use stable dimensions so changing counts does not shift the page
- compact number formatting is presentation only; raw numbers remain available
  to assistive technology

## 6. Public Work Section

Display public work associated with the Character below the statistics.

Data source:

```text
GET /api/character-profiles/:id/works?cursor=&limit=
```

Requirements:

- use existing Community media/lightbox behavior
- only include public, active and moderation-eligible records
- image and title perform the same open action
- use lazy-loaded media with a stable aspect ratio
- show an intentional empty state with a relevant create action for the owner
- visitors see an empty message without owner-only commands
- support cursor pagination or a bounded View all action; do not fetch all work

This section must use a reusable media-grid/card adapter. Do not copy Community
post card logic into the Character page.

## 7. Owner Sharing Settings

Only an approved Character owner may see the settings panel.

The panel controls two independent dimensions:

```text
visibility
  private
  unlisted
  public

reusePolicy
  owner_only
  view_only
  public_reusable
```

The UI must:

- show the effective result in plain language
- request the rights declaration only for `public_reusable`
- require explicit Save; selection changes must not persist immediately
- disable Save while submitting
- announce success/error through a live status region
- preserve the server value after request failure
- provide Preview as visitor without changing ownership or persisted settings

The server remains authoritative. All mutations use `req.actorContext` and
optimistic `recordVersion`; body/query usernames are not trusted.

## 8. Responsive UX

Desktop:

- media and summary use approximately a 55/45 split
- statistics remain one horizontal row
- work and owner settings may use a balanced two-column lower layout when both
  are present

Tablet:

- media and summary may remain side by side while space permits
- action buttons wrap without clipping
- lower sections stack when controls become constrained

Mobile:

- one-column hero with media first
- primary destination action spans the available width
- secondary and owner commands follow in clear priority
- statistics use two columns
- all interactive targets are at least 44px
- no horizontal page overflow

Do not scale font size directly from viewport width.

## 9. Accessibility

- one `h1` and sequential section headings
- meaningful alt text for Character media
- creator and breadcrumb navigation use actual links
- availability is not communicated by color alone
- icon-only controls have localized accessible names and tooltips
- visible keyboard focus
- native buttons and links; no clickable generic containers
- lightbox restores focus to its triggering control
- Preview as visitor clearly announces the active viewing context
- owner-only controls are not merely visually hidden

## 10. Component Architecture

Keep `client/character-profiles/characterProfilePage.js` as route and page-model
orchestration. Extract reusable presentation behavior instead of expanding the
existing template string.

Create or refactor under the existing capability:

```text
client/character-profiles/
  characterProfilePage.js
    route activation, loading/error state and component composition

  characterProfileHero.js
    media, identity, badges, permission-aware actions

  characterProfileStats.js
    reusable privacy-safe usage summary

  characterProfileWorks.js
    paged work section using shared Community media adapters

  characterSharingPanel.js
    owner visibility/reuse controls and effective-policy summary

  characterProfileViewMode.js
    owner/visitor preview state without persistence
```

Reuse rather than copy:

```text
client/character-profiles/characterProfileApi.js
client/character-profiles/characterProfileEditor.js
client/character-profiles/characterHandoff.js
client/community/creatorProfileComponents.js or a promoted shared media adapter
client/core/lightboxService.js
client/core/apiClient.js
client/shell/router.js
```

If a card or statistics component is required by both Creator Profile and
Character Profile, promote the smallest presentation component to the nearest
shared owner. Do not make Character Profile depend on Creator Profile page
state.

All components receive model data, capabilities and callbacks. They must not
call AI providers, mutate the generation queue or create a second Character
state.

## 11. Server and Data Impact

Existing endpoints should remain authoritative:

```text
GET   /api/character-profiles/:id
GET   /api/community/character-profiles/:id
GET   /api/character-profiles/:id/works
PATCH /api/character-profiles/:id
PATCH /api/character-profiles/:id/sharing
POST  /api/character-profiles/:id/handoff
```

Add display-cover fields only when Change Cover is delivered:

```text
presentation.displayCoverSource: canonical | public_work
presentation.displayCoverPostId: string | null
```

Suggested optional endpoint:

```text
PATCH /api/character-profiles/:id/presentation
Input:
  recordVersion
  displayCoverSource
  displayCoverPostId

Process:
  resolve req.actorContext
  require ownership
  validate same-character public work
  validate moderation/media availability
  update repository with optimistic version

Output:
  updated Character Profile public/owner view model
```

Repository location:

```text
server/repositories/character-profiles/
```

Runtime data remains under:

```text
server/data/character-profiles/
```

No new runtime JSON file is required solely for this UI adjustment.

## 12. Localization

All visible strings use `client/core/i18nService.js`.

Add keys to the existing Character Profile namespace for:

- view context and Preview as visitor
- media actions and unavailable state
- destination action labels
- availability explanations
- statistics
- public works empty states
- display-cover controls
- sharing policy effective summaries
- save/loading/error states

Maintain key and interpolation parity for every enabled locale. Character names,
personality text and generated prompt data remain runtime data and must not enter
translation catalogs.

## 13. Implementation Plan

### Step 1 - Page Model and Permission Audit

1. Map the current owner and public Character Profile responses.
2. Confirm every required hero, status, destination and statistics field.
3. Add a small client adapter only when owner/public responses differ.
4. Do not expose private source references to fill missing UI fields.

### Step 2 - Component Extraction

1. Extract sharing controls from `characterProfilePage.js`.
2. Extract hero/actions without changing existing handoff callbacks.
3. Extract statistics and public works.
4. Keep route activation and request invalidation in the page controller.
5. Register scripts in dependency order in `client/index.html`.

### Step 3 - Visual Composition

1. Apply the media/summary hero layout from the reference.
2. Remove angle-selector concepts entirely.
3. Add statistics and lower-section layout.
4. Use neutral media framing and existing application palette.
5. Add owner/viewer context and responsive states.

### Step 4 - Optional Display Cover

Implement only if the canonical contracts support it in the same delivery:

1. Add presentation fields to Character Profile normalization.
2. Add repository/domain ownership validation.
3. Add the owner cover picker using eligible Character work.
4. Keep handoff bound to the canonical reference.

Otherwise hide Change Cover and record it as a deferred capability. Do not ship
a placeholder button.

### Step 5 - Validation

1. Validate owner, public reusable, view-only and draft profiles.
2. Validate Scene and Fashion destination capability combinations.
3. Validate missing/broken media.
4. Validate empty and populated work sections.
5. Validate actor switching on the same route.
6. Validate EN/TH catalog parity.
7. Validate desktop and mobile layout.

## 14. Files Expected to Change

Modify:

```text
client/character-profiles/characterProfilePage.js
client/character-profiles/characterProfileApi.js
client/index.html
client/style.css
client/i18n/locales/en/character-profiles.json
client/i18n/locales/th/character-profiles.json
```

Create only when extraction produces a meaningful ownership boundary:

```text
client/character-profiles/characterProfileHero.js
client/character-profiles/characterProfileStats.js
client/character-profiles/characterProfileWorks.js
client/character-profiles/characterSharingPanel.js
client/character-profiles/characterProfileViewMode.js
```

Optional display-cover delivery may additionally modify:

```text
server/domain/character-profiles/
server/repositories/character-profiles/
server/app/routes/characterProfileRoutes.js
test/characterProfileRepository.test.js
test/characterProfileRoutes.test.js
```

## 15. Testing

Automated coverage:

```text
test/characterProfilePageModel.test.js
test/characterProfilePermissionMatrix.test.js
test/characterProfileSharing.test.js
test/characterProfileWorks.test.js
test/characterProfileHandoff.test.js
test/i18nCatalogParity.test.js
```

Required cases:

1. Owner approved Reusable Model sees both supported destinations and settings.
2. Public reusable viewer sees allowed destinations but no owner controls.
3. View-only viewer sees profile/work but no generation action.
4. Draft owner sees edit/review actions and no invalid handoff.
5. Styled Character never exposes Fashion unless its canonical reusable
   conversion supports that destination.
6. Public response contains no private source reference or owner-only mutation
   metadata.
7. Broken media renders an intentional state without leaking a path.
8. Display cover cannot reference another owner or another Character.
9. Changing display cover does not change handoff reference IDs.
10. Actor switching removes stale owner controls before the new response renders.

Manual UI validation:

1. Open the same Character as owner and visitor.
2. Verify the single-image hero and absence of angle controls.
3. Open image zoom and restore keyboard focus.
4. Edit Character and verify the page refreshes without route loss.
5. Use Scene Builder and Fashion Blueprint when permitted.
6. Save sharing settings, reload and verify persistence.
7. Preview as visitor and return to owner mode.
8. Test 1440px desktop, 768px tablet and 390px mobile widths.

Agents must not run Node commands in this repository. Ask the user to run:

```powershell
node --check client/character-profiles/characterProfilePage.js
node --check client/character-profiles/characterProfileHero.js
node --check client/character-profiles/characterProfileStats.js
node --check client/character-profiles/characterProfileWorks.js
node --check client/character-profiles/characterSharingPanel.js
node --check client/character-profiles/characterProfileViewMode.js
node --test test/characterProfilePageModel.test.js test/characterProfilePermissionMatrix.test.js test/characterProfileSharing.test.js test/characterProfileWorks.test.js test/characterProfileHandoff.test.js test/i18nCatalogParity.test.js
```

Run checks only for files created by the implementation.

## 16. Acceptance Criteria

- The page follows the hierarchy of `002-mode-character.png`.
- Only one primary Character image is shown.
- No front/side/back selectors are rendered.
- Canonical handoff remains unchanged by profile presentation.
- Owner and visitor controls follow the permission matrix.
- Scene/Fashion commands use existing handoff services.
- public work uses existing Community media/lightbox behavior.
- owner sharing settings remain explicit, accessible and server-authoritative.
- no private references or owner-only controls leak to public responses.
- desktop/mobile layouts have no overlap, clipping or horizontal page overflow.
- new UI behavior is componentized within the Character Profile capability.
