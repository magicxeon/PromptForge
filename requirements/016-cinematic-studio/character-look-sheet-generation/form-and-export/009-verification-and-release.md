# 009 Focused Verification And Release

ID: CLSFE-009. Status: focused verification implemented; production gates remain open. Owner: QA with each capability owner.
Parent: [master](000-master.md). The matrix below is the full target coverage,
not a claim that each proposed group has been closed. Actual commands and evidence
are recorded in PLAN's dated implementation ledger.

## Test Entry Point

Add one owning runner `scripts/test-look-sheet-exports.mjs` during implementation,
following existing selectable runner patterns. Run one group at a time; no default
aggregate, silent paid inference, live JSON mutation, worker restart or app build.
Unknown groups/failed assertions exit nonzero. Print prerequisites clearly.

Implemented command: `node scripts/test-look-sheet-exports.mjs <group>`.
Available groups: `definition`, `generation`, `form`, `export`, `privacy`,
`download`, `comparison`, `favicon`, `compatibility-prompt`,
`compatibility-profile`, `compatibility-credit`, `compatibility-billing`,
`compatibility-groups`, `compatibility-ui`, `types`.
`all` aggregates these isolated checks explicitly. Browser checks are separate:
`node scripts/verify-look-sheet-exports.mjs playground` (or `studio`, `comparison`).
Proposed matrix labels such as `uat`, `drafts`, `performance` are not aliases and
must not be cited as executed commands; related partial evidence is mapped in PLAN.

| Group | Scope / fixtures | Acceptance IDs |
|---|---|---|
| definition | required/optional fields, Unicode bounds, defaults, age range/identity/outfit conflict, standalone/profile mode | DEF-A1..3 |
| navigation | URL normalization, Image submode, no Video leak, disabled Video feature, Back/Forward | UI-A1..2 |
| drafts | actor isolation, mode switching, older drafts, accepted result vs edited form, late response | DEF-A4, UI-A4, STU-A3 |
| prompt | same preview/final normalized definition; explicit age, fixed identity, no logo/text instructions or old recipe collision | GEN-A2..4 |
| generation | mocked quote/submit/Queue parity, actual reference count, insufficient Credit, stale/duplicate inputs, failure/refund, History metadata | GEN-A1..6, DEF-A4 |
| ui-playground | shared form, locks/errors, pending/terminal states, unchanged engine/result actions | UI-A2..5 |
| ui-studio | old/new format, handoff/identity, draft/config retention and no accidental approval | STU-A1..6 |
| export | snapshot document text, PNG/logo validation, contain layout, cancellation/retry, no inference/charge, unchanged input hashes | EXP-A1..7 |
| comparison | Auto/orientation/fallback, explicit override, layout policy parity, full/partial runs, stable order/captions, layout fingerprint and limits | CMP-A1..4/6/8..10 |
| privacy | foreign/deleted source, mixed ownership, traversal/SSRF attempts, public DTO sanitization, filename/metadata, actor change during download | DEF-A5, EXP-A2..4/7, CMP-A2 |
| favicon | approved mark, head declaration, development/build asset resolution checks where available | ICO-A1..3 |
| compatibility | nearest existing Character Look, Character Sheet, image/reference/Credit/Comparison and unchanged Video regression fixtures | GEN-A4..5, STU-A6, UI-A2 |
| types | TypeScript, scoped lint and locale key/interpolation parity | shared contract gate |
| layout-playground | real React with isolated API fixtures at 390/820/1440px, EN/TH | UI-A5 |
| layout-studio | old/new format, expanded details, loading/error, long text | STU-A1..6 |
| layout-comparison | portrait/landscape/square/mixed sets, Auto/manual layouts, paging, zoom/fullscreen, 390/820/1440px, existing private/public/generation image actions | CMP-A3/5..8/10 |
| layout-export | inspect actual PNG bytes for name/age/logo, image corners/text clipping, row/stacked order and viewport-independent composition | EXP-A5, CMP-A5/8..9 |
| layout-favicon | browser tab/resource request in dev and separately built preview | ICO-A1..3 |
| performance | bounded CPU/media fixture benchmark, maximum counts/size, timeout, busy/cleanup | EXP-A6..7 + budgets |

`all` explicitly aggregates isolated non-browser deterministic groups through
`types`; it does not run a full-site test suite. `uat` explicitly aggregates
the relevant browser/export layout groups with the same mocked/offline sources.
`performance` is separate so repeated unit work stays short. None of these
groups runs paid providers. Existing relevant test files should be selected
directly or delegated to their owning runner, not copied into parallel suites.

## Implementation Validation Order

1. Definition/navigation/drafts before showing a functioning Generate action.
2. Prompt and mocked generation/authorization before connecting live capabilities.
3. Each UI surface in isolation before touching its sibling surface.
4. Export pure renderer, privacy and failure tests before wiring Download.
5. Comparison and favicon independently after their specific changes.
6. Targeted compatibility, type/locales, then browser verification per page.
7. Explicit aggregate later for UAT/pre-production, not after every small task.

## Fixtures And Protected Behavior

- Use synthetic owned images, Thai/English names, EXIF-free fixtures, mixed
  aspect ratios, long labels, transparent PNG logo, malformed images and foreign
  actor IDs. Do not copy private media/signed URLs into committed test fixtures.
- Verify originals with pre/post SHA-256; inspect output pixels at logo/media
  positions, not just HTTP status or element existence. Decode exported PNG and
  visually inspect actual text/font/glyph coverage as well as layout assertions.
- Protect General image Prompt Composer, Image Comparison, provider/model gates,
  existing Credit estimate, collection/share/winner/individual download, existing
  Character Look owner-only dialogs and Studio three-view approval.
- Preserve Image/Video switching, named looks and existing trusted-source errors;
  use existing trusted/ordinary fixtures, not paid Seedance calls.
- Use Momelo Neon for the full EN/TH viewport matrix, with representative
  desktop/mobile checks for the shared controls in Pearl Editorial and Electric
  Studio. Record any unchecked theme variant rather than claiming all-theme QA.
- Retry, navigation during an active Job, removed media, actor switch and stale
  metadata must not produce wrong-actor output or overwrite current state.
- Comparison fixtures must cover 2/3/6 images within the configured limit, a
  partial terminal run, missing dimensions and mixed orientation. Prove export
  includes off-page completed results, ignores inspection zoom/mobile reflow,
  changes fingerprint for a new layout, and never unlocks public/Video exports.

## Manual Visual / Provider UAT

Browser checks use the existing local dev server or an explicitly started test
server. Record the URL and any unverified viewport; no automatic production
build or worker restart. A build/preview favicon check may run later in a
temporary output directory so dirty `web/dist/` is not overwritten.

Paid media quality is a separate owner-approved activity after D-01. Start with
one prompt-only case and one permitted existing-identity case only if needed;
reuse existing evidence where possible. Record model/version, Job ID, dimensions,
actual Credit quote, result, source mode and approval. Stop at the agreed budget.
This plan authorizes zero paid calls. No extra Video pricing tests are required.

Human rubric: one identity across views, intended age appearance, unchanged
outfit/hair/body, complete figures, usable portrait, absence of invented text or
extra people. A passing compile test cannot certify media quality. One successful
image does not qualify all models, or imply Seedance acceptance.

## Release Checklist

- [x] D-01 resolved and strategy-specific requirement/price surface reconciled.
- [ ] Every implemented child has passing focused evidence in PLAN.
- [ ] Source and export privacy/authorization tests pass.
- [ ] Quote/submit and retry/settlement invariants pass unchanged.
- [x] No original rewrite, new provider transport, or silent profile approval.
- [ ] Browser/layout evidence recorded per affected surface/locale/viewport.
- [x] Output visual/provider quality recorded separately or capability remains gated.
- [x] Logo replacement procedure, source ownership and render budgets recorded.
- [ ] Planned/new paths checked against architecture; no accidental file moves.
- [ ] Scoped diff reviewed; unrelated user changes and live runtime data untouched.

Requirements remain planned until actual implementation and evidence pass.
Documentation review below is not release certification.
