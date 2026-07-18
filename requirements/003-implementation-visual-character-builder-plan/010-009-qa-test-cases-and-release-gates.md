# 010-009 Character Sheet QA Test Cases and Release Gates

**Status:** Implemented - Automated Gate Baseline  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001 through 010-008

## Objective

Define QA for Character Sheet Builder and Story Mode reuse readiness.

## Test Cases

### CS-001 Baseline Sheet

Saved headshot plus Character Sheet Baseline outfit.

Expected:

- prompt includes front/side/back
- prompt preserves identity
- prompt uses clean sheet background

### CS-002 Outfit Preset Sheet

Saved headshot plus outfit preset.

Expected:

- prompt includes outfit preset
- no uploaded outfit reference text
- result is suitable as Story Mode reference

### CS-002B Modular Clothing Sheet

Saved headshot plus:

- Outfit Base
- Primary Color
- Secondary Color
- Pattern
- Material

Expected:

- prompt combines clothing parts in deterministic order
- prompt does not duplicate color phrases
- prompt does not mention pattern when no pattern is selected
- visual output keeps clothing consistent across sheet views
- generated sheet is suitable as Story Mode reference

### CS-002C No Clothing Selection Fallback

Saved headshot with no outfit preset, no modular clothing selection, and no outfit upload.

Expected:

- prompt uses modest neutral reference clothing
- prompt does not use lingerie, bikini, transparent, lace, sexy, revealing, or erotic wording
- output remains practical for character-sheet visibility
- fallback works for adult female and adult male silhouettes

### CS-003 Outfit Front Upload

Saved headshot plus front outfit upload.

Expected:

- prompt references front outfit upload
- prompt does not promise exact unseen back details
- preset outfit text omitted

### CS-004 Outfit Front and Back Upload

Saved headshot plus front and back outfit uploads.

Expected:

- prompt references both views
- back-view sheet instruction is supported
- lineage records both uploads

### CS-005 Story Mode Handoff

Generated character sheet selected in Story Mode.

Expected:

- Story Mode receives sheet reference
- identity/outfit lock metadata preserved
- story prompt does not rebuild sheet instructions

## Release Gate

Do not release until:

- category reduction is complete
- prompt tests pass
- generated sheet is visually usable as Story reference
- at least one provider with reference-image support is tested
- unsupported provider path shows clear warning
- history handoff works
- no-clothing fallback is modest and non-revealing
- modular clothing selections compile without duplicated prompt phrases
- clothing UI changes do not add large one-off logic to `app.js` or `formRenderer.js`

## Automated Gate

Run:

```bash
npm run test:character-sheet
```

This command must pass before wiring any Character Sheet visual assets into the runtime UI.

Current automated coverage:

- Character Sheet prompt contract tests.
- Story/reference mode separation tests.
- Character Sheet persistence snapshot tests.
- Prompt cleanup regression tests.
- Character Sheet visual manifest contract check.

Expected pre-visual state:

- `npm run test:character-sheet` passes.
- `visual-assets:check:character-sheet` may warn about missing source sheets.
- `visual-assets:check:character-sheet` may warn that `reviewStatus: planned` blocks publishing.
- Those warnings are acceptable until a source sheet has been reviewed.

## First Visual Pilot Gate

Pilot field:

```text
Body > Body Silhouette
```

Before publishing the first runtime visual cards:

1. Generate one 2x3 source sheet for:
   - straight natural silhouette
   - curvy natural silhouette
   - hourglass silhouette
   - pear-shaped silhouette
   - inverted triangle silhouette
   - full-figured / plus natural silhouette
2. User reviews the full source sheet before slicing.
3. If approved, update only `body-silhouette.manifest.template.json` review statuses to `source-selected` or `approved`.
4. Run:

```bash
npm run visual-assets:slice:character-sheet
```

5. Review generated contact sheet.
6. Only then wire `Body::Body Silhouette` into `client/visual-controls/visualOptionControls.js`.

Reject source sheet if:

- silhouettes are too sexualized
- pose is not neutral enough for sheet reference
- scale differs too much between cells
- face/hair/clothing details distract from silhouette
- any cell is cropped off-center
- semantic difference is unclear at thumbnail size

## Acceptance Criteria

- QA verifies sheet consistency, not only prompt syntax.
- Known issues are logged before release.
- Character Sheet Builder can be disabled independently if gate fails.
- Clothing QA covers outfit base, pattern, color, material and fallback behavior.

## Clothing-Specific Release Gate

Before enabling the first modular clothing UI:

1. Define semantic attributes for:
   - Outfit Base
   - Pattern
   - Material
   - Primary Color
   - Secondary Color
2. Add prompt cleanup tests for:
   - no clothing fallback
   - solid/no pattern omission
   - primary color only
   - primary + secondary color
   - uploaded outfit reference overriding modular clothing
3. Verify the browser UI:
   - selected state is visible
   - controls are understandable without fashion vocabulary
   - changing Outfit Base does not leave invalid color/pattern state
4. Verify runtime assets:
   - outfit visual assets are thumb-only
   - source sheets stay under `visual-assets`
   - browser manifests do not reference `master` or `preview` unless required
5. Verify code organization:
   - clothing-specific dependency logic lives in a clothing module
   - compiler helper is isolated and testable
   - no new large clothing condition blocks are added to core renderer files

## Implementation Log

### 2026-07-18 - Automated Release Gate

- Added `scripts/test-character-sheet-release-gate.js`.
- Added npm script:

```bash
npm run test:character-sheet
```

- Gate currently runs:
  - `node --test test/modeSpecificCharacterReference.test.js test/characterSheetPersistence.test.js`
  - `node scripts/test-prompt-cleanup.js`
  - `node scripts/slice-visual-assets.js --check --field=character-sheet`
- Confirmed that missing source sheets and planned review statuses remain warnings during check mode, while publishing stays blocked by the slice guard.
- Verified `npm run test:character-sheet` passes in the current pre-visual state.

### 2026-07-18 - First Visual Pilot Passed

- Body Silhouette source sheet was accepted and sliced.
- `Body > Body Silhouette` is now wired to the visual-card picker.
- `npm run test:character-sheet` passes after runtime publish.
- Remaining warnings are limited to unpublished Character Sheet visual families:
  - Body Build
  - Outfit Preset
  - Sheet Layout

### 2026-07-18 - Clothing QA Scope Revision

- Added modular clothing test scope:
  - Outfit Base
  - Pattern
  - Primary/Secondary Color
  - Material
  - modest no-selection fallback
- Added requirement that no-clothing fallback must remain non-revealing and provider-safe.
- Added code organization gate to prevent clothing implementation from bloating the core app files.
