# User and Creator Profile Master Roadmap

**Status:** Implemented; automated and browser acceptance pending  
**Goal:** Replace isolated user shortcuts with one reusable profile experience
that serves both public visitors and the profile owner.

**Visual reference:** [`user-profile-concpet.png`](./user-profile-concpet.png)
defines the intended information hierarchy, hero proportions, Overview
composition and desktop density. It is directional rather than a pixel-perfect
specification; accessibility, responsive behavior and the existing application
design system take precedence.

## 1. Product Outcome

The same profile page must support two contexts:

```text
Public visitor
-> discover a creator
-> inspect public work, Characters, Templates, Comparisons and Collections
-> follow, engage or reuse allowed assets

Profile owner
-> see the same public presentation
-> enter Manage mode
-> edit profile presentation, curate featured content and manage visibility
-> open existing feature-specific editors without duplicating them
```

The page must look like one coherent creator portfolio. It must not become a
second History page, a second Community feed, or a second admin console.

## 2. Design Direction

Desktop composition:

```text
Profile hero: avatar, cover, identity, roles, public counts, actions
Profile tabs: Overview | Gallery | Characters | Templates | Comparisons | Collections

Main column                                       Supporting column
- Featured works                                 - Creator statistics
- Popular Characters                             - Latest public Collection
- Popular Templates                              - About creator
- Recent Comparisons                             - Follow/owner action
```

Responsive composition:

- desktop: 12-column layout with main content and supporting rail
- tablet: supporting rail moves below the primary content
- mobile: one column; tabs and media rails scroll horizontally
- no viewport-width font scaling and no overlapping controls

## 3. MVP Scope

Included:

- one route family and one component tree for owner/public views
- profile hero and public creator presentation
- direct profile entry from the active-user control
- Overview with bounded featured previews
- Gallery, Characters, Templates, Comparisons and Collections tabs
- existing Follow, Community engagement, reuse and lightbox actions
- owner Manage mode with profile editing, curation and visibility actions
- privacy-safe aggregate counts
- desktop/mobile accessibility and actor-switch isolation

Prepared but not exposed:

- Saved tab
- Drafts tab
- creator ranking
- verified/featured badge administration
- revenue, royalties and marketplace earnings
- subscriptions or membership
- private operational analytics

## 4. Non-Duplication Contract

This phase is a composition layer over existing capabilities.

| Profile content | Canonical owner to reuse |
|---|---|
| Creator identity and follow | `CreatorProfileService`, creator repositories |
| Public generated work | `CommunityPostRepository` and public post view |
| Curated Gallery | `CommunityGalleryService` |
| Character Profile | `CharacterProfileSharingService` |
| Templates | canonical Community template/post contract |
| Comparisons | shared comparison card/workspace components |
| Collections | canonical Community collection contract |
| Engagement | `CommunityEngagementService` and shared engagement UI |
| Lightbox | existing shared lightbox service |
| Router | `window.ModelPromptForgeRouter` |
| Actor | `req.actorContext` and `ModelPromptForgeActorContext` |
| Localization | `ModelPromptForgeI18n` and locale catalogs |

Forbidden:

- a new profile-specific post, Character, Template, Comparison or Collection
  repository
- copying Community card markup into Profile Page
- checking a username in client code to decide ownership
- exposing History, private references, raw prompts or provider payloads
- loading every tab on first page open
- one API request per card

Shared composition components required by the visual reference:

```text
CreatorProfileSection
- standard section heading, count, View All action and state handling
- variants: grid | rail | mosaic

CreatorStatsSummary
- one statistics model
- variants: hero | sidebar

CreatorContentCardAdapter
- maps Profile Page models into canonical Community, Character, Template,
  Comparison and Collection components
- contains no copied card markup or business policy
```

## 5. Canonical Page Contract

The server must expose a normalized `CreatorProfilePageModel`. Its selected tab
payload is a discriminated object so every tab does not invent a response.

```text
CreatorProfilePageModel
- schemaVersion
- profile
  - id
  - handle
  - displayName
  - bio
  - avatarUrl | null
  - coverImageUrl | null
  - creatorRoles[]
  - locationText | null
  - websiteUrl | null
  - languageCodes[]
  - contentCategoryCodes[]
  - createdAt
- viewer
  - isOwner
  - isFollowing
  - canEditProfile
  - canManageContent
  - canFollow
  - canReport
- counts
  - followers
  - following
  - publicPosts
  - publicCharacters
- capabilities
  - availableTabs[]
  - defaultTab
  - managementAvailable
- selectedTab
- tabData
- overview | null
```

The public model must never expose `userId`, email, auth provider, credit
balance, internal roles, private content counts or raw storage paths.

## 6. Delivery Sequence

| Step | Requirement | Produces |
|---|---|---|
| 001 | Canonical contract and query service | Stable page model and permission context |
| 002 | Shell, routing and account entry | One route family and reusable page shell |
| 003 | Hero and profile presentation | Public/owner header with safe editing |
| 004 | Overview composition | Featured content and supporting rail |
| 005 | Content tabs | Lazy, paginated reusable sections |
| 006 | Owner Manage mode | Curation and feature-owned management actions |
| 007 | Statistics, follow and public safety | Privacy-safe metrics and moderation |
| 008 | Responsive, accessibility and release gates | Migration, E2E and launch readiness |

Each step depends only on completed contracts above it. Later steps must extend
the page registry instead of modifying earlier rendering branches.

## 7. Route Strategy

Canonical routes:

```text
/creators/:handle
/creators/:handle/gallery
/creators/:handle/characters
/creators/:handle/templates
/creators/:handle/comparisons
/creators/:handle/collections
```

The base route displays Overview. All routes mount the same page shell. The
active tab is derived from the route, not stored as a competing global state.

`My Profile` first resolves the actor's creator handle through the existing
`/api/community/creator-profiles/me` endpoint and then navigates to the
canonical public URL. Do not create `/my-profile` or `/my-characters` pages.

## 8. Data and Migration Policy

- Extend the existing Creator Profile record for public presentation settings.
- Store only IDs for featured/cover content; never copy media bytes.
- Missing optional presentation fields normalize at read time.
- Existing creator records remain valid without a bulk migration.
- Public sections query canonical repositories using bounded pagination.
- JSON MVP repositories remain replaceable by database adapters.

## 9. Cross-Cutting Requirements

- Every server mutation derives owner identity from `req.actorContext`.
- Every public response passes canonical visibility and sanitization policies.
- Actor switching aborts stale requests and refreshes owner-relative controls.
- New visible strings use `community` or a dedicated `creator-profile`
  localization namespace with enabled-locale parity.
- Legacy route changes remain browser-native IIFEs while the legacy runtime owns
  the route. The approved React replacement follows
  `requirements/009-migration-to-react/006-creator-user-and-character-profile-migration.md`.
- Owner controls are hidden when unavailable, not merely disabled.
- Manage mode must not alter the public layout until the owner explicitly edits.

## 10. Overall Exit Criteria

1. Public and owner views use the same shell and section components.
2. The owner can reach the profile from the user control without a floating
   `My Characters` action.
3. Public visitors see only approved, published content.
4. Profile tabs reuse canonical content APIs and interactions.
5. Owner management delegates to feature-owned mutations.
6. Direct routes, browser back/forward and actor switching remain correct.
7. Desktop and mobile layouts pass keyboard, focus and overflow checks.
8. Existing Community, Character, Comparison and Collection tests remain green.
