# Character Visibility, Works And Featured Image Contract

**Status:** Proposed for product review; implementation pending  
**Owner:** Character Profiles  
**Related:** `003-character-sharing-privacy-and-reuse.md`,
`008-character-approval-and-generation-library-flow.md`,
`009-character-profile-concept-showcase.md`

## 1. Problem

Character approval, Character visibility, reuse permission, generated-work
visibility and the selected profile image are independent controls. The current
UI presents them close together without explaining their boundaries. It also
uses different result sets on owner and public pages, causing an approved
Character to appear missing and leaving some Characters with no selectable
featured-image candidates.

This requirement defines one display and selection contract before behavior is
changed.

## 2. Terms And Independent State

| State | Meaning | Does not mean |
|---|---|---|
| Character `draft` / `review` | Identity pack is awaiting owner approval | It is public |
| Character `approved` | Canonical Character version can be used by its owner | It is shared |
| `visibility: private` | Owner/admin can see the Character | Other users can discover it |
| `visibility: unlisted` | Direct-link access under policy | It appears in Creator or Explore lists |
| `visibility: public` | Character can appear in public Creator/Explore lists | Other users may reuse it |
| `reusePolicy: owner_only` | Only the owner may generate with it | The public preview must be hidden |
| `reusePolicy: view_only` | Public users may inspect but not reuse it | The Character is private |
| `reusePolicy: public_reusable` | Authorized users may hand it to supported create flows | Source references or prompts are public |
| Community work post | One generated image was shared publicly | The Character itself is public |
| Featured image | Presentation image selected for Character cards/profile | Canonical generation reference was replaced |

Approval, publishing and reuse must be separate explicit actions. Sharing a
generated image must not silently publish its Character, and publishing a
Character must not silently publish private generated images.

## 3. Route And Audience Matrix

| Route | Audience | Character set | Works shown | Featured-image management |
|---|---|---|---|---|
| `/me/characters` | Owner | All owned non-deleted Characters in draft, review or approved state | Summary only | No; opens owner detail |
| `/me/characters/:id` | Owner | Exact owned Character regardless of public visibility | Owner-eligible generated results plus public Community works using this Character | Yes |
| `/profiles/:creator/characters` | Public Creator world, including when viewed by owner | Only approved, active, `visibility: public` Characters | Public presentation only | No |
| `/characters/:id` or canonical public detail | Public/direct link | Public, or unlisted when direct-link policy permits | Only public Community works using this Character | No |
| `/explore/characters` | Public discovery | Approved active public Characters | Public presentation only | No |

The owner must use `/me/characters` to manage private work. A Creator Profile is
the creator's public world and must not leak private Characters merely because
the current viewer is also the owner.

## 4. Character Publication Matrix

| Approval | Visibility | Reuse policy | Creator page | Explore | Owner use | Other-user use |
|---|---|---|---|---|---|---|
| draft/review | private | owner_only | hidden | hidden | blocked until approved where canonical reference is required | blocked |
| approved | private | owner_only | hidden | hidden | enabled | blocked |
| approved | unlisted | view_only | hidden | hidden | enabled | view by authorized direct link only |
| approved | public | view_only | shown | shown | enabled | view only |
| approved | public | public_reusable | shown | shown | enabled | enabled for supported destinations after server authorization |

Public publication requires a clear owner control containing:

1. visibility;
2. reuse permission;
3. rights declaration when `public_reusable` is selected;
4. a concise result preview such as `Public, view only` or
   `Public, available to use`;
5. success/error notification after save.

Client option values must use the canonical server value
`public_reusable`. A compatibility value such as `public_reuse` must not be
silently submitted or silently fall back to the previous policy.

## 5. Character Works Contract

Every generated result that uses a Character must persist:

```text
characterProfileContext.characterProfileId
characterProfileContext.characterProfileVersionId
characterProfileContext.sourceType
characterProfileContext.useCase
```

Owner detail has two presentation filters over one lineage source:

- **My Character generations:** renderable results owned by the Character
  owner, whether shared or private;
- **Shared Character works:** public Community posts whose source result carries
  this Character lineage, including another user's result when publicly shared.

Public detail exposes only **Shared Character works**. It must never expose
another user's private result or the owner's unshared result.

The immutable source Character Sheet/Casting Export is identity source media,
not a normal downstream creation. It may be offered as the fallback profile
image but should be labeled `Original Character reference`, not mixed into the
Creations feed.

## 6. Featured Image Candidate Rules

Only the Character owner can change its featured image. Eligible candidates are
evaluated in this order:

1. owner-owned renderable generation using the exact Character Profile;
2. public Community post using the exact Character Profile, regardless of who
   generated it;
3. canonical Character front/casting preview as the fallback candidate.

Rules:

- owner generation does not need to be shared;
- another user's generation is eligible only through an active public
  Community post;
- a source must match `characterProfileId`; version ID is retained for ranking
  and explanation;
- system-internal proxy/dummy images are never candidates;
- the canonical reference fallback must remain selectable even when its source
  generation predates creation of the Character Profile and therefore lacks
  `characterProfileContext`;
- changing the featured image updates presentation only and never changes the
  canonical Character reference used by generation;
- automatic mode prefers the newest owner generation for the active version,
  then the strongest public Community work, then the canonical fallback;
- manual mode remains stable until the selected media becomes ineligible, at
  which point UI explains the fallback rather than silently appearing blank.

## 7. Owner Detail UX

`/me/characters/:id` must make the following visible without requiring product
knowledge:

- approval status;
- publication status: `Private`, `Unlisted` or `Public`;
- reuse status: `Owner only`, `View only` or `Available to use`;
- current featured-image source;
- a `Change profile image` entry point near the current Character image;
- candidate filters: `My generations`, `Shared works`, `Original reference`;
- an empty-state explanation when no downstream generation exists;
- a direct action to use the Character in a supported flow so the owner can
  create the first eligible image.

The Creations tab and featured-image picker may share a lineage query/model but
must retain different presentation responsibilities. The picker selects one
eligible item; Creations browses the complete bounded history.

## 8. Audited Example

Character:

```text
charprof_1786278727204_wc2e9zlv
owner: usr_alice
creatorProfileId: creator_alice
status: approved
visibility: private
reusePolicy: owner_only
activeVersionId: charver_1786278727209_exgqwxke
canonical asset: job_1786278584500_mtc3up510
featuredImageMode: auto
manual featured selection: none
```

Expected under this contract:

- appears in `/me/characters` and its owner detail;
- does not appear in `/profiles/creator_alice/characters` while private;
- remains usable by Alice;
- shows its canonical casting/front preview as the automatic fallback and as a
  labeled selectable candidate;
- currently has no downstream Character generations discoverable by Profile ID
  because the source generation predates the Profile and contains no
  `characterProfileContext.characterProfileId`;
- appears on the public Creator page only after Alice explicitly changes
  visibility to `public`; other-user reuse additionally requires
  `public_reusable` and the rights declaration.

## 9. Known Current Gaps

1. The canonical source generation is not included in featured-image candidates
   because candidate discovery currently relies on `characterProfileContext`.
2. Owner Character Creations currently calls the public-works endpoint, so it
   cannot show private same-owner generations.
3. The owner sharing form uses `public_reuse`, while the server contract accepts
   `public_reusable`, and the form has no rights-declaration input. Public reuse
   can therefore fail or retain the previous policy without a useful
   explanation.
4. Publication, reuse and generated-work sharing need explicit state summaries
   so users do not infer one from another.

### 9.1 Scene handoff lineage regression

Manual verification on 2026-08-09 found that
`job_1786283170133_xxlg606cb` dispatched one raw `character_reference` while
persisting `characterProfileContext: null`, no Character Profile/version IDs,
and no canonical Character face expansion. Consequently the owner Works and
featured-image candidate queries could not associate the result with
`charprof_1786278727204_wc2e9zlv`.

The owner Profile action must navigate directly to the canonical Scene route
and carry the authorized Character handoff in both actor-scoped short-lived
storage and React Router state. Scene Builder accepts route state only when it
contains the destination, canonical Character URL, Profile ID and Version ID;
server Generation validation remains authoritative. A raw History image remains
a raw Character Reference and must not be silently promoted into a system
Character Profile.

Implementation correction:

- `CharacterProfileRoute` now navigates directly to
  `/create/studio/scene` and supplies the authorized handoff through both
  transport mechanisms;
- Scene Builder hydrates the system Character from validated navigation state
  first and keeps actor-scoped session handoff as the refresh/compatibility
  transport;
- malformed navigation state containing only a raw image URL is rejected as a
  Character Profile handoff; and
- focused React tests preserve Profile ID and Version ID across navigation.

The Character Profiles capability must also mark every authorized downstream
handoff with `characterProfileContext.purpose = character_usage`. This is the
Generation contract that activates canonical three-view/face expansion and
persists Character lineage. Profile ID and Version ID without this purpose are
not a complete system Character handoff.

Owner-only Character media shown in Reference controls must load through the
authenticated media client rather than a raw `<img>` request, because browser
image requests cannot attach the active mock-actor header. Canonical Character
image and face URLs are classified as `character` sources by Reference
Processing; using an authorized original is normal and must not produce an
upload-preprocessing fallback warning.

## 10. Proposed Implementation Ownership

- Character Profiles owns visibility/reuse updates, candidate eligibility,
  featured selection and owner/public Character projections.
- Generation owns persistence of Character lineage on every downstream result.
- Community owns publication and public-post visibility, not Character
  identity or featured-image policy.
- React Profile routes consume separate owner/public contracts and must not
  reconstruct authorization rules.

Canonical implementation areas:

```text
server/domain/character-profiles/CharacterProfileSharingService.js
server/repositories/generation/GenerationResultRepository.js
server/app/routes/characterProfileRoutes.js
web/src/features/profiles/routes/CharacterProfileRoute.tsx
web/src/components/profiles/CharacterFeaturedImagePicker.tsx
```

## 11. Review Decisions Before Implementation

- [ ] Confirm that Creator Profile remains a strictly public view even for its
  owner.
- [ ] Confirm that the original canonical Character preview is selectable, not
  only an automatic fallback.
- [ ] Confirm that owner detail shows private owner generations and public
  Community works in separate filters.
- [ ] Confirm that publishing a Character and sharing a generated image remain
  separate actions.
- [ ] Confirm that `public + owner_only` is either supported as a public preview
  or normalized to the clearer `public + view_only` combination.
