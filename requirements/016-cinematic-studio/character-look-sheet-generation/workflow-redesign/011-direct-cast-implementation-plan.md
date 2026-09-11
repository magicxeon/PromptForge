# Ordered Implementation And Verification

Status: implementation and isolated verification completed 2026-09-10.
Live UAT is a separate pending gate. No paid requests authorized by this runner.

| Task | Work | Acceptance/evidence | Status |
| --- | --- | --- | --- |
| P1 | Configurable Image 2.5 estimate beyond measured samples | test-openai-image25 all passed, including all ratio/quality/reference combinations | Verified |
| C1 | Cast source union and owned source resolution | direct group: 47 passed, including Storyboard route; no Profile creation | Verified |
| C2 | Story/Storyboard/Produce lineage and references | direct and transport groups; identity, count, expiry, original-URL transport and batch parity | Verified |
| U1 | Add/replace sheet picker and source-specific dossier | UI tests and EN/TH browser at 390/820/1440px | Verified |
| U2 | Retire incorrect Generated Wardrobe entry | ordinary Look regression; retired HTTP 410; historical transport retained | Verified |
| Q1 | Type checks, aggregate and scoped diff review | commands/results below; no paid UAT | Verified |

Dependencies: P1 is independent; C1 precedes C2/U1; U2 follows U1; Q1 is last.
Extend scripts/test-generated-cast-sheets.mjs with a direct-cast group and include
it in all. Existing focused groups remain separately executable. Pricing uses
scripts/test-openai-image25.mjs all. Use only temporary fixture repositories.
Browser verification uses intercepted APIs and a source dev server, never paid
provider dispatch. Live UAT follows later: existing owned Seedream sheet -> Cast
without profile -> Story Plan -> Storyboard -> Produce supported reference mode.

## Verification Evidence

All commands below ran successfully on 2026-09-10:

```powershell
node scripts/test-generated-cast-sheets.mjs all
node scripts/test-openai-image25.mjs all
node scripts/validate-i18n-catalogs.js
git diff --check
```

Cast runner groups: direct (47), domain (historical Looks and trusted sources),
transport (33), ui (21), types (tsc), binding (82). Every group passed. Select a
group by replacing all with direct, domain, transport, ui, types or binding.
Pricing runner: 44 checks passed, including pricing/actual-cost evidence,
supported ratio/quality/reference combinations, quote consent and settlement.
No production build, provider request, worker restart or live JSON write ran.

Browser prerequisites: an existing Vite source server (default 5173), Playwright
Chromium and an optional local multi-view sheet for visual inspection. Override
CAST_SHEETS_WEB_ORIGIN for another local port; CAST_SHEET_VISUAL_FILE selects the
local PNG. The script intercepts all APIs and blocks nonlocal network requests.

```powershell
node scripts/verify-generated-cast-sheets.mjs
```

Verified EN/TH at 390/820/1440px. Screenshots are temporary local evidence at
C:/Users/punya/AppData/Local/Temp/mpf-direct-cast-3FJW78. Reviewed full-sheet
preview, bordered name input, source-specific dossier, sheet-reviewed status and
no page overflow. Tests cover pending, duplicate-submit prevention, empty/error,
replacement and preserved ordinary Character selection. Browser APIs are mocked;
Cast assignment uses the real domain with an isolated in-memory repository.

## Ownership And Runtime Changes

- New internal CinematicGeneratedCastService; public mutation remains
  CinematicApplicationService.upsertCastAssignment, not a second Cast API.
- GeneratedLookSourceField and its test moved from Profiles components into
  web/src/components/generation; GeneratedCastDialog is Cinematic-owned.
- Existing project JSON gains sourceType/generatedSheet and an intrinsic Look.
  Existing Asset import is reused. No new runtime directory or data migration.
- server/config/openAIImage25.js shares actual output dimensions between the
  adapter and pricing. Credits policy version records the estimate assumptions.
- Character-bound generated import HTTP entry is retired with 410. Historical
  records and their internal source/approval/transport resolution remain intact.
- Architecture addendum and superseded requirement links updated. Review was
  sequential across roles; it was not an independent multi-agent review.

## Pending Live UAT And Limits

After normal developer startup/restart, use an existing eligible owned Seedream
5.0 Look Sheet without creating a Character. Save/reopen Cast, retain Direction,
approve a supported single-character Story Plan/Storyboard, then obtain a video
quote in the supported Storyboard + Looks mode. Authorize paid submission only
when the displayed quote and reference list are correct. Confirm task output,
original provider reference use, and one reservation/capture or failure refund.
Test replacement/expiry without deleting historical work. Check a Sunburst/Flare
quote at a formerly unmeasured supported ratio/quality and confirm its estimate
before any paid request. Do not alter or rebill old reserved/completed Jobs.

Multi-character Storyboard qualification limits remain. First-frame eligibility
is independent; a trusted Look Sheet does not authorize an arbitrary Storyboard
image. Provider moderation and exact invoice cost are not guaranteed. No live
6500 backend was available during verification; the existing source server was
used without restarting workers that might resume billable jobs.
