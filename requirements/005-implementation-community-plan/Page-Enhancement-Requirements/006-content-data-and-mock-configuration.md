# 006 Content, Data And Mock Configuration

Status: Proposed

Owner: Community read presentation; authoritative business data remains with its current domain owner

## 1. Objective

แยก editorial/mock content ออกจาก component logic และกำหนดว่า field ใดเป็นข้อมูลจริง field ใดแสดงได้แบบ sample เพื่อป้องกันหน้าใหม่สวยขึ้นแต่ทำให้ผู้ใช้เข้าใจผิดเรื่อง ranking, ราคา, ความนิยม หรือความสามารถของระบบ

## 2. Data Source Matrix

| Data | Canonical source | First delivery behavior |
|---|---|---|
| Public posts/templates/comparisons | Community feed/public snapshot API | Use directly after Zod validation |
| Public Characters | `/api/community/characters` via Profiles API module | Use public summary only |
| Creator identity | Community public projection | Reuse `CreatorIdentity` |
| Template readiness/pricing | Public template snapshot/server contract | Show only when present |
| Comparison slot metadata/winner | Public comparison snapshot/engagement | Show only when present |
| Character destinations | Character handoff/policy response | Use without client inference |
| Tutorials/YouTube placeholders | Source-controlled editorial configuration | Label as tutorial/sample, no live metrics |
| Global totals/rankings/reviews | No current complete source | Omit; Pending |

## 3. Configuration Contract

Phase 1 may introduce a typed source file such as:

`web/src/features/community/config/discoveryEditorialConfig.ts`

The file may contain stable identifiers, target route IDs, local thumbnail asset keys, tutorial type and enabled state. It must not contain translated display strings, secrets, user data, provider prompts or runtime-generated content.

Display strings belong in the existing i18n namespace under `client/i18n/locales/<locale>/`. Local mock thumbnails belong under `client/assets/community/` and must have documented license/source metadata where applicable.

## 4. Mock Content Rules

- `Mockup` means interaction/layout placeholder, not fake production activity
- A sample comparison must be visibly labelled `Sample` and excluded from live ranking/count calculations
- Tutorial cards may open an internal placeholder dialog/page; external YouTube embeds are not created until a real allowlisted URL exists
- No autoplay, background video download or third-party tracker is loaded on page open
- Disabled destinations use `Coming soon` only when the product has approved that destination; otherwise omit the action
- Placeholder media must not impersonate a user or creator

## 5. Featured Selection Rules

- Eligible items must already be visible under public ownership/moderation policy
- Selection is deterministic within a response, for example server rank then stable ID
- A page may omit featured content when no eligible item exists
- Client code must not call an item `of the week`, `trending`, `winner` or `top` unless the response includes that authoritative meaning
- Featured presentation does not alter feed order or persistence
- The same item may be visually deduplicated from the current rendered list by stable ID only

## 6. API Strategy

First delivery composes existing bounded APIs. Do not add a landing aggregate endpoint pre-emptively.

Before proposing `PENDING-AGGREGATE-API`, measure:

- Request count and transferred bytes for initial root render
- Server and browser latency
- Number of duplicated public records
- Cache owner, TTL, invalidation events and actor/public scope

If a new endpoint becomes necessary, Community owns the read projection and must consume other capabilities through their public facades. It must not directly mutate or bypass their repositories.

## 7. Public Safety Rules

- Never expose private prompt/reference payloads to enrich a card
- Preserve server sanitization and moderation status
- Avoid storing Base64 media in route state or configuration
- External links must be allowlisted and opened with safe link attributes
- Actor-specific query keys remain actor-scoped even when the underlying items are public

## 8. Detailed Tasks

- `DATA-01` Build a field-availability table from current Zod schemas and fixture responses
- `DATA-02` Mark every mockup metric as real, optional, mock-safe or pending
- `DATA-03` Define editorial configuration schema and validation
- `DATA-04` Add local placeholder asset provenance
- `DATA-05` Implement deterministic featured selectors with unit tests
- `DATA-06` Ensure all route adapters tolerate optional fields
- `DATA-07` Verify no private field is added to public API output
- `DATA-08` Record baseline request count before considering an aggregate endpoint

## 9. Acceptance Criteria

1. Every visible data point has a traceable source or an explicit Sample label
2. Configuration can be changed without editing React component logic
3. Translation text is not duplicated in configuration
4. Missing optional metadata never becomes `0`, `Unknown winner` or another misleading metric by default
5. No new runtime JSON or database migration is required for first delivery
6. Public projection regression tests prove private data remains absent

## 10. Pending

- Admin editorial CMS and scheduling
- External tutorial provider integration
- Aggregate landing API/cache
- Authoritative leaderboard/review contracts
