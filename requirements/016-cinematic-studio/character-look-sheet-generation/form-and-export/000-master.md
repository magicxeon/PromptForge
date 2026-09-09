# Character Look Sheet Forms And Branded Exports

ID: CLSFE. Updated: 2026-09-08.
Status: one-image baseline implemented; focused verification in progress. Paid visual UAT remains open.
Parent: [Character Look Sheet Generation](../000-master.md).

## Momelo Enhancement Follow-up

2026-09-09: [025 Comparison download and shared loading](025-comparison-export-master.md)
owns 026-029. Export now targets the black six-preset design and encoded preview;
this supersedes 006's exported composition only, not the live Comparison viewer.

2026-09-09: [022 Editorial Pattern](022-editorial-pattern-master.md), 023-024
supersede v1's no-text/five-view-only recipe for new document generations.
Version 2 includes captions and descriptive notes in the generated image;
Download adds branding without a duplicate header. One-image strategy remains.

2026-09-09: [017 Dynamic Render](017-dynamic-render-master.md) and 018-021
supersede fixed ratios, configuration-first display and manual Playground
Enhancement confirmation. Document-only age minimum is 18 on both surfaces.
Paid Studio Enhancement remains gated pending explicit approval; its original
three-view Character workflow and age policy remain unchanged.

The 2026-09-08 request and subsequent implementation are owned by
[011 Momelo Enhancement master](011-momelo-enhancement-master.md), requirements
012-015 and [016 ordered tasks/tests](016-momelo-enhancement-implementation-plan.md).
It adds a prominent Character Prompt field and optional paid AI rewrite using
Studio Natural Realism principles and server-priced fixed service fees derived
from Luna rates. Implementation and isolated tests are complete; live paid
provider quality UAT and production multi-writer readiness remain separate gates.

## Outcome

Create a named Character Look Sheet from a small structured form in Image
Playground and Studio Character Sheet. Retain original generation media. The
editorial v2 recipe includes document text in the generated sheet; historical v1
exports still add that text at Download. Add a configurable Momelo logo only to
explicitly downloaded exports. Reuse the export capability for merged Comparison images and use the
existing Momelo mark as the browser favicon.

This is an authoring/layout preset, NOT a Community reusable Template. It does
not publish a post, create reuse rights, or automatically create a Character.

## Decisions From Discussion

| Decision | Delivery contract |
|---|---|
| Keep Image / Video | Add a smaller Image-only segmented selector: General image / Character Look Sheet, above the authoring inputs. No new main tab, sidebar item or mandatory page. |
| Structured input | Ask name, age, character appearance and role/situation; outfit and personality are optional, with visible stable defaults. |
| Existing identity optional | New fictional-character authoring does not require an existing profile. Selecting a Character uses existing authorized identity/version contracts. |
| Two entry surfaces | Playground and Studio Character Sheet reuse one form/definition/prompt contract; preserve the current three-view workflow. |
| Seedance unchanged | No provider gate, trusted-source rule, URL transport, reference picker, expiry, or Video mode change. |
| Branding at Download | Original images and generated previews remain unmodified. Export is a separate download, not an automatic post-generation rewrite. |
| Configurable logo | PNG logo source/path and placement configuration; Momelo mark at bottom-right with safe inset. |
| Shared export | Look Sheet document and Comparison merged image use one Assets export facade. |
| Comparison layout | Image viewers support Auto / Side by side / Top to bottom. Auto stacks landscape images; portrait/square default to a row. Download preserves the selected logical layout, not viewport reflow. |
| Web icon | Use existing Momelo artwork for favicon; do not redesign the logo. |

## Confirmed Strategy

On 2026-09-08 the user explicitly selected **one generated sheet image first**.
D-01 is resolved. The server owns the five-view recipe and accepted definition;
this was extended to editorial v2 in 022-024 while retaining one provider image.
Download composes the version-appropriate text and logo without altering originals.
Independently generated fixed-layout slots remain P-01. This implementation does
not claim pixel-fixed internal panels or provider-qualified identity consistency.

## Requirement Index

| ID | Requirement | Depends on | Status |
|---|---|---|---|
| 001 | [Definition, identity and lineage](001-definition-identity-and-lineage.md) | D-01 resolved | baseline implemented; extended reload matrix open |
| 002 | [Playground form and navigation](002-playground-form-and-navigation.md) | 001 | implemented; fixture layouts passed |
| 003 | [Prompt and Generation contract](003-prompt-and-generation-contract.md) | 001, D-01 | implemented; paid visual UAT gated |
| 004 | [Studio integration](004-studio-character-sheet-integration.md) | 001-003 | adapter implemented; P-08 pending |
| 005 | [Download export and branding](005-download-export-and-branding.md) | 001, 003 metadata | implemented; soak/cross-OS evidence open |
| 006 | [Comparison layout and merged download](006-comparison-merged-download.md) | 005 for export | implemented; focused checks passed |
| 007 | [Momelo browser icon](007-momelo-browser-icon.md) | existing brand source | implemented; build preview open |
| 008 | [Pending and decision register](008-pending-and-decision-register.md) | user/provider evidence when reopened | recorded, not implemented |
| 009 | [Focused verification and release](009-verification-and-release.md) | each affected slice | conditional development acceptance |
| PLAN | [Ordered implementation plan](010-implementation-plan.md) | requirements + decision gates | implementation and evidence ledger |

## Owners And Roles

- Primary: Product And Requirement Architect.
- Sequential reviewers: Backend Platform Architect, UX/UI Product Designer,
  QA Release Engineer. Four roles are justified by a new billable input contract,
  two authoring surfaces and authorized private-media download composition.
- Skills: review-product-ux, review-generative-media-pipeline,
  implement-generation-workflow, review-commercial-integrity and
  verify-release-regressions (requirement review and future implementation gates).
- Backend includes privacy/authorization and commercial invariant review; no
  changes to rates, ledgers or authentication are proposed.
- Reviews in this delivery are sequential self-review, not independent agents
  or runtime/provider qualification.

| Responsibility | Canonical owner |
|---|---|
| Character identity and approved Look versions | Character Profiles; CharacterUsageService / CharacterLookService |
| New authoring definition policy | Character Profiles, called by Generation; no new Character CRUD lifecycle |
| Final prompt, quote, submit, Queue, completion and History | GenerationApplicationService, generationRequestService, promptCompiler |
| Reference resolution and authorization | Existing Reference Processing / Assets / Character handoff |
| Price, reservation, capture/refund | Existing Credits owner |
| Download composition and logo rendering | Assets; proposed MediaExportService facade, no GPU inference |
| Comparison membership/run authorization | ComparisonOrchestrator; export reads through owner facade |
| Forms and result actions | Shared controlled components; Playground/Studio orchestrate |
| Browser favicon | Web application bootstrap and existing brand artwork |

## Sources And Precedence

Read the current [architecture map](../../../099-technical-dept/000-master.md)
and [ownership gate](../../../009-migration-to-react/016-capability-ownership-and-single-workflow-entry-points.md).
Existing [Look entry](../../playground-video-reference-poc/012-character-look-sheet-entry.md)
and [named Video references](../../playground-video-reference-poc/014-multiple-named-look-sheets.md)
remain protected behavior.

Visual/technical references:
- [Fixed Layout proposal](../../../099-technical-dept/Technical-Documents/momelo-character-looksheet-fixed-layout-implementation.md).
- User's MIRA sheet in this conversation: name/age/role header, identity views,
  portrait, expressions, wardrobe, details and notes. No repository image path
  is invented; obtain a local visual fixture before pixel-level visual UAT.
- [Post Processing proposal](../../../099-technical-dept/Technical-Documents/momelo-post-processing-service-implementation-plan.md).

Latest user decisions override those proposals for this delivery: no Seedance
changes; branding at download only. Heavy AI post-processing and the full slot
package are not silently included. This package does not certify those proposals.

## Release Boundary

Implementation and slice evidence are recorded in PLAN; its dated ledger
supersedes initial planned statuses in this index. No live runtime JSON, original
media, provider calls or backend workers were changed. `LOOK_SHEET_DOCUMENT_ENABLED`
defaults off in production and on outside production; explicit false disables it.
Keep production exposure off until the owner validates paid image quality.
Studio's original attribute/face draft is preserved, not silently converted into
the new form. Explicit automatic import is deferred as P-08.
