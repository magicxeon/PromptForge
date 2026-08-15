# User Profile 001 - Canonical Page Contract and Permission Context

**Status:** Implemented; validation pending  
**Depends on:** Community Creator Profile and ownership contracts

## 1. Business Requirement

Profile UI must receive one consistent read model for public and owner views.
The client must not combine ownership, visibility and count rules independently
for each tab.

## 2. Scope

Implement:

- canonical `CreatorProfilePageModel`
- profile presentation defaults and validation
- viewer-relative capability calculation
- bounded Overview query
- selected-tab query contract
- compatibility with existing Creator Profile APIs

Do not implement visual redesign in this step.

## 3. Profile Presentation Schema

Extend the existing Creator Profile record with an optional object:

```text
presentation
- headline: string | null, max 120
- creatorRoles: string[], max 4
- locationText: string | null, max 100
- websiteUrl: string | null, HTTPS only
- languageCodes: string[], max 6
- contentCategoryCodes: string[], max 8
- avatarAssetId: string | null
- coverPostId: string | null
- featuredPostIds: string[], max 4
- featuredCharacterProfileIds: string[], max 4
- featuredTemplatePostIds: string[], max 4
- sectionOrder: known overview section IDs only
```

Unknown keys are discarded. IDs are references to canonical records. The
service validates ownership and public eligibility before returning them.

Existing top-level `avatarAssetId` remains readable during migration. New writes
normalize it into `presentation.avatarAssetId`; do not duplicate media bytes.

## 4. Page Query Design

Add a domain query service:

```text
server/domain/community/CreatorProfilePageService.js
```

Responsibilities:

- resolve profile by handle
- derive viewer permission context
- select the requested tab
- query only the selected tab
- build bounded Overview previews when selected tab is `overview`
- call existing domain/repository contracts
- return only public-safe or owner-authorized data

Recommended endpoint:

```text
GET /api/community/creators/:handle/page?tab=overview&cursor=&limit=
```

One response contains header data plus the selected tab. Existing endpoints
remain operational for old consumers during migration.

## 5. Tab Query Rules

```text
overview
  featured posts max 4
  Characters max 4
  Templates max 4
  Comparisons max 2
  latest Collection max 1

gallery | characters | templates | comparisons | collections
  query selected type only
  default limit 18
  maximum limit 30
  opaque cursor
```

Do not fetch all content and filter in the browser. Do not issue one History
lookup per item. Add a batch repository method only when a canonical equivalent
does not exist.

## 6. Permission Context

Build permissions server-side:

```text
viewer.isOwner
viewer.isFollowing
viewer.canEditProfile
viewer.canManageContent
viewer.canFollow
viewer.canReport
```

Rules:

- ownership uses stable `userId` from actor context
- owner cannot follow or report own profile
- visitors cannot see private/unlisted content unless a canonical direct-link
  policy explicitly permits it
- support/admin capabilities are not automatically exposed as owner controls
- public responses never expose private counts

## 7. File-Level Implementation Plan

Modify:

```text
server/repositories/community/CreatorProfileRepository.js
  - normalize optional presentation fields
  - update owner-owned presentation with optimistic record version

server/domain/community/CreatorProfileService.js
  - preserve existing summary methods
  - delegate expanded page reads to the page query service

server/app/routes/communityCreatorRoutes.js
  - register page endpoint
  - parse tab/cursor/limit only
  - delegate business validation

server/app/createApp.js
  - inject canonical dependencies

server/config/paths.js
  - no new runtime file expected
```

Create:

```text
server/domain/community/CreatorProfilePageService.js
test/creatorProfilePageContract.test.js
```

Do not create a new profile repository or JSON store.

## 8. Input, Process and Output

Input:

```text
handle
tab
cursor
limit
req.actorContext
```

Process:

1. Normalize route input.
2. Resolve active Creator Profile.
3. Build viewer context.
4. Query canonical content source for selected tab.
5. Apply visibility, reuse and media sanitization.
6. Build page model.

Output:

- stable schema version
- public profile presentation
- viewer capabilities
- selected-tab payload
- no raw repository records

## 9. Impact and Risks

- Risk: N+1 reads while calculating counts. Use aggregate/batch methods.
- Risk: old profiles lack presentation. Normalize defaults without migration.
- Risk: public endpoint leaks owner metadata. Use explicit response builders.
- Risk: stale featured IDs. Skip invalid references and preserve page rendering.
- Risk: one tab failure breaks header. Return stable errors; do not silently
  substitute private data.

## 10. Tests

- legacy Creator Profile produces valid defaults
- public viewer receives no private identifiers
- owner receives management capabilities
- actor switch changes viewer capabilities
- invalid tab falls back to Overview or returns stable 400 per contract
- Overview uses bounded limits
- stale featured references are ignored
- selected content belongs to the resolved creator
- private and removed content never appears
- cursor and maximum limit are enforced

## 11. Exit Criteria

- the page model is documented and tested
- no UI-specific permission inference is required
- existing Creator Profile consumers remain compatible
- later steps can render from fixtures without direct repository knowledge
