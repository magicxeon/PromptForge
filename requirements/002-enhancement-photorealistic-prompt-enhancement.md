# Enhancement: Photorealistic Prompt Generator Refinements

This plan details the implementation of enhancements based on the [Photorealistic Prompt Generator Guide](file:///d:/development/ModelPromptForge/requirements/Photorealistic_Prompt_Generator_Guide.md) to improve prompt realism. It focuses on restructuring the prompt architecture around actual photography techniques, adding foreground/background layers, introducing photographic context, adding a scene story narrative builder, building an AI buzzword detection warning system, and sanitizing dataset attributes.

## User Review Required

> [!IMPORTANT]
> - A new accordion group **"Photographic Context"** will be added to the UI to capture why/how the photo was taken (e.g. "candid snapshot").
> - A new accordion group **"Scene Story"** will be added to provide a descriptive narrative action (e.g. "A candid moment while chatting over coffee with friends").
> - New fields: **Foreground Layer** and **Background Activity** under the **Environment** accordion; and **Camera Imperfections** under the **Camera** accordion.
> - A real-time **AI Buzzword Warning System** will be added below the prompt preview to warn users if they select or type forbidden unreal words (e.g. "flawless", "masterpiece").

## Proposed Changes

---

### UI Schema & Order Mappings

#### [MODIFY] [ui-schema.json](file:///d:/development/ModelPromptForge/attributes/spec/ui-schema.json)
- Add new accordion `"Scene Story"` containing a select field `"Story Event"`.
- Add a new `"Photographic Context"` accordion group containing the `"Context Type"` select field.
- Add `"Foreground Layer"` and `"Background Activity"` select fields to the `"Environment"` accordion group.
- Add `"Camera Imperfections"` select field to the `"Camera"` accordion group.

#### [MODIFY] [prompt-order.json](file:///d:/development/ModelPromptForge/attributes/spec/prompt-order.json)
- Add the new categories to the execution order mapping:
  - `scene_story` (at the beginning, after `subject`)
  - `photo_context` (after `scene_story` or after `pose_body`)
  - `foreground_layer` (before `environment`)
  - `background_activity` (after `environment`)
  - `camera_imperfections` (after `camera` settings)

---

### Core Logic & Engine

#### [MODIFY] [app.js](file:///d:/development/ModelPromptForge/app.js)
- Register `017-photographic-context.json` and `018-scene-story.json` in `ATTRIBUTE_FILES`.
- Add field-to-category mappings in `FIELD_TO_CATEGORY_MAP`:
  - `"Story Event"` -> `"scene_story"`
  - `"Context Type"` -> `"photo_context"`
  - `"Foreground Layer"` -> `"foreground_layer"`
  - `"Background Activity"` -> `"background_activity"`
  - `"Camera Imperfections"` -> `"camera_imperfections"`
- Update the **Face Match** identity preservation override template string.
- Implement an **AI Buzzword Warning Engine** that checks active selection values and custom inputs for banned keywords, displaying a visual warning panel when detected.

#### [MODIFY] [index.html](file:///d:/development/ModelPromptForge/index.html)
- Add a container below the prompt preview for display of **AI Buzzword Warnings**.

#### [MODIFY] [style.css](file:///d:/development/ModelPromptForge/style.css)
- Add styling for the AI Buzzword warning banner (e.g., orange border, background glassmorphism, warnings typography, neon alert icon).

---

### Attribute Library Expansion & Cleansing

#### [NEW] [017-photographic-context.json](file:///d:/development/ModelPromptForge/attributes/017-photographic-context.json)
- Define options for Photographic Context (e.g., candid snapshot, documentary street photography, casual handheld moment).

#### [NEW] [018-scene-story.json](file:///d:/development/ModelPromptForge/attributes/018-scene-story.json)
- Define story event options (e.g., "chatting over coffee", "walking during evening rain", "relaxing on a park bench reading").

#### [MODIFY] [012-environment.json](file:///d:/development/ModelPromptForge/attributes/012-environment.json)
- Add options for Foreground Layer and Background Activity.

#### [MODIFY] [014-camera.json](file:///d:/development/ModelPromptForge/attributes/014-camera.json)
- Add options for Camera Imperfections.

#### [MODIFY] [007-skin.json](file:///d:/development/ModelPromptForge/attributes/007-skin.json)
- Replace `"flawless complexion details"` in option `skin.tone_05` (or similar) with `"highly detailed and natural skin texture with visible pores"`.

---

## Verification Plan

### Manual Verification
1. Verify the new accordion sections and select fields render correctly in the UI.
2. Confirm the prompt compilation order is correct and respects `prompt-order.json`.
3. Type custom write-in values like "masterpiece" or "flawless", and verify that the warning banner displays the warning.
4. Verify all presets load properly without errors.
