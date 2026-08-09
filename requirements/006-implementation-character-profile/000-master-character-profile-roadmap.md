# Character Profile Master Roadmap

**Status:** In progress - photorealistic silhouette casting policy implemented, validation pending
**Goal:** Turn an approved Character Sheet into a named, reusable and optionally
public Character Profile.

## 1. Product Outcome

A user can:

1. Create a character through the existing Headshot and Character Sheet flow.
2. Name the character and add a short personality/usage description.
3. Generate the initial Reusable Model as a standardized photorealistic
   Character Casting Sheet in a modest opaque medium-gray fitted outfit with a
   thin white contour grid.
4. Pay once for that initial generation; a second export generation is not
   required when the result already satisfies the casting contract.
5. Keep the profile private or share it for other users.
6. Discover shared Characters from a dedicated Character section in Community.
7. Open a profile page showing creator attribution and privacy-safe usage
   statistics.
8. Select the Character later from Fashion Blueprint or Scene Builder when the
   creator's reuse policy permits it.

Character Profiles are reusable production assets, not ordinary Community posts
and not raw uploaded face references.

## 1.1 Character Type Contract

Character Sheet Builder must ask for the Character purpose before Clothing is
configured. This is a first-class type, not a Clothing checkbox:

```text
reusable_model
- neutral identity/body production asset
- Casting Uniform replaces ordinary Clothing controls
- Clothing presets, colors, pattern, material, custom write-in and Outfit
  Reference upload are not rendered as interactive choices
- the initial Character Sheet generation is already the three-view Casting
  candidate
- compatible with Fashion Blueprint and Scene Builder

styled_character
- identity plus an outfit-bound look
- ordinary Clothing controls and Outfit References remain available
- the approved Character Sheet is the canonical reference
- compatible with Scene Builder only
- must be converted through a new Casting Export version before Fashion use
```

Legacy profiles and Character Sheet results without `characterType` normalize to
`reusable_model`.

The selector and its capability labels are owned by the reusable
`client/character-profiles/characterTypeControl.js` component. Character Sheet,
Character Profile and future Fashion pickers consume this shared contract rather
than recreating separate controls.

## 2. Scope Decisions

MVP decisions:

- Standard export contains three views: front, exact side profile and back,
  arranged side by side with every figure visible from head to feet.
- The current casting outfit is opaque, non-revealing, unbranded and
  medium-gray with a white contour grid on a light warm-gray studio background.
- Only a generated/approved canonical export may become publicly reusable.
- Private source uploads, Base64 payloads and provider request payloads are never
  published.
- Public usage statistics count successful generations and expose aggregates,
  not identities of users who reused the Character.
- Character reuse is free in the first MVP. Attribution and usage counts are
  recorded; royalties and marketplace payouts are deferred.
- Public Character reuse does not transfer ownership.
- Community has a dedicated Character discovery section; public Characters must
  not be mixed into ordinary image cards without a Character type/filter.
- Character cards and pickers visibly distinguish reusable, view-only and
  owner-only Characters before the user opens the detail page.
- Owners may edit name, description, personality and intended usage. Historical
  generation snapshots remain unchanged.

## 3. Existing Contracts To Reuse

| Capability | Canonical owner |
|---|---|
| Character attributes and Character Sheet | `requirements/003-implementation-visual-character-builder-plan` |
| Cross-mode result handoff | `client/core/crossModeHandoff.js` |
| Shared generation UI | `client/generation-controls/` |
| Generation and credit lifecycle | existing client/server generation and credit domains |
| Community public character projection | `CommunityCharacterRepository` and `CommunityGalleryService` |
| Reference sanitization | `server/domain/scene-templates/` |
| Actor and ownership | existing actor context, API client and repository contracts |

Do not create a second Character Builder, generation pipeline, credit balance or
Community character store.

## 4. Requirement Sequence

| Requirement | Purpose | Dependency |
|---|---|---|
| `001-character-profile-domain-and-lifecycle.md` | Canonical profile/schema/state | Existing Character Sheet |
| `002-standardized-character-casting-export.md` | Three-view white casting export | 001, generation/credits |
| `003-character-sharing-privacy-and-reuse.md` | Visibility, reuse and public projection | 001, 002, Community |
| `004-character-profile-page-and-usage-analytics.md` | Profile page and popularity metrics | 003, engagement events |
| `005-fashion-and-scene-character-handoff.md` | Reusable selection contract | 001–004 |
| `006-character-profile-qa-and-release-gates.md` | End-to-end release gates | All above |
| `007-character-community-and-profile-improvements.md` | Community Character row, owner entry, sharing UX and public media correctness | 003, 004, Community |
| `008-character-approval-and-generation-library-flow.md` | Shared Recent Generations, owner approval routes and authenticated draft media | 001, 003, 007, React History |
| `009-character-profile-concept-showcase.md` | Creator-facing Character showcase and featured media | 004, 007, Profiles |
| `010-photorealistic-silhouette-casting-reference.md` | Current v3/v5 photographic casting layout and gender-aware covered outfit | 002, Generation prompt compiler |
| `011-character-visibility-works-and-featured-image-contract.md` | Owner/public visibility matrix, Character works lineage and profile-image eligibility | 003, 008, 009, Generation lineage |

## 5. Architecture

```text
Character Builder output
  -> CharacterProfile draft
  -> Reusable Model: initial standardized result enters review directly
       -> optional paid regenerate for rejection, legacy data or conversion
  -> Styled Character: owner approval of the outfit-bound source sheet
  -> approved canonical CharacterProfileVersion
  -> private profile
       -> optional public CommunityCharacter projection
       -> CharacterSelectionHandoff
            -> Fashion Blueprint
            -> Scene Builder
```

Canonical ownership:

```text
server/domain/character-profiles/
server/repositories/character-profiles/
server/app/routes/characterProfileRoutes.js
client/character-profiles/
```

Community keeps discovery, creator attribution, public media policy and
engagement. It references a Character Profile/version and does not become its
source of truth.

## 6. Cross-Cutting Rules

- Every mutation uses `req.actorContext`; body/query usernames are not trusted.
- Public IDs are opaque and never treated as authorization.
- Character references use asset/result IDs, never durable Base64.
- All generation is quoted, reserved and captured/refunded through central
  credit services.
- Canonical profile versions are immutable after use.
- Public projection is sanitized independently from owner detail.
- All new visible strings use `i18nService`.
- Legacy Character route changes remain browser-native IIFEs while those routes
  are legacy-owned. The approved React replacement follows
  `requirements/009-migration-to-react/006-creator-user-and-character-profile-migration.md`.
- First implementation may use a repository-backed local JSON adapter, but the
  contract must map directly to PostgreSQL in the commercial phase.

## 7. Non-Goals

- Character marketplace sale, royalty or payout
- Voice, biography generation or chat persona
- Face training/fine-tuning
- Guaranteed identity consistency across every provider
- Sharing original private face/outfit uploads
- Team ownership and character ownership transfer

## 8. Exit Criteria

- A paid three-view Reusable Model can be generated once and approved without a
  mandatory duplicate generation.
- Public reuse never exposes private source references.
- A second user can select an allowed Character in Fashion Blueprint.
- Successful usage updates privacy-safe category aggregates exactly once.
- Owner and viewer authorization tests pass.
- Community home shows a dedicated Character row, the active user can open
  `My Characters`, and a second user can view approved public Character media.
- Existing Headshot, Character Sheet and Scene Builder behavior remains intact.
