# React Reference Authority and Guided Control Lockout

**Status:** Implementation required  
**Owner:** React generation and Studio features  
**Depends on:** React migration requirements 013-014 and
`requirements/003-implementation-visual-character-builder-plan/010-014-scene-character-directing-and-reference-set-idea.md`

## 1. Business Requirement

Uploaded and reused reference images must be authoritative for the visual
properties they contain. Guided controls must not imply that a user can override
the same properties when the canonical generation pipeline will preserve them
from a reference.

The UI must remain understandable:

- a Face Reference owns facial identity;
- Expression remains editable because it directs performance rather than
  identity;
- a Reusable Model Character Reference owns identity, hair and body while its
  white casting outfit remains replaceable;
- a Styled Character Reference owns identity, hair, body and its existing
  outfit;
- Outfit Front or Outfit Back owns clothing and accessories;
- an explicit Outfit Reference may replace the outfit carried by a Character
  Reference, but text clothing and accessory selectors remain disabled.

Removing the controlling reference restores the previous guided selections.
Disabled selections may stay in actor-scoped draft state, but they must not enter
the compiled prompt, generation payload, exported effective configuration or
randomization result while the reference is active.

## 2. Ownership Rules

| Active reference | Owned guided fields | Still editable |
|---|---|---|
| `face_reference` | Every field in Face except Expression | Expression, Hair, Skin, Body, Clothing |
| reusable `character_reference` (`outfitBehavior: replaceable`) | Character, Face except Expression, Hair, Skin and Body | Expression, Clothing, Accessories, Pose, Environment, Lighting, Camera, Quality |
| styled `character_reference` (`outfitBehavior: preserve`) | Character, Face except Expression, Hair, Skin, Body, Clothing and Accessories | Expression, Pose, Environment, Lighting, Camera, Quality |
| `outfit_front` or `outfit_back` | Clothing and Accessories | Identity, Expression, Body, Pose and scene direction |

Precedence:

1. Character Reference always owns identity and body proportions.
2. A Reusable Model exposes Clothing and Accessories in Scene Builder; its
   fitted white casting garment is not a destination outfit.
3. A Styled Character preserves its depicted outfit and disables Clothing and
   Accessories.
4. Outfit Reference owns clothing when supplied and disables text clothing
   controls for either character type.
5. Face Reference owns facial identity when no Character Reference is active.
6. Expression is never removed by Face or Character reference authority.

## 3. Software Design

Create a pure policy module under the Studio capability because Studio owns the
guided attribute model and Scene Builder consumes that model:

`web/src/features/studio/referenceAuthorityPolicy.ts`

The module must expose:

- a resolver that returns the authority for a field;
- selection filtering for prompt and payload inputs;
- disabled field-name resolution for rendering;
- group filtering that keeps Scene Expression available;
- randomization filtering through the same authority decision.

`GuidedAttributeForm` receives active references and computes field authority.
`VisualOptionPicker` receives `disabled` and an explanatory label. Its fieldset
must disable the select, visual cards, custom input and lock control together.

Routes remain responsible for state:

- `StudioRoute` passes effective references and submits filtered selections;
- `SceneBuilderRoute` passes active references and submits filtered selections;
- Character Sheet handoff carries `characterType` and `outfitBehavior`; Scene
  Builder must preserve this contract through UI state, generation payload and
  server prompt compilation;
- profile-backed Character usage must replace client-supplied outfit behavior
  with the canonical server-authorized Character Profile policy before prompt
  compilation;
- removing a reference re-enables saved selections without recreating them.

No UI module may duplicate reference ownership sets.

## 4. Implementation Plan

1. Add `referenceAuthorityPolicy.ts` with pure typed helpers.
2. Extend `GuidedAttributeForm` with a `references` input.
3. Extend `VisualOptionPicker`, `VisualImagePicker` and `VisualSwatchPicker`
   with disabled behavior.
4. Apply filtered effective selections in Studio prompt, payload and export.
5. Apply filtered effective selections in Scene guided prompt, payload and
   export.
6. Ensure Surprise Me skips fields controlled by references.
7. Add English, Thai and disabled Japanese catalog keys.
8. Add unit coverage for Face, reusable Character, styled Character and Outfit
   authority.

## 5. Impact and Concerns

- Manual Prompt mode remains user-authored and is not silently rewritten.
- Template-required selections remain stored but reference-owned conflicting
  selections are omitted from the generation payload.
- Existing actor drafts do not need migration because disabled values remain
  recoverable.
- Outfit uploads continue to use the canonical reference slots and provider
  capability limits.
- Server prompt compilation remains the final authority and must receive the
  same filtered selections shown by the UI.

## 6. Testing

Automated:

- Face Reference disables Face Shape, Eyes, Eyebrows, Nose, Lips and Smile but
  keeps Expression.
- Reusable Character Reference removes identity/body selections, keeps Clothing
  and preserves Expression, Pose and Environment.
- Styled Character Reference removes identity/body/clothing selections and
  preserves Expression, Pose and Environment.
- A Scene without a Character Reference retains editable Hair, Skin, and Body
  selections; mode filtering alone must not remove these groups.
- Outfit Reference removes Clothing and Accessories selections.
- Randomization does not change reference-owned fields.
- Removing references restores the stored selection to the effective set.

Manual:

1. Reuse a Face Creation image in Character Sheet.
2. Confirm every Face control except Expression is disabled.
3. Generate and inspect that conflicting face selections are absent.
4. Add an Outfit Front image and confirm Clothing/Accessories are disabled.
5. Send a Reusable Model to Scene Builder and confirm Clothing and Accessories
   remain editable.
6. Send a Styled Character to Scene Builder and confirm Clothing and
   Accessories are disabled while the source outfit is preserved.
7. Remove each reference and confirm previous guided choices become editable.
8. Open a Character Sheet result from both the active result and Recent
   Generations, select **Build a Scene**, and confirm Scene Builder receives the
   sheet as `character_reference`.

## 7. Acceptance Criteria

- The form visibly matches reference ownership.
- Prompt, payload, export and randomization use the same policy.
- Expression remains editable with Face or Character Reference.
- Reusable Model allows a new outfit; Styled Character preserves its carried
  outfit; explicit Outfit Reference owns the replacement outfit.
- Removing a reference restores controls without losing saved choices.
- Character Sheet result actions hand the selected sheet to Scene Builder rather
  than navigating without a Character Reference.
