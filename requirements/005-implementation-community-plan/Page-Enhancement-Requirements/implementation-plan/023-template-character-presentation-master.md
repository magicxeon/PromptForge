# Template / Character Presentation Implementation Coordinator

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Owner requirement: [023 master](../023-template-character-presentation-master.md).
Source, presentation assets and focused scripts are now implemented. Runtime
data and paid generation remain unchanged; live UAT is not claimed.

## Ordered Slices

| Order | Plan | Depends on | Exit artifact |
|---|---|---|---|
| 0 | [024 Baseline](024-presentation-baseline.md) | Implementation authorization | Evidence/owner/caller inventory; short runner scaffold |
| 1 | [025 Public previews](025-template-public-preview-data.md) | 024 | Safe bounded read/schema/hook, no N-per-card scan |
| 2 | [026 Featured](026-template-gallery-featured.md) | 025 | Original plus real creations, scoped Gallery screenshots |
| 3 | [027 Cards/discovery](027-template-cards-and-discovery.md) | 025, 026 | Horizontal catalog, unchanged filters/actions |
| 4 | [028 Photo original](028-photo-template-original.md) | 024; parity after 025 | Single-original Detail and real owner/info |
| 5 | [029 Photo creations](029-photo-template-creations.md) | 028 | Creation cards, correct creators/likes/sort |
| 6 | [030 Character display](030-character-display-policy.md) | 024 | Shared display-source policy and source-crop diagnosis |
| 7 | [031 Character consumers](031-character-preview-consumers.md) | 030 | Picker and both tiny previews; unchanged reference payload |
| 8 | [032 Provider icons](032-landing-provider-icons.md) | 024 | Supplied shapes, current colors, pixel verification |
| 9 | [033 Verification](033-presentation-verification.md) | All delivered slices | Focused evidence + explicit aggregate/UAT handoff |

Default execution is sequential to reduce overlapping edits. Photo, Character
and Icons have independent ownership after baseline; a blocked Template batch
read must not force unrelated changes. Record any reordered work here.

## Execution Discipline

1. Re-read requirement and current owners before each slice; code may have changed
   since planning. Capture baseline failures without weakening test expectations.
2. Complete that slice's small tasks and update checkboxes as tasks actually pass.
3. Run its focused tests and inspect its changed page before advancing. Shared
   code also runs named adjacent tests; no routine repository-wide suite.
4. Planned runner: `node scripts/test-template-presentation.mjs --part=<group>`.
   Create it only at implementation step 0. Group ownership is in requirement 032.
5. Record changed files, protected behavior, command/result/timing, screenshots,
   deviations, pending source-data issues and a scoped rollback boundary.
6. No paid provider request, live mutation, runtime data repair or worker restart.
   Use isolated fixtures when local application is unavailable; do not bootstrap
   live recovery jobs or claim live evidence from fixture screenshots.

## File Ownership

- Community backend/API/query: existing facade, routes and schemas; at most a
  focused internal lineage helper and preview hook under existing owners.
- Community visual fragments: `web/src/features/community/components/templates/`.
  Shared presentation primitives keep backwards-compatible defaults.
- Profiles pure display policy: `web/src/features/profiles/`; controlled picker
  and image rendering remain in their existing components.
- Runtime artwork, during implementation only: `client/assets/providers/`.
- Tests: colocated React tests and `test/`; fixtures `test/fixtures/`; one aggregate
  runner under `scripts/`. No new persistence, root-level modules or runtime paths.

Proposed filenames in individual plans are not assertions they already exist.
Prefer existing matching modules found during implementation inspection.

## Evidence Record

Current slice evidence is recorded in [034](034-presentation-delivery-evidence.md).
Unchecked tasks identify extended/live/source checks, not permission to change
working behavior. Use this block when those checks are completed:

```text
Status / date:
Requirement IDs passed:
Files changed / new / moved:
Protected behavior checks:
Commands, result and duration:
Visual paths, viewport, theme and locale:
Live versus fixture evidence:
Deviations / pending IDs:
Rollback boundary:
```

Escalate material rights, price, visibility, asset repair or shell changes;
record Pending destinations instead of silently expanding scope.
