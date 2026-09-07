# Step 9: Focused Verification And Release Handoff

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirement: [032](../032-presentation-verification-and-pending.md).

## Tasks

- [x] Q-01 Map every TPD/TGF/TGC/PTI/PTC/CDI/CPC/PBI item to automated or visual/
  manual evidence. Distinguish implementation from real-data proof.
- [x] Q-02 Finish one explicit-group aggregate runner with fail-fast exit. Never
  nest child all-modes; deduplicate tests/time each group/build once before visuals.
- [x] Q-03 Run affected development groups only; compatibility covers touched
  Use/input policy/derived-single-share/ordinary refs/Character/Post/Landing owners.
- [x] Q-04 Run type checks, scoped lint and EN/TH parity in explicit build/check
  group. Report unrelated pre-existing failures separately.
- [x] Q-05 Extend browser fixture runners with per-page scope. Abort provider
  requests; temporary static fixture servers close in finally. No live workers.
- [ ] Q-06 Inspect 390/820/1440 across three themes per changed page, plus 320/
  1920 and EN/TH stress cases. Geometry checks alone do not prove visual fidelity.
- [ ] Q-07 Exercise keyboard/dialog focus, action targeting, sort/pagination,
  actor switching, hidden/broken media, fallback and reference payload parity.
- [x] Q-08 Check rendered provider mask pixels, not only DOM presence. Verify
  original/creation/owner distinctions against source fixtures.
- [x] Q-09 When local app is supplied, read-only smoke the given Template and
  Character previews. No paid generation/live reaction/restart; report unavailable
  live checks instead of passing them from fixtures.
- [ ] Q-10 Review scoped diff/asset placement and preserve user data/resources.
  Update individual plan statuses/evidence and named Pending items.
- [ ] Q-11 Report page changes, test commands/results, risks and rollback.
  Prefer independent QA; otherwise disclose same-agent review limits.

## Planned Commands (Only After Implementation)

```sh
node scripts/test-template-presentation.mjs --part=template-data
node scripts/test-template-presentation.mjs --part=template-featured
node scripts/test-template-presentation.mjs --part=template-catalog
node scripts/test-template-presentation.mjs --part=photo-original
node scripts/test-template-presentation.mjs --part=photo-creations
node scripts/test-template-presentation.mjs --part=character-display
node scripts/test-template-presentation.mjs --part=character-consumers
node scripts/test-template-presentation.mjs --part=provider-icons
node scripts/test-template-presentation.mjs --part=compatibility
node scripts/test-template-presentation.mjs --part=build
node scripts/test-template-presentation.mjs --part=visual --scope=photo
node scripts/test-template-presentation.mjs --part=all
```

Visual scopes: gallery/photo/character/icons/all. Standalone visual checks require
current build evidence; report missing/stale build. `all` is deliberate later
pre-production/UAT preparation, never live-data or paid-provider testing.

## Release Decision

Pass requires in-scope acceptance plus visual/compatibility evidence. Conditional
pass names exact live/source limitation. Fail returns the slice to its owner,
not a request for a global redesign. Runtime data paths stay unchanged; rollback
is page-by-page code/assets only. Pending source/license work is not marked done.
