# Enhancement: Preset Randomization of Pose & Expression

This plan details the implementation of preset-specific randomization for facial expressions and poses to keep generated results organic, candid, and natural. It adds a dedicated facial expression database, a camera framing shot database, and dynamically randomizes expression, framing, and pose choices upon preset selection.

## User Review Required

> [!IMPORTANT]
> - A new accordion group **"Framing"** has been added under **Camera** to control shot sizes (e.g. Medium Close-Up, Full Body Shot). It draws from [020-camera-framing.json](file:///d:/development/ModelPromptForge/attributes/020-camera-framing.json) containing **20 framing options**.
> - Selecting a preset will now dynamically randomize **Expression**, **Pose (Standing/Sitting/Walking)**, **Hand Position**, and **Framing** fields.
> - **Context-Aware Foreground Objects**: The randomized foreground object is restricted to fit the scene location:
>   - Dining/Café/Indoor presets (`restaurantSitting`, `barSitting`, `mallWaiting`): Randomize between Coffee Cup, Menu, or Glass of Water.
>   - Nature/Outdoor/Beach presets (`beachCasual`, `naturePhoto`, `resortSitting`): Randomize between Flowers or Glass of Water.

## Proposed Changes

---

### UI Schema & Mappings

#### [MODIFY] [ui-schema.json](file:///d:/development/ModelPromptForge/attributes/spec/ui-schema.json)
- Add `"Framing"` to the `"Camera"` group in `ui-schema.json`.

#### [MODIFY] [prompt-order.json](file:///d:/development/ModelPromptForge/attributes/spec/prompt-order.json)
- Add `"camera_framing"` to `prompt-order.json` (right after `"photo_context"`).

---

### Core Logic & Engine

#### [MODIFY] [app.js](file:///d:/development/ModelPromptForge/app.js)
- Register `020-camera-framing.json` in `ATTRIBUTE_FILES`.
- Map `"Framing"` -> `"camera_framing"` in `FIELD_TO_CATEGORY_MAP`.
- Modify `randomizePresetSelections` to support:
  - Randomizing `"Framing"` from the 20 camera framing options.
  - Selecting context-aware foreground objects depending on preset name (dining vs nature).

---

### Attribute Library Expansion

#### [NEW] [020-camera-framing.json](file:///d:/development/ModelPromptForge/attributes/020-camera-framing.json)
- Populate 20 detailed camera framing options (Close-Up, Medium, Cowboy, Full Body, POV, High/Low Angle, Seated, etc.).

---

## Verification Plan

### Manual Verification
1. Click **Rooftop Restaurant** preset multiple times. Verify that sitting poses, hand positions, dining foreground objects (e.g., menu, coffee), and camera framing (e.g., Close-Up, Seated) are randomly mixed.
2. Click **Sunny Beach Casual** preset multiple times. Verify that it randomizes standing/walking poses, natural foreground objects (flowers/water), and camera framing.
3. Confirm that the compiled prompt outputs the randomized values correctly.
