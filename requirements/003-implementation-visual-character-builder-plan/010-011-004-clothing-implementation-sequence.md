# 010-011-004 Clothing Implementation Sequence

**Status:** Draft  
**Parent:** 010-011  
**Depends on:** 010-004, 010-009, 010-011-001 through 010-011-003

## Objective

Define the lowest-risk sequence for implementing modular clothing.

## Sequence

### Step 1 - Data Only

- Add Outfit Base, Pattern, Material and Color attributes.
- Keep existing UI behavior stable.
- Add prompt tests for fallback and cleanup.

### Step 2 - Server Compiler

- Add `server/clothing/clothingPromptParts.js`.
- Move clothing prompt source priority into helper.
- Confirm prompt tests pass.

### Step 3 - Client Preview

- Add `client/clothing/clothingPromptParts.js`.
- Keep preview behavior aligned with server.
- Do not add visual assets yet.

### Step 4 - UI Controls

- Add modular clothing fields.
- Add swatch configs for colors, pattern and material.
- Add cleanup for invalid dependent selections.

### Step 5 - Outfit Base Visual Pilot

- Generate/review one source sheet for six Outfit Base icons.
- Slice thumb-only runtime assets.
- Wire visual picker after review.

### Step 6 - QA and Release Gate

- Run `npm run test:character-sheet`.
- Browser-test fallback, modular outfit and upload override.
- Log known issues before moving to Story Mode handoff.

## Acceptance Criteria

- Each step can be reviewed independently.
- No step requires large rewrites in core files.
- Visual assets are introduced only after prompt behavior is stable.
