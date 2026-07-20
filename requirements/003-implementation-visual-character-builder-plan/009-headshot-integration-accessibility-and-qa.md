# Headshot - Integration, Accessibility and QA

**Status:** Proposed  
**Sequence:** 009  
**Depends on:** 001-008

## Objective

กำหนด release gate ของ Headshot MVP ให้ visual workflow ทำงานร่วมกับ state, presets, prompt compiler, providers และ accessibility เดิมอย่างครบถ้วน

## Integration Scope

- Save and restore by mode
- Presets and randomization
- Field locks
- Import/export configuration
- History and regenerate
- Comparison flow where supported
- Provider/model capability validation
- Prompt preview and authoritative server compilation
- Feature flag and legacy dropdown fallback
- Deterministic prompt cleanup and semantic merge before provider submission

## Persistence Rules

- Store semantic IDs, schema version and recipe version.
- Do not store localized labels as canonical values.
- Do not require an asset file to restore a selection.
- Unknown/deprecated IDs remain visible as recoverable warnings.
- Configuration migrations are deterministic and testable.

## Performance Budget

- Initial Studio load must not fetch every visual asset.
- Load thumbnails for the active/open section only.
- Lazy-load preview assets on demand.
- Reserve image dimensions to avoid layout shift.
- Cache immutable versioned assets.
- Contact-sheet/admin assets must not ship in the user bundle.

## Prompt Cleanup Layer

The Headshot MVP must not rely on simple string concatenation as the final prompt output. Visual selections remain the source of truth, but the compiler must pass through a deterministic cleanup layer before preview, generation, history and comparison submission.

The cleanup implementation should move from regex-only cleanup toward a semantic segment builder. Regex cleanup may remain as a final safety pass, but it must not be the primary way to understand option combinations.

### Cleanup Goals

- Preserve every selected semantic option while reducing repeated wording.
- Merge overlapping intent from different fields into one clear phrase.
- Resolve soft conflicts into human-readable output instead of emitting contradictory phrases.
- Keep client preview and server compiled prompt semantically equivalent.
- Keep provider-specific payload differences separate from character prompt content.

### Cleanup Responsibilities

The cleanup layer owns:

- identity phrase normalization such as avoiding `female woman`
- age phrase normalization such as avoiding `mature adult in mid-forties, 45 years old` unless the exact age is intentionally selected
- natural/no-makeup consolidation across `Beauty`, `Makeup`, `Skin Texture` and `Freckles`
- smile/expression consolidation across `Smile` and `Expression`
- hair consolidation across `Length`, `Cut / Style`, `Texture`, `Parting / Fringe`, `Color` and `Finish`
- recipe-level tone control so `Clean Identity` remains less commercial than `Commercial Beauty`
- provider-neutral prompt shape before provider adapters add request options

The cleanup layer must not:

- remove a selected anatomy trait completely
- change gender, age, ethnicity or visual heritage meaning
- infer skin tone from ethnicity
- introduce unselected makeup, fashion styling, clothing or expression
- rewrite provider settings such as resolution, size, aspect ratio or output format

### Semantic Option Contract

Each cleanup-sensitive option should expose semantic metadata in addition to the existing prompt phrase. The existing `prompt.default` and `prompt.gpt-image` remain backward-compatible display/legacy values, but the segment builder should prefer semantic fields when present.

Recommended option shape:

```json
{
  "id": "hair_043",
  "category": "hair",
  "subcategory": "Color",
  "prompt": {
    "default": "burgundy hair",
    "gpt-image": "burgundy hair"
  },
  "semantic": {
    "domain": "hair",
    "role": "color",
    "value": "burgundy",
    "phrase": "burgundy hair"
  }
}
```

MVP semantic roles:

| Domain | Roles |
| --- | --- |
| character | gender, age, ethnicity, beauty |
| face | shape, eyes, eyebrows, nose, lips |
| expression | smile, mood, gaze, intensity |
| hair | length, cutStyle, legacyStyle, texture, fringe, color, finish |
| skin | tone, texture, makeup, freckles |
| camera | framing, brand, lens, focalLength, imperfections, quality |

If semantic metadata is missing, the compiler may infer a role from field name and option ID as a fallback. Inference is allowed only to preserve existing behavior during migration; new visual options should define semantic metadata directly.

### Semantic Segment Builder

The compiler should build a normalized segment object first, then render the final prompt from that object.

Target shape:

```js
{
  identity: {
    gender: "female",
    age: "young adult in early twenties",
    ethnicity: "korean person",
    beauty: "delicate and elegant features"
  },
  face: {
    shape: "diamond face",
    eyes: "doe eyes",
    eyebrows: "soft arched eyebrows",
    nose: "small button nose",
    lips: "cupid's bow lips"
  },
  expression: {
    phrase: "subtle friendly expression with soft smile",
    directGazeSafe: true
  },
  hair: {
    length: "long",
    cutStyle: "layered hush cut hairstyle",
    fringe: "curtain bangs",
    color: "burgundy",
    texture: "soft glossy waves",
    finish: "glossy healthy finish"
  },
  skin: {
    tone: null,
    texture: "dewy complexion",
    makeup: "soft peach K-beauty makeup",
    freckles: null
  }
}
```

Rendering example:

```text
female, young adult in early twenties, korean person, delicate and elegant features,
diamond face, doe eyes, soft arched eyebrows, small button nose, cupid's bow lips,
subtle friendly expression with soft smile,
long burgundy layered hush cut hairstyle with curtain bangs, soft glossy waves, glossy healthy finish,
dewy complexion, soft peach K-beauty makeup
```

### Builder Rules

- Hair color must survive every combination, including cut/style phrases that do not contain the word `hair`.
- Hair length should not repeat when already implied by the selected cut/style unless it changes meaning.
- Hair texture and finish should be short modifiers, not long lighting descriptions.
- `Smile = Neutral expression` can merge with a friendly expression into `neutral-friendly micro smile`.
- A non-neutral smile must not become `neutral-friendly micro smile`.
- Headshot expression must never emit off-camera gaze wording because the headshot recipe requires direct eye contact.
- `Beauty = Raw natural look` and `Makeup = Natural Look (No Makeup)` should merge into one natural bare-face phrase.
- Skin texture should remain visible after no-makeup merge.
- Freckles should remain visible except `No Freckles`, which should normally be omitted from the final prompt.
- Camera/quality cleanup should remove duplicated optical imperfections such as both `minimal chromatic aberration` and `minor chromatic aberration`.
- Cleanup should run before the aspect-ratio suffix is appended.

### Segment Contract

Compiler output should be built from normalized segments before joining into the final prompt:

| Segment | Example Responsibility |
| --- | --- |
| Identity | gender, age range, ethnicity/heritage |
| Face Structure | face shape and proportions |
| Facial Features | eyes, eyebrows, nose, lips |
| Expression | merged smile/expression intent |
| Hair | merged hair length, style, texture, parting, color, finish |
| Skin Appearance | tone, texture, freckles, makeup/no makeup |
| Framing | headshot crop, front-facing, eye contact |
| Background | selected or recipe default background |
| Camera / Quality | recipe/provider-safe technical defaults |

### Cleanup Examples

| Raw Selection Output | Cleaned Prompt Intent |
| --- | --- |
| `female woman` | `female` or `woman` |
| `mature adult in mid-forties, 45 years old` | `mature adult in mid-forties` |
| `completely natural face..., natural look, no makeup..., natural skin texture...` | `natural bare-face look with realistic skin texture and visible fine pores` |
| `neutral expression, subtle warm friendly smile` | `neutral-friendly micro smile` or `subtle friendly expression` |
| `long hair, wavy hair, long loose waves, beach waves hair` | `long loose wavy hair` |
| `layered hush cut hairstyle, burgundy hair` | `long burgundy layered hush cut hairstyle` |
| `calm concentrated facial expression, eyes intently focused on something off-camera` | `calm focused expression with relaxed facial features` |

### Cleanup Acceptance

- TC-001 baseline prompt should fit in one compact paragraph without repeated natural/no-makeup phrases.
- Face shape must remain visible in prompt when selected.
- Hair should read as one coherent hair description, not a list of near-duplicates.
- Hair color must remain visible in TC-003 and every hair-color snapshot.
- Expression should not contain both a neutral command and a strong smile command unless the merged wording explains the intent.
- Headshot prompts must not contain `off-camera`, `looking away`, or similar gaze wording unless a future headshot recipe explicitly allows it.
- Client admin prompt textarea and server submitted prompt must match after cleanup unless an admin manually edits the textarea.
- Comparison source prompt must store the cleaned prompt used by every slot.

## Node Snapshot Test Plan

Cleanup must be covered by deterministic Node tests before manual image generation. The goal is to catch combination errors without manually generating every option pair.

### Test Command

Add a script command:

```json
{
  "scripts": {
    "test:prompt-cleanup": "node scripts/test-prompt-cleanup.js"
  }
}
```

The test runner should not call any external provider. It loads attribute JSON, builds selection objects, runs the same cleanup/compiler path used by server generation, and asserts expected prompt phrases.

### Snapshot Fixtures

Fixture location:

```text
tests/prompt-cleanup/
  headshot-cleanup.cases.json
  headshot-cleanup.snapshots.json
```

Case shape:

```json
{
  "id": "TC-003-female-fashion-hair-color",
  "mode": "headshot",
  "aspectRatio": "6:8",
  "selections": {
    "Gender": "character.001",
    "Age": "character.004_e20",
    "Ethnicity": "character.009",
    "Beauty": "character.beauty_elegant",
    "Face Shape": "face.006",
    "Eyes": "eyes.006",
    "Eyebrows": "eyebrows.002",
    "Nose": "nose.001",
    "Lips": "lips.003",
    "Smile": "lips.006",
    "Expression": "expression.004",
    "Length": "hair_003",
    "Cut / Style": "hair_022",
    "Texture": "hair.text_03",
    "Parting / Fringe": "hair_011",
    "Color": "hair_043",
    "Finish": "hair_017",
    "Skin Texture": "skin.text_02",
    "Makeup": "skin.makeup_02"
  },
  "mustInclude": [
    "female",
    "young adult in early twenties",
    "korean person",
    "diamond face",
    "doe eyes",
    "soft arched eyebrows",
    "small button nose",
    "cupid's bow lips",
    "subtle friendly expression",
    "burgundy",
    "layered hush cut hairstyle",
    "curtain bangs",
    "soft glossy waves",
    "soft peach K-beauty makeup"
  ],
  "mustNotInclude": [
    "neutral-friendly micro smile",
    "off-camera",
    "beach waves hair",
    "displaying brilliant specular light reflections"
  ]
}
```

### Required Case Groups

- TC-001 fixed baseline
- TC-002 fixed male hair and direct-gaze expression
- TC-003 fixed female fashion hair/color
- TC-004 fixed skin texture/freckles/no-makeup merge
- TC-005 expression contrast A/B
- TC-006 child-safe neutral portrait
- Hair color sweep: every hair color with at least one cut/style that lacks the word `hair`
- Hair style sweep: female-only and male-only style filtering plus prompt phrase rendering
- Expression sweep: all expression options in headshot mode must not emit off-camera gaze unless explicitly whitelisted
- Skin sweep: no-makeup, freckles, and texture combinations
- Provider invariance: same semantic prompt before provider adapter options for at least OpenAI, Gemini, Grok and Seedream

### Test Assertions

- `mustInclude` phrases are present.
- `mustNotInclude` phrases are absent.
- The prompt does not contain duplicate comma-separated phrases.
- The prompt does not contain repeated natural/no-makeup phrases.
- Hair color appears whenever a color option is selected.
- Headshot prompt does not contain forbidden gaze phrases.
- Client/server cleanup outputs match for the same selection snapshot when admin override is not used.
- Comparison source prompt equals the cleaned source prompt.

## QA Matrix

- desktop and mobile
- Thai and English
- mouse, touch and keyboard
- normal, loading, missing and corrupt asset
- reduced motion
- saved legacy configuration
- provider with pixel dimensions
- provider with resolution presets
- generation success, moderation failure and provider validation error
- prompt cleanup enabled and disabled comparison during development
- admin manual prompt override and automatic tool-driven prompt replacement

## Human Visual QA

Automated checks cannot approve semantic correctness. Every completed field requires a human-reviewed contact sheet confirming:

- only the intended property changes
- no anatomy artifacts or misleading examples
- representation and terminology are acceptable
- crop and contrast work at actual UI size

Generated image QA must additionally confirm:

- selected age range is visually plausible
- provider output does not over-beautify beyond the selected recipe
- selected face shape remains plausible, not a literal geometric shape
- selected hair style/color is visible without dominating identity
- natural/no-makeup options produce bare-face realism rather than glossy beauty makeup

## Release Acceptance

- Headshot can be completed end to end without prompt typing.
- Existing advanced generation paths remain functional.
- Missing assets do not block selection, restore or generation.
- Automated contract/integration checks pass.
- Product owner accepts every MVP visual field.
- Prompt cleanup produces compact, non-contradictory prompts for TC-001 through TC-008.
- Admin can inspect and edit the cleaned prompt before generation.

## Implementation Log

### 2026-07-17 - Deterministic Prompt Cleanup Pass

- Added deterministic Node prompt cleanup coverage with `npm run test:prompt-cleanup`.
- Added fixtures under `tests/prompt-cleanup/` for TC-001 through TC-006 plus edge cases for hair color insertion and off-camera expression cleanup.
- Cleanup now normalizes:
  - gender labels such as `female woman` and `male man`
  - age phrases that duplicate exact age numbers
  - long hair texture phrases such as specular glossy wave descriptions
  - repeated natural/no-makeup skin phrases
  - headshot expressions that mention `off-camera` or `looking away`
- Fixed client-side Live Prompt Preview mismatch where `Smile = Neutral expression` plus `Expression = Soft Friendly Smile` produced `neutral-friendly micro smile`.
- Current known issue:
  - Hair visual UI state can still miss selected `Cut / Style` or `Color` after refresh/reselect, producing prompts such as `long hair, wavy hair` without the expected `layered hush cut burgundy hairstyle`.
  - This is treated as a UI selection sync issue, not a cleanup/compiler issue, because the Node cleanup cases pass when `Color = hair_043` and `Cut / Style = hair_022` are present in selections.
- Decision: do not block the next section on this hair sync issue; revisit when the Hair visual picker receives its next UX pass.

