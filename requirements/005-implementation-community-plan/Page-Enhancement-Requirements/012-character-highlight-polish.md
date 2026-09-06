# Character Highlight Polish

Follow-up 013 and plan 018 supersede equal-sized circles, contain preview framing
and separate Featured borders. Gallery source authority and other protected
contracts remain unchanged; original execution evidence below is historical.

Status: Implemented; focused and isolated visual checks passed. Conditional
acceptance: final live-data visual check remains pending while localhost:6500
is unavailable. Evidence and rerun commands are recorded in plan 017.
Parent: `010-character-discovery-identity-master.md`.
Owner: Profiles, `/explore/characters`. Primary: UX/UI Product Designer.
Reviewer: QA Release Engineer, including public-media checks. Skills:
review-product-ux and verify-release-regressions. Review is sequential by one
agent; no independent agent is available.

## Approved Outcome

Refine the current Character Gallery toward resource 003, with a recognizable
Character highlight, complete portrait media, larger gallery-image circles,
theme-aware color and clearly marked upcoming controls. No business workflow
or provider change. The user's latest instruction extends the preceding agreed
Header/Featured/Moments/Discover/buttons discussion, not Landing or Comparison.

## Requirements

1. Header: grow circles from 68px desktop/62px mobile to about 104px desktop and
   76px mobile, with a distinct 3px theme-gradient outer ring and inset gap.
   Allow responsive shrink below 390px without overflow; max four identities.
   Keep names and profile links with existing return context.
2. Circle source: use the same public curated Gallery presentation selected by
   the server, not `faceThumbnailUrl`, casting front preview or canonical sheet.
   Select `displayImageUrl` only when `displayImageSource` is `owner_generation`,
   `owner_selected_generation`, `featured_work` or `owner_selected_work`.
   Skip identities without a Gallery source; show fewer circles or none. A broken
   Gallery image shows the existing fallback, never a private/reference image.
   Do not fetch works per circle or choose another Character's image.
3. Header background: a continuous theme-aware gradient starting upper-right,
   fading toward lower-left/transparent. Momelo Neon emphasizes violet. No hard
   rectangle boundary, decorative circles, animation or global theme changes.
4. Featured: a portrait-oriented media area, approximately 2:3, `contain` rather
   than crop. Use the currently selected public image without changing source
   selection, generating, outpainting or changing approved assets. Full-body
   visibility is possible only when that original contains the full body.
5. Featured desktop/tablet: details and actions left; portrait spans their entire
   height on the right. Do not put an action bar across the bottom of the image.
   Mobile stacks the complete image, details and actions with bounded media
   height and readable text. Regular directory cards keep their current layout.
6. Upcoming controls in Featured only: Follow button, Image/Video presentation
   badges. Follow and Video visibly say Coming soon, have no API call, counters,
   synthetic Following state or generation action. Image means visible image
   presentation, not guaranteed provider compatibility or permission. Keep all
   real destination readiness and authorization checks unchanged.
7. Featured primary CTA names the Character (`Create with {name}`); regular
   cards keep compact `Create with`. Both use the existing action component and
   authorized destination menu. Long names wrap without escaping the button.
8. Moments: retain public same-Character works, maximum three, original post
   links/creator credit and local async states. Use available public original
   media through MediaStage with `contain`; move captions below the media so
   neither faces nor feet are covered by captions. No video fetch/autoplay.
9. Buttons: 12px corner radius for Character page commands; pill segmented
   filters. Do not modify shared Button or other pages. Cards remain <=8px.
10. Discover steps: one full-width grouped panel/band, subtle primary-to-accent
    background gradient, readable numbered icons and copy. Keep all three steps
    and existing search, availability, filters, pagination and tutorials.

## Data Trace / Gaps

| Step | Input owner -> consumer | Protected contract | Evidence |
|---|---|---|---|
| Header | listCharacters public summary -> characterGalleryImageUrl -> CharacterGalleryHero | Exact public source tags, no face/sheet fallback, max 4 | helper + Hero tests, live src checks |
| Featured image | existing characterPortraitUrl -> CharacterPortrait | Approved public selection unchanged; only CSS contain/framing | media fit/source/browser bounds |
| Upcoming controls | localized presentation in spotlight variant | No follow/video mutations, no fake readiness/counts | disabled/absent-default-card tests |
| Create with | existing CharacterCreateAction showName -> useCharacterHandoff | Same pending/error/menu/permission/actor guards | existing handoff suite + named-label test |
| Moments | existing single actor/Character works query -> MediaStage | Public originals only, <=3, same post/creator IDs, no polling | component/route + browser checks |
| Discover/style | existing DiscoverySteps/controlled toolbar -> Character-only CSS | No new route/filter semantics, sibling pages unchanged | scoped diff + responsive checks |

Gallery `displayImageUrl` may otherwise refer to a casting preview or canonical
sheet. Merely removing face-thumbnail priority is insufficient: source tags
must exclude those fallbacks. The original requirement's face-avatar preference
is explicitly superseded here; regular Character cards are not changed by it.

Upcoming Follow/Video presentation partially addresses the mockup, but does not
close PENDING-CHARACTER-SOCIAL or video qualification. Rankings, full-text search,
creator leaderboards, actual social actions and CMS remain separate pending work.

## Gates

Plan: `implementation-plan/017-character-highlight-polish.md`.
- Focused cards/gallery/handoff/contracts suites, EN/TH parity, changed-file lint
  and production build. No repository-wide test or paid generation.
- Live screenshots 390/820/1440, three themes, both locales. Assert gallery source
  circles, strong rings, complete Featured and Moment fitting, readable controls,
  no overflow, preserved menu focus and no fake working Follow/Video.
- Baseline live check passed 2026-09-06 (before this polish):
  `C:/Users/punya/AppData/Local/Temp/community-page-layout-6HyrFg`.
  58 initial requests, 18 media requests, 2,086,882 declared response bytes (EN).
  This is a local browser sample, not a production performance benchmark.

No schema, runtime data, storage, capability entry point or migration changes.
Rollback is limited to this follow-up's Profiles presentation/CSS changes.
