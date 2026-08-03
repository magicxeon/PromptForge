# UI-020 Creator Profile Showcase And Scoped Theme

**Status:** Implemented; automated validation passed, owner theme persistence awaits manual review  
**Depends on:** UI-018 My Library And Profile Ownership Experience  
**Visual reference:** `020-user-profile-concept.png`  
**Required reading:** `../Knowledge/ui-design-system-and-visual-language.md`

## 1. Purpose

Turn Creator Profile into an attractive public showcase rather than a plain
resource grid. The page must help a visitor understand the Creator, inspect
their strongest work and continue into reusable Characters, Templates,
Comparisons and Collections without learning Momelo's internal structure.

The visual reference defines hierarchy and density. Existing API ownership,
permissions, canonical routes and public snapshot policies remain
authoritative.

## 2. Profile Information Architecture

```text
Creator Hero
  identity, headline, roles, bio, public counts, Follow/Edit and Share
Profile Tabs
  Overview, Works, Characters, Templates, Comparisons, Collections
Overview
  Featured Work + Creator Highlights
  Popular Characters
  Trending Templates
  Latest Comparison
  Curated Collection
```

Only sections with eligible public content render. Empty sections do not leave
large decorative gaps. Owner management controls appear through the same
components and are gated by the server viewer projection.

## 3. Reusable Component Contract

- `CreatorProfileHero` owns the media-first cover presentation and profile
  identity layout. Editing state remains route-owned.
- `ProfileOverviewSection` owns the repeated section heading, optional count and
  canonical View all action.
- `CreatorHighlights` displays only real aggregate metrics supplied by the
  server. MVP must not invent profile views or ratings.
- Existing `MediaCard`, `CharacterCard` and `ComparisonThumbnailGrid` remain the
  canonical repeated-resource components or media primitives.
- `CharacterCard` accepts both canonical Character Profile summaries and public
  Community projection summaries. Preview resolution prefers the authorized
  thumbnail, then the canonical display image and finally the original image;
  a missing projection-only `displayImageUrl` must not produce a black card.
- `ProfileFeaturedWork`, `ProfileComparisonCard` and
  `ProfileCollectionMosaic` are typed presentation components and contain no API
  calls.
- Cover-style Profile previews must request the server-approved
  `template-card-person-focus` Sharp Attention presentation through the shared
  media primitive. A failed presentation falls back to the authorized
  thumbnail; React must not implement a second crop algorithm.
- Public and owner Profile modes use the same component tree.

Do not place decorative cards inside cards. Profile sections are structural
surfaces; only repeated resources and genuinely framed highlight tools are
cards.

## 4. View All And Detail Routing

```text
Works View all        /profiles/:profileId/works
Characters View all   /profiles/:profileId/characters
Templates View all    /profiles/:profileId/templates
Comparisons View all  /profiles/:profileId/comparisons
Collections View all  /profiles/:profileId/collections
Featured work         /posts/:postId
Public Template       /posts/:postId
Public Comparison     /posts/:postId
Public Collection     /posts/:postId
Public Character      /characters/:characterId
```

Every detail link carries the shared actor-safe return context. Owner-only
Collection management continues under `/library/collections/:collectionId`.

## 5. Scoped Creator Theme

Two theme values remain separately persisted:

```text
viewerThemePreference
  actor-scoped local preference for the application shell

profilePresentationTheme
  public Creator-owned presentation value persisted on the server
```

An explicit selection from the global Footer theme control updates both the
active actor's local viewer preference and that actor's public Profile theme.
This gives the owner one obvious control and ensures visitors see the same
Creator world later. Selecting `auto` persists the theme resolved for the
current route as the public Profile theme. A visitor opening another Creator's
Profile never overwrites their own viewer preference.

Allowed MVP Profile themes are `default`, `fashion` and `creative`. Unknown or
missing values normalize to `default`.

The Creator theme applies only to the Profile canvas: Hero, tabs and Profile
sections. Header, Sidebar and global Footer retain the viewer theme. The
Profile canvas introduces a restrained edge blend from the surrounding shell
surface into the Creator theme so the transition appears intentional without
changing global document theme or local storage.

Implementation requirements:

- use inherited semantic `--theme-*` tokens under a scoped Profile attribute;
- use CSS gradients only, with no canvas, blur filter or continuously running
  animation;
- never mutate `documentElement[data-theme]` for Profile presentation;
- preserve readable contrast for all three themes;
- avoid incorrect-theme flash by rendering the scoped theme from the parsed
  Profile response;
- leaving Profile automatically reveals the unchanged viewer theme because no
  global preference was modified.

## 6. Data Contract

Extend Creator Profile presentation with:

```json
{
  "profileTheme": "default | fashion | creative"
}
```

The field is public presentation metadata, not the viewer's application theme
preference. Owner updates are normalized, record-versioned and returned through
the existing public Profile page projection.

MVP highlights use existing Followers, Likes, Uses/Remixes and Votes. Profile
views, ratings and revenue remain absent until durable measurement domains own
them.

## 7. Responsive And Accessibility

- Desktop uses the concept's media-first asymmetric overview without creating
  horizontal page scrolling.
- Tablet and mobile collapse to one column while keeping Hero actions and tabs
  reachable.
- Cover and primary work preserve useful focal framing; inspection detail pages
  continue to use original media.
- View all, Follow, Share and Edit have accessible names and keyboard focus.
- Tabs use canonical links and identify the active page.
- Thai and English labels must fit without clipped headings or controls.
- Empty, loading and error states keep stable page rhythm.

## 8. Implementation Sequence

1. Add normalized public `profileTheme` persistence and server regression
   coverage.
2. Extend the React Zod boundary and owner edit payload.
3. Build typed reusable Profile presentation components.
4. Refactor Overview and tab links around canonical route builders.
5. Add scoped semantic theme tokens, edge blend and responsive styling.
6. Validate owner/viewer mode, actor switching, all Profile themes and View all
   destinations on desktop/mobile.

## 9. Acceptance Criteria

- A visitor can identify the Creator and their strongest work in the first
  viewport.
- Profile Overview presents real content and metrics with no mock public data.
- Every View all action opens the matching canonical Profile tab.
- Owner and visitor reuse the same components with permission-aware actions.
- Creator theme changes only the Profile canvas and never overwrites a
  visitor's stored theme; an owner's explicit Footer selection also publishes
  that selection to their own Profile.
- Shell-to-Profile theme transition is visually blended without measurable
  interaction or scrolling cost.
- Existing legacy Profile links, actor switching and public sanitization remain
  functional.

## 10. Checkpoint And Manual Verify

Record after implementation:

| Check | Result | Remark |
|---|---|---|
| Default Creator Profile from a Fashion viewer | Automated pass | Scoped token test confirms root viewer theme is unchanged |
| Creative Creator Profile from a Default viewer | Automated pass | Profile-only Creative tokens and static edge blend |
| Owner selects Pearl and refreshes | Automated pass | Live API persists `fashion`; scoped canvas renders Pearl while shell remains viewer-owned |
| Another actor visits the Creator | Automated pass | Demo receives Alice's persisted `fashion` Profile theme and retains Demo's shell preference |
| Every Overview View all destination | Automated pass | Canonical Profile-tab component regression added |
| Empty optional sections | Automated pass | Optional Overview sections are omitted when empty |
| Desktop 1440px and mobile 390px | Automated pass | Playwright desktop and Pixel 7; no horizontal overflow |
| Thai and English | Automated pass | Catalog parity and responsive visual inspection passed |

### Runtime freshness regression

The development launcher must restart an existing ModelPromptForge API on port
6500 instead of reusing an already-loaded Node process. Reusing the process can
serve a new React bundle with stale server contracts, producing false failures
such as a missing `profileTheme` and zero projected Characters. The Windows
launcher verifies the port belongs to ModelPromptForge through its feature API,
stops the existing listener and starts a fresh nodemon-owned API before Vite.
