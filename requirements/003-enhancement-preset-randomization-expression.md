# Enhancement: Preset Randomization of Pose & Expression

This plan details the implementation of preset-specific randomization for facial expressions and poses to keep generated results organic, candid, and natural. It adds a dedicated facial expression database and dynamically randomizes expression and pose choices upon preset selection, maintaining context compatibility (e.g. sitting vs standing).

## User Review Required

> [!IMPORTANT]
> - A new attribute category **"Expression"** will be added to the Face group, pulling from a new library [019-expression.json](file:///d:/development/ModelPromptForge/attributes/019-expression.json) containing **12 detailed, natural expression options**.
> - Selecting a preset will now dynamically randomize **Expression**, **Pose (Standing/Sitting/Walking)**, and **Hand Position** fields.
> - Randomization is context-aware and combines multiple attributes to create hundreds of potential combinations:
>   - Sitting Presets (`restaurantSitting`, `barSitting`, `resortSitting`, `mallWaiting`): Randomize selections in the `"Sitting"` category AND `"Hand Position"`.
>   - Standing/Walking Presets (`beachCasual`, `naturePhoto`): Randomize selections in the `"Standing"` or `"Walking"` categories AND `"Hand Position"`.
>   - All Presets: Pick a random selection in the new `"Expression"` category.

## Proposed Changes

---

### UI Schema & Mappings

#### [MODIFY] [ui-schema.json](file:///d:/development/ModelPromptForge/attributes/spec/ui-schema.json)
- Ensure the `"Expression"` field under the `"Face"` accordion is mapped correctly.

#### [MODIFY] [prompt-order.json](file:///d:/development/ModelPromptForge/attributes/spec/prompt-order.json)
- Add `"expression"` to `prompt-order.json` (right after `"lips"`).

---

### Core Logic & Engine

#### [MODIFY] [app.js](file:///d:/development/ModelPromptForge/app.js)
- Register `019-expression.json` in `ATTRIBUTE_FILES`.
- Map `"Expression"` -> `"expression"` in `FIELD_TO_CATEGORY_MAP`.
- Modify the preset click listener to dynamically select a random, context-appropriate pose (combining posture and hand position) and expression before importing the preset configuration:
  - **Expressions (12 options)**: Randomly select one.
  - **Hand Positions (6 options)**: Randomly select one.
  - **Pose (Sitting)**: If preset has sitting context, select a random sitting pose option.
  - **Pose (Standing/Walking)**: If preset has standing/walking context, randomly choose between a standing or walking pose.

---

### Attribute Library Expansion

#### [NEW] [019-expression.json](file:///d:/development/ModelPromptForge/attributes/019-expression.json)
Define 12 photorealistic, natural expressions:
1. **Subtle Micro-Expression**: Relaxed, completely candid mood.
2. **Slightly Thoughtful**: Soft, reflective, and quiet look.
3. **Candid Gentle Laugh**: Laughing mid-conversation, genuine happy crinkle around the eyes.
4. **Soft Friendly Smile**: Subtle warm smile, relaxed lips.
5. **Slightly Imperfect Smile**: Natural asymmetric smile, unforced.
6. **Curious Look**: Head tilted slightly, soft intelligent gaze.
7. **Warm Daydreaming**: Eyes looking slightly away, gentle relaxed facial muscles.
8. **Mild Smirk**: Playful, subtle hint of amusement at the corner of the lips.
9. **Cozy Contentment**: Peaceful, relaxed eyes, slight soft smile.
10. **Reflective Mood**: Soft focus gaze, serious but gentle neutral expression.
11. **Spontaneous Sparkle**: Eyes showing a gentle sparkle of surprise or delight.
12. **Candid Dialogue Look**: Mouth slightly parted as if beginning to speak.

---

## Verification Plan

### Manual Verification
1. Click **Rooftop Restaurant** preset multiple times. Verify that different combinations of sitting poses (e.g. rest chin, cross legs), hand positions, and expressions load.
2. Click **Sunny Beach Casual** preset multiple times. Verify that it randomizes between different standing/walking poses, hand positions, and expressions.
3. Confirm that the compiled prompt outputs the randomized values correctly.
