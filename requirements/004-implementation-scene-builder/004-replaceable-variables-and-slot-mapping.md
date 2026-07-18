# Scene-004 Replaceable Variables and Slot Mapping

**Status:** Proposed - Awaiting Review  
**Feature type:** Template variables and user replacement flow  
**Depends on:** Scene Template contract, visual option schema, reference manager  
**Created:** 2026-07-18

## 1. Objective

Define which parts of a Scene Template can be replaced by another user without editing the whole prompt manually.

This is the core of `Use Template`.

## 2. Variable Types

MVP variable types:

```text
reference_image
select_option
custom_text
color
number_later
locked_text
```

## 3. Replaceable Reference Slots

Recommended slots:

```text
character_reference
face_reference
outfit_front_reference
outfit_back_reference
style_reference
pose_reference_later
```

Product reference is deferred.

## 4. Replaceable Option Fields

Guided templates can expose selected fields as replaceable:

- Gender, age range and visual heritage only when template creator allows.
- Face/hair/skin fields for character variation.
- Outfit base, pattern, material and color.
- Scene, camera, lighting and mood.
- Custom write-in fields.

Default policy:

- Identity fields are locked unless the creator marks them replaceable.
- Outfit and color fields are replaceable by default.
- Scene/camera/lighting are replaceable by default for remix.
- Safety-sensitive fields cannot be made freely replaceable without validation.

## 5. Variable Schema

```text
SceneTemplateVariable
- id
- label
- type
- required
- defaultValue
- sourceFieldName
- sourceGroup
- allowedOptionIds
- acceptsCustomText
- publicDescription
- privacyPolicy
```

## 6. Use Template Flow

```text
open template -> Use Template
-> show replacement checklist
-> upload or select required references
-> choose replaceable options
-> preview prompt/template summary
-> generate
```

## 7. Acceptance Criteria

- Template can mark face/outfit/style refs as required or optional.
- User can replace required slots before generation.
- If a required slot is missing, generate button explains what is missing.
- Locked fields are not editable through Use Template UI.

## 8. Software Development Specification

### 8.1 Variable Registry

Create a variable registry that can be validated without DOM:

```text
SceneVariable
- id
- type
- sourceFieldName
- required
- defaultValue
- allowedOptionIds
- acceptsCustomText
- replacementPolicy
```

### 8.2 Resolver

Add a resolver:

```text
resolveTemplateVariables(snapshot, userInput) -> { selectionsPatch, referencesPatch, promptPatch, warnings }
```

### 8.3 UI Controls

Use control type by variable type:

- `reference_image`: upload/select reference card.
- `select_option`: dropdown or visual option picker.
- `custom_text`: textarea/input.
- `color`: color picker.
- `locked_text`: read-only summary.

## 9. Implementation Concerns

- Variable IDs must be stable and unique inside a template revision.
- Required missing variables must block generation with a clear message.
- User custom text must be sanitized and compiled through the same prompt rules.
- Locked identity variables should not be editable from Use Template unless creator allows it.
- Color variables should preserve both human label and raw hex when available.
