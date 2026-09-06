# Character Discovery Data Trace And Gap Checklist

Owner: Profiles. Parent: `010-character-discovery-identity-master.md`.
Active presentation rules: `013-character-featured-row-and-engagement.md` extends
012; verification: `implementation-plan/018-character-featured-row-and-engagement.md`.

| Step / consumer | Source of truth | Mapping and protected boundary | Verification |
|---|---|---|---|
| Directory | profileApi.listCharacters -> GET /api/community/characters | Existing creator/intendedUse/reusePolicy + cursor, Zod directory schema, actor query key | Route filters/cursor/actor tests |
| Hero identities | Directory public summary -> characterGalleryImageUrl | Max four Gallery displayImageUrl values with owner_generation/owner_selected_generation/featured_work/owner_selected_work source; no face/casting/sheet fallback or owner lookup; descending circles and right inset | Helper exclusions, bounded/empty Hero tests, browser source/ring checks |
| Featured | First eligible visible directory item with approved public presentation media | Neutral Featured, not weekly rank; no admin pin mutation | Route same-identity test |
| Card/feature info | CharacterSummary | displayName/personalitySummary/intendedUses/ownerUsername/stats.totalOutputs | Missing fields and private-field non-display tests |
| Effective readiness | handoffAvailable + exact destinationCapabilities | fashion_blueprint / scene_builder only; no includes-substring heuristic | Denied/unknown destination tests |
| Moments | profileApi.getCharacterWorks -> public works API | Existing ['character-works', actorId, characterId] key; first page <=12, render <=3 public image posts; MediaStage uses public originals with cover and separate captions; private source remains private | Same Character, public filtering, local failure tests, media fit/caption bounds |
| Post likes/views | Moment post ID -> compact EngagementBar -> Community useCommunityEngagement | Existing actor/post query and Community API; server-confirmed heart state, no thumbnail view recording, no Character social totals | Like/unlike, error/retry, duplicate, actor tests; existing server reaction contracts |
| Featured mocks | Spotlight-only localized presentation | Disabled Follow and Video Coming soon; Image badge is not a readiness grant; no writes or synthetic counts | Card variant assertions; browser disabled state |
| Work detail | Existing routeBuilders.post | Original post ID + return context; do not substitute Character link | Moment link test |
| Creator navigation | Public ownerUsername via existing Profile route convention | No invented avatar, verified status or handle | Link parity check with Profile |
| Create with | Profiles useCharacterHandoff -> profileApi.requestCharacterHandoff | Server authorizes identity/version/reference; captured actor must still be active | Hook success/reject/duplicate/stale-actor tests |
| Destination | handoffStorage + characterHandoffNavigation | Same kind=character/TTL/session envelope; Scene includes current navigation state; Fashion current route | Existing handoff helper + Profile regressions |
| Tutorial/CTA | discoveryEditorialConfig + routePaths.createStudioCharacter | Local sample assets only; no YouTube runtime calls | Scoped route and visual tests |

## Gaps Resolved Before Coding

- Creator follow API is not Character follow: do not reuse it with Character ID.
- Generated-output totals are not public moment counts or completed paid uses.
- Face/profile handles and verification badges are not assumed from usernames.
- Intended uses describe content; they do not grant permission or video readiness.
- The first works page may be filtered to fewer items than its requested limit;
  keep its cursor behavior, do not claim a total or automatically crawl pages.
- Resource 002 is a comparison design reference, not permission to modify that route.
- Historical plan 004's `characterDiscoveryModel.ts` did not exist; this follow-up
  explicitly introduces the shared discovery presentation helper under Profiles.

## Integration Checklist

- [x] Public projection -> hero/feature/card uses only public fields.
- [x] Feature ID -> works query ID matches, including filter and actor changes.
- [x] View-only -> no destination Ready/Create with in either card variant.
- [x] Menu selection -> server handoff -> actor check -> storage -> correct route (mocked client + existing server contracts).
- [x] Directory URL -> profile caller context preserved; existing Profile back link unchanged.
- [x] Errors in works/handoff do not replace the entire directory.
- [x] No owner-only media, provider calls or automatic reactions/view events introduced. Explicit Create with reuses the existing handoff session envelope. Requirement 013 adds bounded post engagement reads and explicit heart actions for up to three Moments, not per-directory-card requests.
- [x] Earlier identity layout checked on live localhost:6500 before highlight polish (EN, 9 viewport/theme combinations).
- [ ] Repeat final Featured-row/engagement layout checks against live localhost:6500 when available (plan 018).

Evidence: 10 cards, 14 gallery, 10 engagement, 18 handoff and 5 server contract
tests, plus 7 existing Community engagement tests. Browser fixture evidence and
final responsive reruns are recorded in plan 018.
Public/private contract checks are deterministic, not a claim of live generation
qualification. No generation, ownership, share or publication behavior changed.
