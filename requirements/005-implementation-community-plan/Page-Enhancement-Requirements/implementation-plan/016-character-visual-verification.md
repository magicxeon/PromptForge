# CDI-04 Focused Verification And Closure

Follow-up evidence: the live EN baseline was subsequently checked successfully
at 390/820/1440 in three themes, screenshots `community-page-layout-6HyrFg`.
This verifies the pre-polish baseline only. New requirement 012 and plan 017 own
the later Gallery circles and highlight styling and their remaining live gate.
The original execution record below is preserved as historical evidence.

Status: Conditional pass. Implementation, focused tests and isolated visual
checks passed; live-data visual check is pending. Depends on CDI-01 through CDI-03.

1. Extend existing `scripts/verify-community-page-layout.mjs` Character branch
   only. Verify decoded media, compact hero, two desktop columns, no viewport
   overflow, no view-only Ready/Create conflict, menu keyboard/close and theme
   states. Do not click a destination or generate.
2. Screenshots at 390/820/1440 in default/fashion/creative. Inspect hero,
   spotlight, actual moments, long card text, actions, mobile stacking and footer.
3. Run cards/gallery/handoff/contracts independently, then i18n, changed-file
   lint, production build and git diff --check. Optional --part=all combines only
   these focused tests. No whole-system suite.
4. Review existing CharacterCard and Profile controls as adjacent regression
   boundaries; check route/schema/public-policy fixtures remain unchanged.
5. Reconcile all acceptance criteria against evidence in parent and data trace.
   Do not close social/ranking/search/CMS/video pending work as part of this UI.
6. Record screenshots, commands, limited reviewer independence and any remaining
   human design-acceptance gap; no runtime data migration.

Run: `npm run test:community-layout -- --scope=characters --screenshots`.

## Isolated Browser Fallback

When localhost:6500 is unavailable, do not bootstrap backend workers or reconcile
runtime Credits merely to check CSS. Add opt-in `--fixture` to the same Character
browser checks. Test-only `test/fixtures/characterDiscoveryLayoutFixture.mjs` intercepts
requests in Playwright, serves the production build and existing local sample
assets, and provides bounded synthetic public Character/works responses.
Reject all mutations and external requests. Nothing is written to application
storage; no provider or backend process runs. Do not change default live mode.

Run: `npm run test:community-layout -- --scope=characters --fixture --screenshots`.
Record fixture screenshots separately from live-data evidence. Live API layout
and user design acceptance stay pending if the user's server remains offline.

## Execution Evidence (2026-09-06)

| Gate | Command | Result |
|---|---|---|
| Cards + original shared card | `node scripts/test-character-discovery.mjs --part=cards` | 9 passed |
| Gallery composition + state + URL | `node scripts/test-character-discovery.mjs --part=gallery` | 13 passed |
| Handoff + original Profile/navigation | `node scripts/test-character-discovery.mjs --part=handoff` | 17 passed |
| Public projection + destination contracts | `node scripts/test-character-discovery.mjs --part=contracts` | 5 passed |
| TypeScript + production bundle | `npm run build:web` | Passed |
| Locale parity | `npm run i18n:validate` | Passed |
| Changed TS/TSX only | `npm exec --workspace web -- eslint <changed Profiles TS/TSX files>` | Passed |
| Whitespace | `git diff --check` | Passed; existing LF/CRLF normalization warning only |
| TH fixture layout | `npm run test:community-layout -- --scope=characters --fixture --screenshots` | 9 viewport/theme combinations passed |
| EN fixture layout | `npm run test:community-layout -- --scope=characters --fixture --locale=en --screenshots` | 9 viewport/theme combinations passed |
| Live API layout | `npm run test:community-layout -- --scope=characters --screenshots` | Not rerun: localhost:6500 returns ECONNREFUSED |

Optional aggregate: `node scripts/test-character-discovery.mjs --part=all`.
It combines only these four groups, not the whole repository. Typical individual
group execution in this run: about 0.6-6 seconds; each fixture visual run about
8 seconds. These are local test timings, not production latency benchmarks.

Screenshots (outside application storage):
- TH: `C:/Users/punya/AppData/Local/Temp/community-page-layout-a48xsv`
- EN: `C:/Users/punya/AppData/Local/Temp/community-page-layout-ZZ1nVU`

Visual inspection covered 390/820/1440 layouts, default/fashion/creative,
identity prominence, related-work layout, long names, compact tutorials,
view-only cards, control containment and keyboard focus return. Assertions
confirm decoded public sample media, two desktop columns/one mobile column,
bounded hero/avatars/tutorials and no page overflow. Fixture responses use
existing sample image assets, not this user's live Character collection.

## Scoped Review And Handoff

- Primary: Product and Requirement Architect. UX and QA/security checks were
  applied sequentially by the same agent, not independently by another agent.
- No blocking regression found in the changed scope. Missing live-data visual
  evidence prevents unconditional closure; user design acceptance is separate.
- Reused: Discovery toolbar/segments/metrics/steps, MediaStage, Button, Radix
  menu, current Profile APIs, return state, handoff storage and destination state.
- New Profiles owners: CharacterGalleryHero, CharacterSpotlight,
  CharacterCreateAction, CharacterPortrait, characterDiscoveryModel and
  useCharacterHandoff, plus colocated tests.
- New verification owners: scripts/test-character-discovery.mjs and
  test/fixtures/characterDiscoveryLayoutFixture.mjs. Existing layout script
  keeps its default live mode; fixtures require explicit --fixture.
- No moved files, server/API/schema edits, new runtime data paths or migrations.
  web/dist is rebuilt output. User's provider-icon changes remain untouched.
- Landing, Comparison, shared CharacterCard presentation, Profile owner actions,
  billing, references and provider/generation paths are not redesigned.
- A pre-existing shared CharacterCard test emits an i18next initialization
  warning but its assertions pass; no unrelated test setup rewrite was made.

Next live check: reopen the normal local server, visit `/explore/characters`,
rerun the live Character-only layout command, and inspect actual public images
and works. No new Character or paid generation is needed for this check.
Follow/save/rankings/search/CMS/video remain the parent master's named Pending
items; this delivery must not imply those features are implemented.
