# 008 Pending And Decision Register

ID: CLSFE-008. Updated: 2026-09-08. No deferred item is implementation permission.
Parent: [master](000-master.md).

## Decisions Before Affected Implementation

| ID | Status | Decision / blocker | Resolution gate |
|---|---|---|---|
| D-01 | resolved 2026-09-08 | User selected one AI-generated sheet image. | One normal quoted output; independent slots remain P-01. No pixel-fixed composition claim. |
| D-02 | planning assumption | New image preset produces an owned generation candidate, not a new approved reusable Character. Existing identity is optional; approval/adoption remains explicit. | Review 001/004 before implementation; any automatic profile creation requires new scope. |
| D-03 | implementation input | Default export PNG can be derived from the existing Momelo mark; no replacement PNG was supplied in the repository for this feature. | Confirm correct existing artwork and render approved fallback; operator replacement remains configurable. No AI logo generation. |
| D-04 | planning assumption | Deterministic image downloads have no new user Credit fee. Paid generation remains normally quoted. | Commercial review before release; a new paid export product requires separate consent/pricing requirement. |

D-01 does not block finishing documentation or independent favicon/export
contract work. Do not force a decision by issuing paid calls or building the
entire slot workflow in the background.

## Deferred Features And Reopening Criteria

| ID | Item | Owner / reopening condition |
|---|---|---|
| P-01 | Full fixed-slot Character Package: identity views, expressions, detail/wardrobe assets, palette, notes and slot approve/regenerate history | Character Profiles + Generation + Assets. Reopen after D-01 chooses this strategy or explicit Phase 2 approval, slot count/cost/rights contract and provider evidence. |
| P-02 | Optional First Scene image from role/situation | Generation/Scene. Reopen with explicit separately quoted action, identity handoff and output/reference role tests; never auto-generate a paid scene with the sheet. |
| P-03 | Seedance trusted/ref moderation, 30-day extensions, asset registration or first-frame + multimodal mode changes | Existing Playground Video POC owner. Explicit user instruction is no changes in this round; no provider acceptance guarantee. |
| P-04 | GPU image enhancement, face restoration, video upscale/interpolation, audio/voice/lip-sync processing and independent service deployment | Future Post Processing capability under the technical proposal. Separate requirement, licenses, benchmark, async lifecycle, provider-cost evidence and Credits review required. |
| P-05 | Watermark all ordinary images/videos, export from public Community surfaces, PDF/ZIP or user-selectable export themes | Assets/Community and media owners. Explicit scope/access/format request required; not implied by shared renderer support. |
| P-06 | Adopt new sheet format into canonical reusable Profile / approved Look / Cinematic Cast | Character Profiles + Reference Processing. Require versioned verified layout/authority mapping and human review; never reuse current three-view crop coordinates blindly. |
| P-07 | Personal storage, favorites, expression/wardrobe packs and social statistics | Existing library/social backlog. No implicit account/DB/Community work. |
| P-08 | Automatically import an existing Studio attribute/Face Creator draft into the new document form | Studio + Reference Processing. Original draft and three-view handoff remain unchanged. The new form accepts explicit approved Character selection or standalone input; do not silently translate age ranges into exact ages or carry an expiring face authorization into a different format. Require an explicit import preview and authority-mapping tests before enabling automatic conversion. |

Deferred-item coordination remains under the current
[pending register](../../../097-pending-features/000-master.md), not the stale
098 path mentioned in older requirements. This file owns detailed feature
conditions; central category records link here instead of duplicating contracts.

## Technical Proposal Reconciliation

| Proposal statement | Required reconciliation |
|---|---|
| AI creates independent slots and renderer owns exact layout | Preserve as P-01. Conditional one-image MVP is explicitly different and cannot close its acceptance criteria. |
| Character package has story context | Keep identity/look reusable. Role/situation can inform styling, but actual first scene is separate P-02, not backdrop in every identity view. |
| New Character CRUD and approval endpoints | Extend existing Character Profiles facades; no parallel Character/Look lifecycle. |
| Fixed layout and auto slot cropping | Only use verified slot assets/manifests; never infer pixel coordinates from an unconstrained generated sheet. |
| Independent post-processing service immediately | Begin with bounded deterministic Assets export facade for downloads; heavy AI workers/deployment are P-04. |
| Post Processing Decision 5: UI converts usage to Credits | Credits server owns conversion/quote/reservation/settlement. A worker supplies cost/usage evidence; UI only displays authoritative values. |
| Generic processing on all generated media | Original sources remain untouched; new derivative is created only on explicit scoped Download. |

## Strategy Expansion Rules

If full fixed layout is chosen, revise PLAN before implementation: define each
required/optional slot and minimum paid outputs; pin approved identity anchor;
quote totals before each group; retry failed/unapproved slots explicitly; version
assets without overwrite; keep placeholders and preserve completed results on
partial failure. Rendering retries must never repeat Generation. Reuse existing
Generation Groups if multiple billable outputs are introduced, with a dedicated
Credit/output-count parity gate. Do not claim crops from one picture are separately
generated, identity-qualified source assets.

No cloud/database provisioning, license approval, provider policy research result
or paid visual qualification is claimed by these planning documents.

## Requirement Gap Review (2026-09-08)

Sequential Product/Backend/UX/QA review found these contract gaps and recorded
their disposition. This is documentation review, not independent runtime QA.

| Gap | Disposition |
|---|---|
| Single generated image being described as pixel-fixed slot layout | D-01 explicitly blocks the strategy-specific implementation; P-01 retains original fixed-slot acceptance. |
| Standalone form forced through owned Character/Look mutation | 001/003 separate candidate definition from approved Look IDs; old entry stays protected. |
| New sheet accidentally assigned old three-view crop coordinates | 003/004 prohibit guessed manifests; P-06 owns future verified adoption. |
| Edited form changes the name/age on an older downloaded result | 001/005 require immutable accepted snapshot through History and resume. |
| Download starts another paid generation or changes trusted bytes | 005 separates export-only retries, no Credit mutation and pre/post original-hash tests. |
| Private media leaks through export paths, mixed runs or public output URL | 005/006 require actor-authorized source projections, pinned run and private temporary output. |
| Bounded text still overflows a document or JSON errors download as PNG | 005 adds explicit overflow/error states and binary-client error parsing; 009 tests maximum lengths. |
| New deep link bypasses provider/preset gates | 002/003 preserve server-owned exposure and stale quote validation. |
| Large Post Processing proposal creates a second Credit owner | Proposal Decision 5 is reconciled to server Credits; heavy service remains P-04. |
| Deferred work scattered under stale folder names | P-items link to current 097 category register and existing domain owners. |

Implementation update: D-01 is resolved. Candidate-only behavior, approved-logo
derivation and export-without-Credit-mutation are implemented under D-02/03/04.
Focused evidence is recorded in PLAN. Paid provider quality and P-08 remain open.
The gap table above records the original planning review, not current task status.
