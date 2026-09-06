# Featured Row And Engagement Execution

Owner: Profiles/Community. Requirement: ../013-character-featured-row-and-engagement.md.
Status: Implemented, conditional QA pass. Final live rendering/user acceptance
remain open; no generation or live like/view event was submitted by the agent.

## CFR-01 Visual Composition

1. Record existing live/fixture baseline; preserve unrelated worktree changes.
2. Update Header inset and staggered responsive circle sizes in Character CSS.
3. Put one section border around Featured row, remove spotlight card border,
   keep regular cards unchanged. Set portrait/Moments cover and edge-only fade.
4. Change Discover to upper-left transparent wash only.
5. Update source-fit and visual expectations, run cards/gallery and build.
   Inspect desktop/mobile before engagement work.

## CFR-02 Shared Post Engagement

1. Extract existing query/reaction logic to Community useCommunityEngagement.
   Same API/schema/actor-key, server-confirmed counts; no automatic views.
2. Add compact EngagementBar presentation for heart + views. Preserve default
   Like/Save/Share. Localized load/action errors, read retry, pending, pressed
   state, meaningful labels and same-actor duplicate/late-response guards.
3. Replace whole-Moment Link with noninteractive layout and sibling links/bar.
4. Add component tests: default regression, compact state/counts, zero values,
   duplicate click, successful like/unlike, read failure, write failure/retry,
   no actor, actor-switch stale response, no navigation or view mutation.
5. Add engagement group to scripts/test-character-discovery.mjs. Extend fixture
   with bounded engagement GETs; browser verification never submits live likes.

## CFR-03 Integration And Review

1. Run cards/gallery/engagement/handoff/contracts separately; existing Community
   engagement tests separately. Preserve historical evidence, do not run all tests.
2. Extend browser geometry: right inset, descending rings, outer row bounds,
   cover/fade, no nested link/button, heart/view placement, mobile controls.
3. Build, scoped lint, i18n, syntax and diff checks. Browser EN/TH 390/820/1440,
   three themes. Inspect real images if live; record exact source/evidence.
4. Review protected detail Like/Save/Share, actor/query ownership and sibling
   directory states. Update master/data trace; list unresolved live/design gates.

| Step | Status | Evidence |
|---|---|---|
| CFR-01 | Implemented; focused/fixture gates passed | 10 cards + 14 gallery tests; build; nine EN fixture viewport/theme checks and desktop/mobile screenshot inspection. Live pre-change baseline passed; server stopped before post-change run. Moment cover centering refined after screenshot inspection. |
| CFR-02 | Implemented; focused tests passed | Shared Community hook and compact EngagementBar; 10 isolated reaction tests including detail Like/Save/Share and actor switches. Gallery 14 tests passed. Read-only fixture supports bounded engagement reads only. |
| CFR-03 | Conditional pass | 64 focused tests; build, scoped lint, i18n and syntax/diff checks passed. Final EN/TH fixture: 18 viewport/theme combinations passed and screenshots inspected. Final live server check returned ECONNREFUSED. |

Baseline: live EN screenshots `C:/Users/punya/AppData/Local/Temp/community-page-layout-pjm7GH`;
54 initial requests, 14 media, 4,647,091 declared bytes. Visual step fixture:
`C:/Users/punya/AppData/Local/Temp/community-page-layout-zpecFh`. Fixture is not
a post-change live performance measurement; final actual-data gate remains.

## Final Evidence (2026-09-06)

| Group | Command | Result |
|---|---|---|
| Cards / default shared card | `node scripts/test-character-discovery.mjs --part=cards` | 10 passed |
| Hero / Moments / directory | `node scripts/test-character-discovery.mjs --part=gallery` | 14 passed |
| Like/unlike / actor / original detail | `node scripts/test-character-discovery.mjs --part=engagement` | 10 passed |
| Handoff / Profile | `node scripts/test-character-discovery.mjs --part=handoff` | 18 passed |
| Public / destination contracts | `node scripts/test-character-discovery.mjs --part=contracts` | 5 passed |
| Existing server reactions / gates | `node --test test/communityEngagementService.test.js test/communityEngagementRoutes.test.js test/communityEngagementPolicy.test.js` | 7 passed |
| TypeScript / production assets | `npm run build --workspace web` | Passed |
| Locales | `npm run i18n:validate` | Passed |
| Changed TS/TSX | Scoped ESLint on hook, EngagementBar/test, Spotlight/test | Passed |
| Scripts / whitespace | `node --check` on three changed scripts/fixtures; `git diff --check` | Passed; LF/CRLF warning only |

Final browser commands:
- `npm run test:community-layout -- --scope=characters --fixture --locale=en --screenshots`
- `npm run test:community-layout -- --scope=characters --fixture --locale=th --screenshots`

Both passed 390/820/1440 x default/fashion/creative. EN screenshots:
`C:/Users/punya/AppData/Local/Temp/community-page-layout-9hsH27`; TH:
`C:/Users/punya/AppData/Local/Temp/community-page-layout-mfKj9f`.
Inspected inset/progressive rings, whole-row border, cover/edge blend, readable
caption/heart/view layout, tablet light theme, mobile stacking and dark themes.
Earlier screenshots exposed cramped three-Moment image tracks after adding
counts; explicit minimum row sizes and upper-portrait crop alignment address
that layout issue. Cover remains aspect-dependent, not automatic face detection.

EN fixture sample: 49 initial requests, five media, 1,731,171 declared bytes.
TH fixture: 56, five media, 1,853,828 bytes. Incremental feature reads are at most
three existing engagement GETs; remaining count changes include shared chunks.
These synthetic samples do not claim improved live performance. No new polling,
provider, reference, queue or cache-storage path was created.

## Review And Protected Boundaries

- Review performed sequentially under UX then QA/security roles by one agent;
  no independent reviewer or full-system suite was claimed.
- No blocking regression found in scoped review. Existing shared CharacterCard,
  authorized handoff, actor headers, canonical server snapshots, private/public
  separation and reaction feature gates passed their focused checks.
- New files: this requirement/plan, Community-owned useCommunityEngagement.ts,
  and EngagementBar.test.tsx. No moved files, server edits, schema changes or
  runtime data paths. Existing EngagementBar now delegates to the shared hook.
- Detail Like/Save/Share remains present. Explicit safety refinements: wait for
  confirmed viewer state, reject duplicate/actor-stale requests, display read
  and mutation errors, retain server-confirmed counts. Share still uses the
  existing post-detail URL and is not rendered in the compact gallery variant.
- Compact hearts target real post IDs, with PUT/DELETE through Community API.
  No thumbnail view event, new Character social aggregate or fake popularity.
  Follow/Video remain Coming soon; original approved media remain unchanged.
- Landing, Comparison, providers, Credits, generation and existing user edits
  (including provider-icon resources) are untouched by this follow-up.

## Remaining Live Check

The server was available for baseline only, then unavailable for final passes.
Reopen the usual local application and remove `--fixture` from the browser
commands. No backend workers were started solely for presentation validation.

Manual confirmation at `/explore/characters`:
1. Check Header circles/inset and the single Featured frame in both desktop and
   mobile. Original images should fill preview frames; full post opens normally.
2. Like one Moment, wait for confirmed count, then unlike; only this post changes.
3. Open that post and compare its Like state/count; original Save/Share remain.
4. Check creator/use filters and Create with still open the existing destination
   menu. No new image generation is required.

Live Like writes were not executed by the agent; interaction is proven with
isolated mocks and existing service tests, not against the user's live account.

## CFR-04 Portrait And Header Alignment

Status: Implemented; focused and fixture verification passed. Live rendering
remains pending. Small Profiles-only visual follow-up to requirement 013.

1. Record the screenshot-based amendment before editing. Preserve unrelated
   runtime/community data and previous user changes.
2. Reuse CharacterDiscoveryCard with an optional heading slot for Spotlight.
   Place heading/info/actions in the left grid tracks; span the portrait across
   those tracks. On mobile retain heading-first stacking. Round and clip only
   the Featured portrait wrapper, including its existing fade.
3. Scale circle layout diameters by 0.85 and use top alignment. Retain stepped
   sizing, source authority, right inset, link behavior and border treatment.
4. Extend focused component assertions and browser geometry for heading
   placement, image top inset/corners, exact circle scaling and aligned tops.
   Preserve adjacent Moments, keyboard actions and ordinary-card checks.
5. Run cards/gallery separately, production build, scoped lint and diff checks.
   Verify Character screenshots in EN/TH at mobile/tablet/desktop; use live data
   when available, otherwise retain the clearly stated live-data test gap.

No shared engagement, generation, provider, persistence or localization change.

### CFR-04 Evidence (2026-09-06)

- Cards: `node scripts/test-character-discovery.mjs --part=cards`, 10 passed.
- Gallery: `node scripts/test-character-discovery.mjs --part=gallery`, 15 passed,
  including the new heading-slot placement and preserved Moment separation.
- `npm run build --workspace web` passed. Scoped ESLint for the two components
  and Spotlight test passed; script syntax and `git diff --check` passed.
- EN and TH Character-only browser commands above passed all 18 combinations.
  Assertions cover exact 0.85 circle sizing, aligned tops, portrait top content
  inset, rounded clipping, heading separation and mobile heading-first order.
  Existing source links, Moments, controls and directory checks still pass.
- EN screenshots: `C:/Users/punya/AppData/Local/Temp/community-page-layout-UiTh3f`.
  TH screenshots: `C:/Users/punya/AppData/Local/Temp/community-page-layout-oNMU3M`.
  Inspected desktop dark, mobile Thai and tablet light screenshots.
- Local health was 200 before build, then ECONNREFUSED during final checks.
  Browser evidence uses synthetic fixtures, not the user's live Character data.
  No backend workers, provider calls or live mutations were started for QA.
- No new or moved files, data paths or architecture changes. Existing shared
  actions and runtime/community data remain untouched by this amendment.
