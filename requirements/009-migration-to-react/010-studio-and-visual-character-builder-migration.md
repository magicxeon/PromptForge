# 010 Studio and Visual Character Builder Migration

**Status:** Implemented and React-owned; final validation pending
**Depends on:** Shared generation platform and current Character requirements

## Implementation Result

The released React ownership is:

```text
web/src/features/studio/routes/StudioRoute.tsx
web/src/features/studio/attributes/attributeModel.ts
web/src/features/studio/components/GuidedAttributeForm.tsx
web/src/components/visual-options/VisualOptionPicker.tsx
web/src/components/generation/GenerationExperience.tsx
web/src/components/profiles/CreateCharacterProfileDialog.tsx
```

Studio consumes the server attribute bundle, derives mode-compatible selections,
uses the shared generation/reference/credit/result platform, prunes Clothing
from Reusable Model state and hands generated outputs to Character creation by
stable job ID. Actor switching clears route-owned private selections and
references. No legacy global state is consumed.

## 1. Business Requirement

Migrate the guided Studio, Headshot Builder and Character Sheet Builder without
changing prompt meaning, visual option availability, reference authority,
gender compatibility, clothing policy or cross-mode handoffs.

## 2. Existing Behavior Sources

Inspect:

```text
client/app.js
client/core/studioState.js
client/core/formRenderer.js
client/core/promptCompiler.js
client/core/referenceManager.js
client/core/persistence.js
client/visual-controls/
client/clothing/
client/character-profiles/characterTypeControl.js
attributes/
client/assets/visual-character-builder/
server/domain/generation/promptCompiler.js
requirements/003-implementation-visual-character-builder-plan/
requirements/006-implementation-character-profile/
```

Code and prompt tests are authoritative where old requirements are stale.

## 3. Key Decision

Do not translate `window.state` one property at a time into one global React
store. First extract pure contracts:

```text
attribute bundle normalization
mode/category visibility policy
selection conflict resolution
reference authority
prompt input serialization
cross-mode handoff serialization
```

Pure logic that currently depends on DOM/global state must be isolated and
tested before React components consume it.

## 4. React Feature Structure

```text
web/src/features/studio/
  routes/StudioRoute.tsx
  state/
    studioReducer.ts
    studioSelectors.ts
    studioPersistence.ts
  attributes/
    attributeSchemas.ts
    attributeRules.ts
    promptInputMapper.ts
  components/
    StudioModeSwitcher.tsx
    CategoryAccordion.tsx
    AttributeField.tsx
    GuidedPromptPreview.tsx
    CharacterTypeControl.tsx
```

Shared visual controls:

```text
components/generation/*
components/ui/*
components/media/*
components/visual-options/VisualOptionPicker
components/visual-options/VisualOptionRail
components/visual-options/ColorControl
```

## 5. Modes

Preserve distinct supported workflows:

- Headshot guided character creation;
- Character Sheet creation;
- mode handoff into Character Profile;
- Scene destination entry where currently supported.

Fashion is not added as another Studio state mode. It remains `/create/fashion`.

Mode change:

- prunes incompatible selections through pure rules;
- updates available references;
- preserves compatible values;
- invalidates estimate when generation parameters change;
- does not reset unrelated actor-owned work.

## 6. Attribute Rendering

Create a schema-driven renderer. The component registry maps field types:

```text
select
multi-select
visual-card
visual-carousel
text
textarea
checkbox/switch
color
numeric
upload/reference
```

Rules:

- attribute JSON remains data, not JSX configuration code;
- labels use i18n/localized attribute data;
- unknown field types fail visibly in development;
- unsupported/hidden categories are not rendered;
- custom write-in is preserved;
- visual manifests are loaded through one asset adapter;
- selected cards remain stable and scrollable.

## 7. Prompt Parity

React does not create a new prompt compiler during UI migration.

Preferred transition:

1. extract legacy client prompt transformation into pure ESM-compatible logic;
2. lock prompt fixtures for Headshot and Character Sheet;
3. consume the pure mapper from React;
4. keep server compiler authoritative at generation;
5. compare final request prompt/snapshot against parity fixtures.

Prompt cleanup must preserve ordering and conflict rules. Cosmetic text changes
require separate product approval.

## 8. Character Type and Clothing

Preserve:

```text
reusable_model -> casting uniform, ordinary clothing controls absent
styled_character -> clothing controls/reference available, Scene-oriented
```

Reusable Model must not merely hide selected Clothing after submission; clothing
state, prompt and payload must be pruned before estimate and generation.

Outfit Reference UI:

- appears in the Clothing section for compatible workflow;
- reference upload reaches generation payload;
- incompatible customization controls are hidden/disabled according to rule;
- front/back ownership and provider limits are validated.

## 9. Cross-Mode Handoff

Replace loose globals with a versioned handoff contract:

```text
source workflow/result ID
destination
selected compatible attributes
reference asset/output ID
schema version
created/expiry timestamps
actor ID server-side
```

Handoff is resolved by destination and consumed once or explicitly retained.
Do not put large images in navigation state/localStorage.

## 10. Migration Order

1. Pure attribute/rule extraction and fixtures.
2. React schema-driven option controls.
3. Headshot form and live prompt preview.
4. Headshot generation and result handoff.
5. Character Sheet body/clothing/reference UI.
6. Character type/casting behavior.
7. persistence migration and actor switch.
8. Studio route cutover.

## 11. Tests

- every attribute field has an option/default/custom case;
- mode category visibility;
- gender/hair compatibility;
- conflict cleanup;
- Face/Character/Style/Pose/Outfit authority;
- Headshot prompt fixtures;
- Character Sheet prompt fixtures;
- Reusable vs Styled Character;
- visual manifest missing asset;
- handoff from result to Character Profile;
- estimate/payload equality;
- mobile carousel and expanded-section scroll behavior.

## 12. Exit Criteria

- Studio and Character Builder are React-owned.
- No workflow depends on `window.state`.
- Prompt fixtures match intentional current behavior.
- Reference and clothing payloads are correct.
- Schema-driven controls cover all current attributes.
- Cross-mode handoff is versioned and actor-safe.
