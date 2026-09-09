# Profile Danger And Public Work Implementation

Parent: [042](../042-profile-danger-and-public-work-master.md). Status: implemented and fixture-verified.

## Ordered Steps

1. Freeze scope and current contracts. No server deletion/scoring edits.
2. Implement 043 in CharacterProfileRoute, DeleteCharacterDialog and EN/TH catalogs.
   Verify the `danger` group before moving to image presentation.
3. Implement 044 as an opt-in MediaCard prop; reuse MediaStage's original/contain
   contract. Scope Community Home CSS and protect non-image/default cards.
4. Verify `media` and `types`, then browser `profile` and `featured` separately.
5. Review scoped diff, links/locales and evidence, then update child statuses.

## Validation

Owning runner: `node scripts/test-profile-public-work.mjs <group>`.
Groups: `danger`, `media`, `types`; explicit `all` runs these isolated groups.
No paid generation, live writes, server restarts or automatic build.
`node scripts/verify-profile-public-work.mjs profile` / `featured` uses current
Vite source with mocked APIs and blocked mutations, at 390/820/1440, EN/TH.
Prerequisite: installed dependencies and local Vite at 5173; origin override
`PROFILE_LAYOUT_ORIGIN` accepts localhost only. Existing server/dist is untouched.

## Evidence

- Requirements: scope/owners reviewed; 043 and 044 implemented in order.
- Baseline: Delete sits before Looks/cover; Public work uses 4:3 cover/top crop.
- No new runtime data/dependencies, no source moves, no ranking change.
- `node scripts/test-profile-public-work.mjs all`: 11 danger + 19 media tests,
  followed by TypeScript no-emit check, passed on 2026-09-08.
- Browser `profile` and `featured`: 18 cases each, EN/TH, 390/820/1440,
  default/fashion/creative themes. All APIs mocked, non-GET/external requests
  blocked; no runtime errors or unexpected API requests.
- Screenshots inspected for mobile/desktop danger, mobile confirmation, and
  mobile/tablet/desktop featured images. Evidence directories from this run:
  `%TEMP%/mpf-profile-public-profile-If9yqd` and
  `%TEMP%/mpf-profile-public-featured-9R1zZk` (ephemeral; rerun to reproduce).
- Destructive/privacy review: server deletion and public-media authorization
  untouched. Public route has no danger block; owner confirmation/cancel works.
- UX/QA review was sequential self-review, not independent-agent verification.
- Character profile EN/TH key and interpolation parity passed; `git diff --check`
  passed. New files are requirements 042-044, this plan and the two owning scripts;
  existing capability placement is unchanged, so no architecture relocation needed.

## Residual Limits

Live deletion was intentionally not executed. The reported missing cover picker
on a specific live Character and any popularity policy change are not resolved
by this presentation change. Existing built `web/dist` is not rebuilt; current
source is available through Vite. Full production-build/UAT gates remain separate.
Source originals can cost more bandwidth than cropped thumbnails; only the four
existing featured items opt in and retain lazy loading. Missing ratio metadata
uses bounded 3:4 geometry with contain, not an inferred face crop.
