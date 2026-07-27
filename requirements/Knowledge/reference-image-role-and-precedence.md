# Reference Image Roles, Precedence, and Generation Contract

**Status:** Canonical knowledge  
**Applies to:** Playground, Studio, Scene Builder, Fashion Blueprint, templates, and comparisons

## 1. Purpose

An uploaded image is not self-describing. The application must attach a
semantic role to every reference so the prompt compiler, generation pipeline,
provider adapter, history record, and future template reuse all interpret it in
the same way.

The role answers which part of the requested image the reference is allowed to
control. A provider receiving image bytes without this role may copy the wrong
person, clothing, pose, or visual style.

## 2. Canonical Roles

| Role | Controls | Must not control |
|---|---|---|
| `face_reference` | recognizable facial identity, facial proportions, eyes, nose, lips, eyebrows, and skin identity | body proportions, pose, outfit, environment, or visual style |
| `character_reference` | character identity, face, hair, skin, body proportions, and distinguishing appearance | destination pose, environment, lighting, or visual treatment |
| `style_reference` | lighting language, palette, contrast, texture, camera/rendering treatment, and overall visual mood | person identity, body shape, pose, garment identity, or scene content |
| `pose_reference` | body arrangement, gesture, framing intent, and approximate composition | identity, clothing design, environment identity, or rendering style |
| `outfit_front_reference` | front garment silhouette, color, pattern, material, construction, and visible details | face, body identity, pose, or environment |
| `outfit_back_reference` | back garment construction and details paired with the front reference | use without `outfit_front_reference` |

## 3. Precedence

References and prompt text are resolved with the following ownership rules:

1. `character_reference` establishes the person identity and body.
2. `face_reference` is an alternative identity source, not an additional
   character source. Playground must not accept Face and Character together in
   the standard flow.
3. `outfit_front_reference` and `outfit_back_reference` override clothing seen
   in a Character reference unless the Character handoff explicitly declares
   the outfit immutable.
4. `pose_reference` overrides pose seen in Face, Character, Outfit, or Style
   images.
5. `style_reference` affects presentation only and has no authority over
   identity, pose, or garment design.
6. Explicit destination prompt text controls environment and content unless a
   template contract locks those fields.

Scene Template and approved Character Profile handoffs may define stricter
ownership rules. Those rules must be validated server-side and cannot be
weakened by a browser-only flag.

## 4. Valid Combinations

Recommended combinations:

```text
Face + Outfit + Pose + Style
Character + Outfit + Pose + Style
Face + Pose + Style
Character + Pose + Style
Outfit + Pose + Style
```

Invalid or incomplete combinations:

```text
Face + Character                 identity authority conflict
Outfit Back without Outfit Front incomplete garment source
Any reference with a text-only model
More unique images than the active model supports
```

Duplicate image values are counted once for provider capability and credit
estimation, but each semantic role remains visible in the request metadata.

## 5. Prompt Semantics

Manual/freeform prompt mode must not bypass reference-role instructions. The
server composes a short system-owned reference directive before the user's
manual text whenever references are active.

The directive must:

- identify the active roles
- state the ordered reference-image manifest
- describe what each role controls
- prohibit Style from copying identity, pose, or outfit
- prohibit Pose from replacing identity or clothing
- state Outfit Front/Back pairing

User-authored prompt text remains unchanged and follows the system-owned
reference directive.

## 6. Provider Transport

All provider adapters must receive resolved reference images in this canonical
order:

```text
character A
character B
outfit front
outfit back
face A
face B
style
pose
```

Missing roles are omitted without changing the relative order of the remaining
roles. Provider-specific APIs may not expose named image slots, so the compiled
directive and adapter order must remain synchronized.

## 7. Capability and UI Contract

The Reference component receives the active model capabilities and must:

- disable all uploads for text-only models
- show the active count and model maximum
- prevent an additional attachment when the limit is reached
- prevent Face and Character from being active together
- require Outfit Front before Outfit Back
- preserve already uploaded values when changing to an incompatible model, but
  exclude them from generation until a compatible model is selected
- expose a validation result that blocks Generate when active references are
  invalid

Hidden or disabled UI is not a security boundary. The server validates the
same combination, maximum count, and model capability before queueing.

## 8. Persistence and Privacy

- Playground reference values are actor-scoped.
- Saved templates and public snapshots store asset/job identifiers rather than
  embedded Base64 data.
- Private Face and Character references are removed or marked for replacement
  before crossing owner scope.
- Provider payloads may contain resolved image data only for the duration of the
  generation request.
- Logs must not include raw Base64 values.

## 9. Expected Outcome

`character_reference` answers **who the person is**.

`style_reference` answers **how the final image should look**.

The two roles are intentionally independent and must never be implemented as
interchangeable generic image uploads.
