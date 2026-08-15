# Character Profile QA and Release Gates

**Parent:** `000-master-character-profile-roadmap.md`  
**Status:** Implemented; validation pending

## 1. Automated Test Matrix

Required:

- domain lifecycle and version immutability
- owner/public repository contract parity
- casting export prompt policy
- quote/reserve/capture/release integration
- public projection sanitization
- cross-user authorization denial
- handoff conflict ownership
- usage event idempotency and category aggregation
- owner metadata/personality editing and optimistic concurrency
- Community Character section filtering/deep links
- picker reuse badge/action policy
- reusable-model versus styled-character Clothing UI
- Styled Character Scene-only destination enforcement
- legacy Character Type migration
- archive/block/unpublish behavior
- JSON record contains no Base64

Suggested files:

```text
test/characterProfileLifecycle.test.js
test/characterCastingExport.test.js
test/characterProfileSharing.test.js
test/characterDestinationHandoff.test.js
test/characterUsageAnalytics.test.js
```

## 2. Manual E2E

Run the Windows validation bundle before manual E2E:

```bat
scripts\test-character-profile.bat
```

```text
TC-CP-001 Owner creation
Choose Reusable Model -> verify locked 3-view/6:8/Casting Uniform
-> generate Character Sheet once -> create profile from the result
-> profile opens in review without a second generation/charge
-> approve -> keep private
```

```text
TC-CP-002 Public reuse
Owner publishes -> second user opens profile -> selects Use in Fashion
-> Fashion receives Character Reference -> successful output increments Fashion
```

```text
TC-CP-003 Privacy
Second user inspects APIs and generation payload
-> no private face/outfit source, Base64 or owner local path is present
```

```text
TC-CP-004 Policy change
Owner unpublishes -> cached public page may remain visually stale
-> new handoff is rejected server-side
```

```text
TC-CP-005 Personality edit
Owner edits personality -> Community/profile reflects new text
-> new Fashion handoff snapshots new personality
-> prior generation retains old snapshot
```

```text
TC-CP-006 Character picker rights
Reusable, view-only and owner-only Characters appear with distinct accessible
status -> only authorized Character can be selected.
```

```text
TC-CP-007 Character type
Choose Reusable Model -> Clothing becomes locked Casting Uniform and outfit
references are excluded -> no preset, color, pattern, material or custom
Clothing control remains visible -> Sheet Layout and aspect ratio are locked to
the three-view 6:8 casting contract -> approved profile supports Fashion and
Scene.
Choose Styled Character -> Clothing stays editable -> approved source supports
Scene only -> Fashion is hidden and rejected by the server if called directly.
```

## 3. UI Gates

- Desktop and mobile profile page
- keyboard/focus and image alt text
- loading, empty, blocked and archived states
- credit estimate visible before export
- no duplicate credit estimate or generation is required between initial
  Reusable Model output and Profile approval
- owner name and reuse status clear
- no buttons shown that server policy will always reject
- Community Character section is directly reachable and refresh-safe
- permission status uses icon + text + accessible label, not color alone

## 4. Release Order

1. Private Character Profile
2. Casting export and approval
3. Owner-only destination handoff
4. Public Character page/view-only
5. Public reusable handoff
6. Usage analytics

Feature flags must allow rollback to the prior Character Sheet flow without
deleting Character Profile data.

Implemented rollback flag:

```text
community.characterProfilesEnabled
```

When disabled, Character Profile APIs and Community Character routes fail
closed, creation actions are hidden, and the existing Character Sheet-to-Scene
handoff remains available. Stored profile/version/usage records are preserved.

## 5. Exit Gate

- No unresolved high-severity ownership/privacy issue.
- Credit reconciliation is exact under duplicate/retry tests.
- Public reuse works between two actors.
- Existing Character Sheet and Scene Builder regression tests pass.
- Product Owner approves casting uniform/layout previews before public launch.
