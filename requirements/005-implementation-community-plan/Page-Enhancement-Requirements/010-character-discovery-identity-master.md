# Character Discovery Identity Master

Latest refinement: `013-character-featured-row-and-engagement.md` and plan 018
extend 012 with graduated circles, cover/fade Featured row and real post
engagement. Character-level social totals remain pending.

Active presentation follow-up: `012-character-highlight-polish.md` supersedes
the original face-thumbnail Header policy and owns larger Gallery-image rings,
full Featured framing, theme washes and explicitly upcoming Follow/Video UI.
The live baseline gate was rechecked successfully before this follow-up; final
polish acceptance is recorded in implementation plan 017, not inferred below.

Status: Implemented; focused tests and isolated browser checks passed. Subsequent
live EN baseline passed nine viewport/theme combinations before polish. Final
highlight-polish live verification remains conditional under requirement 012.

Owner: Profiles, route `/explore/characters`. Extends `003-character-gallery.md`.
Primary: Product and Requirement Architect. Reviewers: UX/UI Product Designer
and QA Release Engineer (including public-data/actor-isolation checks).
Skills: review-product-ux, verify-release-regressions. Reviews are sequential
by the same agent; independent subagents are not available.

## Outcome And Evidence

Bring Character discovery closer to resource 003's identity-focused concept,
using real public Characters and works. Resource 002 informs reusable discovery
patterns only; Comparison and Landing are explicitly unchanged.

Live baseline (2026-09-06): ten public Characters, four tall desktop columns;
the same image in hero, feature and first result; sparse feature details; no
moments or bottom Studio CTA. Some view-only cards incorrectly label supported
destinations Ready. Featured works API returns two public posts with a cursor.
Screenshots: `C:/Users/punya/AppData/Local/Temp/momelo-character-review-qrOYTt`.

## Scope

1. Compact unframed Character Universe heading with up to four actual identity
   previews, creation and catalog navigation. Do not repeat the featured image
   as a giant hero background. Character previews open their existing profile.
2. Featured identity with public portrait, name, personality, bounded intended
   uses, creator, authoritative output count, availability and actions. Include
   up to three public image moments for that same identity, with creator
   attribution and links to the original work. No fabricated rank or metric.
3. Discovery-only horizontal portrait/detail cards: two desktop columns, two
   where tablet space permits, one on mobile. Typography, metadata and action
   targets must remain legible, including long names and missing data.
4. Keep creator search semantics and its URL. Present existing intended-use
   choices as a segmented filter; retain reuse-policy selection, pagination,
   actor scoping, return-navigation context and async recovery.
5. Add Create with using a destination menu. Only exact supported destinations
   AND `handoffAvailable` authorize showing the action. Use the same handoff
   API, session envelope, Scene navigation state and Fashion route as Profile.
6. Compact existing configured tutorial previews and add a bottom Studio CTA.
   Tutorial content stays clearly sample content, with no dead live buttons,
   remote embed, autoplay, invented scores or video readiness.

## Protected Boundaries

- Default shared CharacterCard, Fashion/Scene generation, cast, reference
  authority, approvals, provider controls, Credits and prompt compilation stay
  unchanged. No image generation or paid provider tests.
- Public Community endpoints remain the visibility authority. Do not request
  owner-only assets/looks or publish additional data. No persistence migration.
- Scope all visual changes to Character Gallery or its new handoff menu. Do
  not restyle shared discovery primitives or unrelated Profile content.
- Existing Profile handoff may be extracted to one Profiles hook, with parity
  tests. This is a reuse boundary, not a new generation workflow.

## States And Rules

| State | Behavior |
|---|---|
| Directory loading | Visible loading; hero/Studio entry available; no fake identities |
| Empty/filter no results | Existing empty state plus clear filters when relevant |
| Directory error | Existing error/retry; no misleading successful-result claim |
| No portrait/broken image | Stable dimensions, localized fallback, profile still accessible |
| View-only | View profile available; no Ready badge or Create with |
| Handoff true, unknown destinations | No Create with; never infer readiness by substring |
| Moment loading/empty/error | Local state only; feature and catalog remain usable; retry on failure |
| Handoff pending | Spinner and disabled trigger/items; duplicate invocation guarded |
| Handoff rejected | Inline error and retry through destination menu; no navigation/storage |
| Actor changes during handoff | Discard stale response; no cross-actor write/navigation |

## Data And Performance

See `011-character-discovery-data-trace.md`. Reuse the existing actor-keyed
Character works query, bounded to the API's 12-item first page, render max three.
One featured Character only, no per-card requests, no new polling/cache/storage.
Its empty result is not proof there are no later public results; use neutral
empty wording and link to the existing Profile. No automatic cursor traversal.
Keep the public filtered directory as the selection source, not a second feed.

## Delivery Gates

| Step | Plan | Status |
|---|---|---|
| CDI-01 | 013: cards, media and effective availability | Implemented; 9 focused tests passed |
| CDI-02 | 014: compact hero, spotlight/moments, filters and Studio CTA | Implemented; 13 tests, build and isolated visual checks passed |
| CDI-03 | 015: shared handoff entry and destination menu | Implemented; 17 client + 5 server contract tests passed |
| CDI-04 | 016: focused tests, visual review and gap closure | Original 44 tests + 18 fixture combinations passed; subsequent live EN baseline passed 9 combinations. Later polish evidence belongs to plan 017. |

Each step updates its evidence after its focused gate passes; no full-system
test is required. Optional aggregate runs only these Character tests.

Evidence and rerun commands: `implementation-plan/016-character-visual-verification.md`.
The browser fixture is opt-in and never replaces application data. Production
code continues to use the original APIs and real public Character/works data.

## Acceptance

- Featured has meaningful public identity details and real related works, or
  explicit local fallback; no large duplicated hero image.
- Cards are two columns at 1440px, readable at 820/390px, no overlap/overflow.
- A view-only Character never appears ready for reuse because it supports a
  destination technically. Unknown destinations do not expose a new route.
- Create with preserves authorized Character/version/reference and destination
  contracts; never auto-generates, chooses a provider or changes approval.
- Filter URL/back behavior, pagination and default CharacterCard are protected.
- EN/TH parity, keyboard menu/focus, three themes and three widths are checked.
- Existing working Gallery/Profile behavior passes focused regressions.

## Pending (Not In This Delivery)

- PENDING-CHARACTER-SOCIAL: Character Follow/Save, ratings, growth and rankings.
- PENDING-RANKINGS: weekly awards, Rising Stars, Top Character Creators; no
  invented counts or ranking labels, no fake social proof.
- PENDING-CHARACTER-SEARCH: name/bio/personality full-text and broader category,
  period/sort APIs. Current search remains accurately labeled Creator.
- PENDING-EDITORIAL-CMS: editorial pinning/scheduling, real tutorial destinations.
- PENDING-CHARACTER-MOMENTS: expanded mixed image/video activity or public Looks
  fallback; only existing public image posts are used now.
- Video creation and BytePlus qualification remain outside this work.

## Rollback

Revert Character-specific composition/CSS and callers to the previous handoff
body if needed. No migration, public-write or generated-media rollback needed.
