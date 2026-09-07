# Step 0: Contracts, Baseline And Focused Test Harness

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](034-presentation-delivery-evidence.md).
Requirements: [023](../023-template-character-presentation-master.md), [032](../032-presentation-verification-and-pending.md).

## Scope

Record reproducible evidence before coding. Do not change product behavior.
The fixture/runner scaffolding below is future implementation work, not part
of the current documentation-only request.

## Tasks

- [x] B-01 Read AGENTS, architecture, requirements 001/014-022 and this set; capture
  scoped git status. Preserve user resource 005 files and unrelated changes.
- [x] B-02 Inspect Gallery/Detail/Post/API hooks; record root Post ID, canonical
  Template ID, version grouping, visibility, fee and handoff contract.
- [x] B-03 Attempt read-only browser baseline of Gallery, supplied Detail URL,
  original Post, Template Scene picker and Landing provider section. Record
  unreachable pages; do not start a live backend to obtain screenshots.
- [ ] B-04 Verify the user's three reported shared results through authorized
  existing reads. Record root/returned Post IDs and creator distinction without
  dumping private history/prompt/signed URLs. Do not modify live posts for fixtures.
- [x] B-05 Inventory Character display consumers versus actual-input inspectors.
  Compare source crop and rendered position for picker and both selected previews.
- [x] B-06 Inventory provider IDs, asset alpha/bounds and existing colors in all
  three themes. Record source attribution/license evidence if available.
- [x] B-07 Run targeted baseline groups below. Record command/count/duration and
  separate pre-existing failures from new work; explain skipped checks.
- [x] B-08 Scaffold `scripts/test-template-presentation.mjs` with selected groups,
  no-argument help and unknown-argument failure. Unimplemented groups fail clearly
  instead of falsely passing. No automatic aggregate invocation.
- [x] B-09 Extend isolated `templateDetailLayoutFixture.mjs`,
  `templateSceneLayoutFixture.mjs` and `characterDiscoveryLayoutFixture.mjs` with
  fake API state/local images. No paid generation or live share/like mutations.
- [ ] B-10 Record request count, repository read count and response-size baseline
  for previews; retain JSON scan cost as a known capacity risk.

## Existing Short Commands (Run Later)

```sh
node scripts/test-template-detail.mjs --part=server
node scripts/test-template-detail.mjs --part=ui
node scripts/test-template-scene.mjs --part=ui
node scripts/test-character-discovery.mjs --part=cards
```

Execute independently. Test ProviderMark/CommunityProviderDirectory through the
existing Vitest invocation pattern, not the entire frontend suite.

## Exit / Stop / Rollback

Evidence map names changed sections, source owners, protected callers and fixture
limitations. Missing live server is a UAT gap, not permission to recover paid jobs.
Missing safe lineage/reference identity blocks the dependent slice only.
Rollback test-scaffold files introduced here, never user assets or runtime data.
