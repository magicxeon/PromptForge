# 003 Character Gallery Enhancement

Follow-up: `010-character-discovery-identity-master.md` owns the closer-to-concept
identity layout, real public moments, effective availability and shared Create
with entry. Historical scope below remains the baseline, not that follow-up's
completion evidence.

Status: Implemented and verified in scope (2026-09-06)

Route: `/explore/characters`

Owner: Profiles; Community provides public Character discovery data under the existing ownership policy

Visual source: `../Page-Enhancement-resources/003-momelo-characters-gallery-ux-ui-spec.md` and `../Page-Enhancement-resources/003-momelo-characters-gallery-ux-ui-spec-concept.png`

## 1. User Outcome

ผู้ใช้ต้องค้นหา Character ที่เหมาะกับงาน เห็นภาพ identity ที่อนุมัติ ประเภท บุคลิก intended uses และ destination ที่รองรับ แล้วเปิด profile หรือส่งต่อเข้า workflow เดิมได้โดยไม่ต้องเดาความพร้อม

## 2. Protected Existing Behavior

- Directory reads `/api/community/characters` through `profileApi`
- Character detail remains `/characters/:characterId`
- Owner detail and management remain under `/me/characters`
- Fashion, Scene Builder and other handoffs continue through the existing Character handoff policy/API
- Ownership, reusable/public state, featured image, identity look and rights metadata are unchanged
- Shared `CharacterCard` consumers in Profiles and Fashion must retain their default rendering

## 3. Page Structure

1. Character-specific hero and primary path to the existing Character creation workflow
2. Featured Character area using one real eligible public Character, with no fabricated rank
3. Three-step `Discover -> Review identity -> Use in a workflow` strip
4. Search/filter toolbar using only fields supported by the directory API
5. Character discovery grid
6. Compact tutorial mock block
7. Character Studio call-to-action using the current route

`Character of the week`, `Rising stars` and `Top creators` labels from the concept must not ship until ranking windows and metrics exist. The first delivery may use neutral `Featured character` and `More characters` labels.

## 4. Character Card Contract

`CharacterDiscoveryCard` or a backward-compatible `CharacterCard` discovery variant may show:

- Authorized featured/identity media
- Display name and Character type
- Creator identity when public projection allows it
- Short personality summary
- Bounded intended-use tags
- Destination capabilities/reuse state
- Existing output/work count only when the API identifies it as authoritative
- `View character` and eligible handoff actions

Do not expose private look versions, source references, rights declarations or owner-only controls in the public card.

## 5. Interaction Rules

- Card opens the public Character profile
- Handoff destination availability is server/policy driven
- Unsupported destinations are hidden or disabled with an existing reason; they do not silently fall back
- Search/filter changes reset the directory cursor safely
- Hero CTA links to `/create/studio/character`
- Follow/save icons are not rendered as active controls until a Character-specific mutation contract exists

## 6. Detailed Tasks

- `CHR-01` Record current directory query, schema and handoff contract
- `CHR-02` Add the Character hero and real featured candidate presentation
- `CHR-03` Add a discovery-only Character card without changing default consumers
- `CHR-04` Reuse destination/handoff policy and navigation helpers
- `CHR-05` Normalize Character search and filter controls with shared discovery components
- `CHR-06` Add loading, filtered-empty, no-media and unavailable-handoff states
- `CHR-07` Add configured tutorial placeholders and Character Studio CTA
- `CHR-08` Add English/Thai copy
- `CHR-09` Test public/owner visibility and destination permission boundaries
- `CHR-10` Visually regress Fashion, Profile and Cinematic Character selectors that reuse current components

## 7. Acceptance Criteria

1. Public Character cards display only public summary data
2. Existing handoff destinations receive the same Character identity and return context as before
3. No fake followers, rating, growth percentage or popularity rank appears
4. Default `CharacterCard` rendering outside discovery does not change unintentionally
5. Directory remains usable with missing featured media or no reusable destinations
6. Name, tags and actions fit target viewports without overlap

## 8. Focused Validation

- `CharacterDiscoveryCard` full/partial state tests
- Existing `CharacterCard` regression test
- Character directory schema/API test
- Existing `characterHandoffNavigation` and server destination handoff tests
- Public versus owner visibility test
- One route-specific Playwright spec at 390px, 820px and 1440px

## 9. Pending

- Character-level follow/save mutations
- Ratings and reviews
- Rising/trending Character computation
- Top Character creator leaderboard
- Character activity/moment feed beyond existing public works
