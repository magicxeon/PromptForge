# 005 - Compatibility, Prompt and Safety Validation

**Status:** Baseline and publication validation implemented; advanced rule-graph authoring remains deferred
**Depends on:** 001-004, Reference Processing and Generation compiler

## Objective

Prevent an Admin from publishing Attributes that create contradictory prompts,
unsafe combinations, broken references or behavior inconsistent across modes.

## Rule Types

- `requires`: option requires another field/option or capability
- `excludes`: options cannot coexist
- `disables`: a selected Reference or mode disables a field
- `clears`: selecting an option clears stale values
- `replaces`: a retired option maps to a supported successor
- `visibleWhen`: field exposure condition
- `promptBefore` / `promptAfter`: deterministic ordering constraint
- `audienceAllowed`: server-enforced safety classification
- `modeAllowed`: Face, Character Sheet or Scene exposure
- `characterTypeAllowed`: reusable or styled Character behavior

## Reference Authority Validation

Validate at least:

- Face Reference disables conflicting facial anatomy but preserves Expression.
- Character Reference preserves identity/body according to its usage policy.
- Reusable Character permits destination clothing replacement.
- Styled Character locks or preserves clothing according to its contract.
- Outfit references override Attribute clothing at the correct granularity.
- Custom hair color disables preset base/highlight controls as specified.
- Custom garment tone pair supersedes preset garment colors without suppressing
  pattern, material or surface.

Current parity fixtures must also protect:

- `studioModePolicy.ts` mode exposure and Character-reference field behavior;
- `referenceAuthorityPolicy.ts` client reconciliation and
  `ReferenceAuthorityPlanner.js` server authority;
- presentation-tag filtering, adult Facial Hair visibility and gender-specific
  Outfit Base/Body manifest variants;
- semantic Age ordering versus alphabetical ordinary-option ordering;
- the server custom Attribute limits and stale-selection reconciliation; and
- Simple Scene recipe ownership from `scene-pose-recipes.json` without turning
  recipes into editable Attribute options.

## Prompt Validation

- required prompt contribution exists for enabled semantic options
- provider adaptations remain semantically equivalent
- prompt order has no cycle
- no duplicate or contradictory positive/negative instruction
- generated prompt remains within configured budgets
- unsafe wording and policy categories are rejected server-side
- hidden/disabled options cannot enter generation payloads
- fixture compilation runs for all affected modes

## Validation Severity

- Error: blocks approval/publication.
- Warning: requires reviewer acknowledgement.
- Info: explains fallback or migration behavior.

Every result includes stable code, affected entity IDs, human explanation and a
recommended correction. Never expose raw internal errors to customers.

## Test Matrix

- each option alone
- sibling combinations within its field/category
- cross-category dependency and exclusion pairs
- each supported generation mode
- Character type and Reference combinations
- provider prompt compilation
- save/restore of disabled and retired legacy values

## Acceptance Criteria

- Cyclic and dangling rules cannot publish.
- Every current Reference override regression has an automated fixture.
- Client visibility and server enforcement produce equivalent outcomes.
- Prompt parity is proven before and after catalog migration.
- Validation output is useful without reading source code.
