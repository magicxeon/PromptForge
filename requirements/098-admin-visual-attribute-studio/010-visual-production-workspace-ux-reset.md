# 010 - Visual Attribute Studio Mockup-First Reset

**Status:** Revised Product UX checkpoint in implementation; mutation and Category publication workflows pending
**Reset date:** 2026-08-15
**Capability owner:** Attribute Catalog
**Primary route:** `/admin/attributes`
**Visual baseline:** `_temp/admin-visual-attribute-studio-ux-preview.html`

## 1. Reset Decision

The previous React Visual Attribute Studio implementation is rejected and has
been removed. The route remains as an intentionally empty shell so the next
implementation starts from the approved mockup instead of incrementally
repairing the former screen.

This reset removes only the Admin frontend implementation. The canonical
Attribute Catalog domain, repository, runtime data, compatibility rules,
generation workflows and customer-facing Attribute behavior remain intact.

No production UI work may resume until a static or isolated React preview is
reviewed and accepted at desktop and mobile widths.

## 2. Retained Foundations

- `server/domain/attribute-catalog/`
- `server/repositories/attribute-catalog/`
- `server/data/attribute-catalog/`
- existing Attribute source files and customer runtime behavior
- existing visual assets and manifests
- shared Generation, Assets, Credits and audit capabilities
- role-gated Admin navigation and the `/admin/attributes` route registration

The reset must not mutate, delete or republish existing catalog data.

## 3. Removed Frontend Scope

- the previous Visual Attribute Studio route UI
- route-local query, mutation and release orchestration
- frontend catalog schemas and API wrappers used only by that UI
- frontend-only authoring classification helpers and their tests
- claims that the former UI is implemented or manually qualified

The empty route shell is not a partial implementation and must not be presented
as a usable Admin feature.

## 4. Mockup-First Delivery Order

1. Correct the HTML mockup using the contracts in this requirement.
2. Review information hierarchy, controls and all primary states with Product.
3. Produce desktop and mobile visual evidence.
4. Approve the mockup as the UI authority.
5. Map the accepted screen to shared components and canonical server contracts.
6. Add regression tests for retained customer behavior before wiring mutations.
7. Implement the React screen in bounded checkpoints.
8. Verify all themes, accessibility, async states and Category publication.

## 5. Required Information Architecture

The mockup must contain:

- compact Category selector
- dependent Field selector
- Attribute type filter
- lifecycle/status filter
- bounded searchable Attribute list
- one selected Attribute editing workspace
- Definition, Visual production, Focused test and History areas as applicable
- persistent customer preview and readiness summary
- a separate Category release/publish area

The interface is an operational authoring tool. It must remain compact,
scannable and usable with a large catalog.

## 6. Attribute Type Contract

Every Attribute has an explicit presentation classification owned by the
catalog contract:

- `visual`: shown through the Visual Character or swatch/image presentation
- `text`: contributes text but has no customer visual tile requirement

The main filter bar must include an **Attribute type** filter with:

- All attributes
- Visual attributes
- Text attributes

The Visual production workspace and visual-readiness gate appear only for
Attributes classified as `visual`. Classification must come from a canonical
field/presentation contract, never from whether an image happens to exist and
never from label matching.

Within Visual production, optional secondary filters may narrow visual family,
candidate state or missing/approved assets. These are filters for visual
Attributes, not new taxonomy Categories.

## 7. Editing And Version Contract

An Admin edits and saves individual Attributes within the selected Category.
Each saved option keeps a stable generated ID, revision metadata, audit actor,
validation state and visual approval state where required.

Saving an Attribute does not publish it. Saved changes remain Category draft
content until the Category release passes validation and is published.

## 8. Category-Level Publication Contract

Publication is never an Attribute-level action.

- The publish command belongs to the selected Category.
- One publication validates and publishes one immutable Category revision.
- All changed Attributes in that Category are included atomically.
- The UI must not show `Publish attribute` or `Publish version` on an option.
- Option-level actions are Save, Generate/Upload, Test, Approve, Enable/Disable
  and Retire according to permission and lifecycle state.
- Category Publish is disabled when any included required Attribute fails
  definition, compatibility, localization, visual or focused-test gates.
- The confirmation summarizes changed, added, disabled and retired Attributes.
- Failure leaves the currently active Category release unchanged.
- Rollback restores a previous immutable Category release, not one isolated
  Attribute revision.

If the retained backend currently publishes a wider catalog release, the new
application contract must introduce a Category-scoped facade or clearly
document a temporary atomic adapter. The UI must not pretend that per-option
publication exists.

## 9. Core Screen States

- no Category selected
- Category loading, empty and unavailable
- Visual, text and mixed Fields
- no Attribute selected
- new Attribute draft
- saved Attribute with unpublished Category changes
- missing/approved/rejected visual candidate
- focused test pending/pass/conditional/fail
- duplicate legacy ID scoped to the affected item
- Category clean, dirty, validating, publish-ready, publishing and failed
- read-only Support role and unauthorized role
- conflict, stale revision and server unavailable

## 10. Regression Checklist Before React Implementation

- Face Creator, Character Sheet and Scene Builder retain all current options.
- Existing Visual Character assets, gender filtering and Age ordering remain.
- Text Attributes never acquire a false visual requirement.
- Visual Attributes remain discoverable even when their image is missing.
- Existing catalog runtime flag and rollback behavior remain unchanged.
- Admin and Support role boundaries remain enforced by the server.
- Generation and Credit operations continue through their canonical owners.
- Customer runtime never reads an unpublished Category draft.

## 11. Acceptance Gate

The reset is complete when:

- the old frontend implementation and its exclusive helpers are absent;
- `/admin/attributes` compiles as an empty reset shell;
- backend catalog data and customer runtime behavior are unchanged;
- this requirement identifies Visual Attribute filtering explicitly;
- this requirement defines atomic Category-level publication explicitly.

The replacement UI may begin only after the revised mockup is approved.

## 12. Layout Checkpoint Record - 2026-08-15

Implemented as a read-only React checkpoint:

- compact Category, Field, lifecycle, Attribute type and search controls;
- bounded option rail with URL-backed selection;
- Definition, Visual production, Focused test and History tab structure;
- customer preview resolved through the same manifest presentation used by
  Studio;
- readiness inspector and a separate disabled Category publication area;
- canonical server-projected `presentationKind` with Visual/Text API filtering;
- explicit absence of option-level publication actions.

Generate, Upload, Save, Focused test and Category Publish remain intentionally
disabled or presentation-only until this layout is manually accepted. The next
checkpoint must preserve this hierarchy and connect one workflow at a time.

## 13. Product UX Revision - Theme Controls, Preview Safety And Releases

The Product UX review identified three corrections that supersede the first
React checkpoint:

### 13.1 Theme-safe selection controls

- Admin Category, Field, lifecycle, Attribute type and release selectors use a
  shared theme-aware Select/Listbox rather than a native browser popup.
- Trigger, popup, highlighted option, selected option, focus ring and disabled
  state consume semantic theme tokens in Momelo Neon, Pearl Editorial and
  Electric Studio.
- The popup is keyboard navigable, portaled above operational panels, bounded
  in height and scrollable for large catalogs.
- The shared control must remain suitable for other operational forms; the
  Admin route must not implement a private dropdown widget.

### 13.2 Preview containment

- Every image, mask and swatch preview is clipped by its allocated frame.
- Inspectable visuals use `contain`, preserve the manifest focal point and keep
  a safe internal margin. They must never resize the option row or escape into
  adjacent rows.
- Existing Studio manifests remain the only visual source. An option without an
  approved manifest image shows a missing-visual state; the Admin UI never
  invents a replacement image.

### 13.3 Separate Category release workspace

Attribute authoring and Category publication are separate workspaces within the
Attribute Catalog capability:

- **Attribute Studio** owns filtering, definition, visual production, focused
  testing, option history and readiness. It contains no Publish button in the
  page header, option workspace or inspector.
- **Category Releases** owns the Category selector, release readiness, one
  Category-level Publish command, immutable release history and Category-level
  rollback.
- Publish and rollback actions must state the selected Category and require the
  canonical Category-scoped application facade. While the retained server
  release contract is catalog-wide, these actions stay disabled with an honest
  migration explanation; the UI must not route a Category command to the
  broader legacy mutation.
- Release history may expose retained catalog release evidence during the
  migration, but must label its scope accurately and must not imply that an old
  catalog-wide release is a Category release.

### 13.4 Regression evidence

Automated tests must prove:

- selecting Visual/Text through the shared Select reaches the canonical API;
- no Publish action exists in Attribute Studio;
- Category Releases contains Category selection, Publish, history and rollback;
- preview masks stay constrained and approved manifest assets remain visible;
- desktop and mobile layouts have no horizontal overflow in all supported
  themes.

## 14. Product UX Checkpoint Record - 2026-08-15

Implemented and verified:

- shared Radix-based `ThemeSelect` for Attribute Studio and release selectors;
- semantic theme colors for the trigger, popup, options, focus and disabled
  states instead of the operating-system native select popup;
- one shared fluid mask-preview path for the option rail, authoring preview and
  customer preview, with every rendered mask contained by its frame;
- separate URL-addressable **Attribute Studio** and **Category Releases**
  workspaces;
- Category selector, readiness summary and retained release-history evidence in
  Category Releases;
- no Publish command anywhere in Attribute Studio;
- Category Publish and Rollback visibly disabled until the server exposes the
  required Category-scoped facade.

Existing approved images are resolved from the current Studio manifests. New
or unmapped Attributes intentionally show a missing-image placeholder; no new
visual assets were generated or inserted by this checkpoint.

Validation evidence:

- focused React route suite: 4/4 passed;
- Attribute Catalog server workflow suite: 11/11 passed;
- Web TypeScript, production build and i18n validation passed;
- desktop and 390px mobile browser checks reported no console error or
  horizontal overflow;
- runtime geometry confirmed every mask preview remains inside its parent
  frame.

## 15. Definition Authoring Checkpoint

The next bounded implementation connects Definition editing before any visual
Generation or Category publication mutation:

- Search is a compact bordered input with `Search label, ID or tag` as its
  placeholder and accessible name; it has no repeated visible label above it.
- Admin can create or select an unpublished catalog draft from Attribute
  Studio. The published runtime catalog remains an explicit read-only choice.
- Definition reads accept an optional `draftId` and resolve the selected draft
  through the canonical Attribute Catalog repository. Refresh and deep links
  therefore show saved draft content without maintaining a React-side catalog
  copy.
- Admin can edit the English label, default prompt contribution and enabled
  state for a unique existing Attribute, or create an Attribute inside the
  selected existing Category/Field, then save with the draft's optimistic
  revision. Stable ID generation and enabled-locale labels continue through
  the server-owned workflows. New Category and Field creation remain absent.
- Support can inspect the same Definition workspace but receives no mutation
  control. Category Publish remains absent from Attribute Studio.
- Generate, Upload, Approve and Focused Test remain disabled until the saved
  Definition workflow passes its automated and manual checkpoint.

Implementation evidence:

- Attribute Catalog workflow: 12/12 server tests passed, including draft-only
  reads that do not change runtime.
- Admin Attribute Studio: 6/6 React tests passed, including compact Search,
  optimistic Definition Save and new Attribute creation in an existing Field.
- Web TypeScript, i18n validation and production build passed.
- Playwright checks at 1440px and 390px found no console error or horizontal
  overflow. The Search input has no wrapping visible label, and a selected
  draft exposes editable Definition controls.
- Visual evidence is stored at
  `_temp/admin-attribute-definition-draft-desktop.png` and
  `_temp/admin-attribute-definition-mobile.png`.

## 16. Deferred Backlog: Selection Refresh Polish

Attribute Studio may currently appear to refresh when an Admin changes a
Category, Field, draft or option. This is accepted for the Admin-only MVP and
is not a Requirement 098 release blocker.

Before changing this behavior, diagnostics must distinguish a real browser
document reload from a React Router navigation, query refetch or component
remount. A later UX-polish checkpoint should:

- prevent accidental native form submission by using `type="button"` for all
  non-submit actions;
- preserve the stable page shell and current selection while catalog queries
  refetch;
- update URL-backed deep links with client-side navigation and replace history
  where appropriate;
- avoid full-surface loading replacement when only the option list or editor
  data changes; and
- retain draft selection, filters, deep links, optimistic revision checks and
  actor-scoped query behavior already covered by this requirement.

The backlog item becomes higher priority only if diagnostics confirm a full
document reload, unsaved authoring state is lost, or the behavior materially
slows Admin production work.

## 17. Attribute-Type Filter Reconciliation Fix

Changing Attribute type must preserve the selected Category and Field. The
type filter may clear the selected option because that option can become
inapplicable, but it must not clear the parent context or silently return the
Admin to the first Category.

The 2026-08-16 correction removed the unconditional Category/Field reset from
the type-filter handler. Regression coverage proves both `Visual -> Text` and
`Text -> All attributes` continue querying the canonical API with the original
Category and Field. If the selected context contains no matching option, the
bounded option list shows its empty state inside that context.
