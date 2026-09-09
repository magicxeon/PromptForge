# Editorial Look Sheet Pattern

Updated: 2026-09-09. Status: implemented; isolated checks passed, paid visual UAT pending.
Owner: Character Profiles definition, consumed through canonical Generation.
Primary/review roles and skills follow provider requirement image/005; Assets
privacy and historical export compatibility are included in Backend/QA review.

## Outcome And Scope

Match the uploaded LALIN editorial sheet's section hierarchy and include character
descriptions in newly generated sheets, on Playground and Studio document mode.
Do not redesign either form, ordinary image/three-view mode, result area or Video.

The approved one-image strategy remains: one provider image per request, not
separate paid generation per panel. A versioned composition specification controls
section order and proportions. It is NOT a pixel-deterministic compositor and
does not guarantee text accuracy. Exact panel geometry from separately generated
assets remains the larger fixed-layout proposal, pending cost/scope approval.

## Requirement Map

- [023 Pattern and historical compatibility](023-editorial-pattern-contract.md)
- [024 Ordered tasks and evidence](024-editorial-pattern-plan.md)
- Provider dependency: [OpenAI Image 2.5](../../../020-generation-providers/image/005-openai-image-25.md)

## Protected Behavior

- Adult minimum 18 only for document Look Sheets; approved age and outfit authority.
- Dynamic provider ratios, actor drafts, one-click Playground Enhancement,
  original result display and source references; no paid Studio gate expansion.
- Logo only at Download. No modification/replacement of trusted original pixels.
- Existing exports, private definitions and legacy preset snapshots remain readable.
- No auto publish, new Character, new reference, free generation, worker or storage.

New sheets intentionally contain user-authored name/age/descriptions in the pixels.
Sharing the sheet shares that visible text; private structured metadata must still
not be added to public DTOs. Do not render raw prompts, internal IDs or reference URLs.
