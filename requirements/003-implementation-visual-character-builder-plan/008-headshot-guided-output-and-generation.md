# Headshot - Guided Output and Generation

**Status:** Proposed  
**Sequence:** 008  
**Depends on:** 004-007

## Objective

แปลง character selections เป็น headshot ที่พร้อม generate โดยใช้ guided presets ซ่อนรายละเอียด camera, lens และ lighting ที่ไม่จำเป็นจากผู้ใช้ทั่วไป

## Guided Output Controls

MVP exposes only:

- background family
- output mood or use case
- aspect ratio
- provider/model
- provider-supported output resolution

Technical camera, lens, lighting and quality instructions come from reviewed Headshot recipes. Advanced Studio may expose them separately but cannot silently conflict with the guided recipe.

## Headshot Recipes

Initial recipe candidates:

- Clean Identity
- Commercial Beauty
- Soft Editorial
- Professional Profile

Each recipe defines defaults for framing, camera perspective, lighting, background behavior and quality direction. Recipe IDs are saved separately from character anatomy selections.

## Review Screen

Before generation, show:

- visual summary by section
- plain-language character description
- output recipe and background
- provider/model and estimated credit cost
- reference images that will be sent
- validation warnings and automatic compatibility adjustments

Raw compiled prompt is available as an advanced inspection view, not the primary editing method.

## Generation Contract

- Client sends semantic selections and selected recipe ID.
- Authoritative server compilation validates IDs and compatibility.
- Provider adapter receives the compiled prompt and provider-specific options.
- Generated history stores configuration snapshot, recipe version, provider and model.
- Provider/model fallback must not mutate the saved character definition.

## Manual Prompt Test Matrix

These cases are used before full image QA. The first pass checks whether the compiled prompt is correct, consistent and provider-ready. After the prompt passes review, run generation again and compare the image output against the same expected behavior.

### How to Record Each Test

For every case below, capture:

| Field | Notes |
| --- | --- |
| Test date |  |
| App build / branch |  |
| Provider / model |  |
| Recipe |  |
| Aspect / output size |  |
| Selected visual options |  |
| Compiled prompt | Paste exact prompt from advanced inspection |
| Provider payload notes | Include only relevant generated options, not secrets |
| First image result | Link/path/result ID and short observation |
| Prompt decision | Pass / needs prompt fix / needs option mapping fix |
| Second image result | Use after prompt fix or confirmation |

### Prompt Review Checklist

- Prompt uses the selected semantic IDs in a stable order: identity, age, face, facial features, hair, skin, expression, framing, background, recipe quality.
- Prompt does not contain contradictory terms, especially hair length vs cut/style, hair parting vs fringe, and expression vs mood.
- Gender presentation filters are respected. Female selections do not leak male-only hair options, and male selections do not leak female-only hair options.
- Non-binary options must not appear in prompt, UI output, saved state or migration output.
- Visual Heritage is descriptive and non-judgmental. It must not force skin tone, beauty ranking or stereotypes.
- Skin tone, texture, makeup and freckles are treated as independent appearance controls.
- Makeup must not change age, anatomy, ethnicity or facial structure.
- Expression changes should not silently change camera angle, head tilt, framing or background.
- Child-safe cases must remain neutral, non-sexualized and age-appropriate.
- Provider-specific unsupported parameters are not included in payload.
- Provider fallback changes output settings only, not the saved character selections.

### TC-001 - Neutral Adult Female Baseline

Goal: Verify the default realistic adult female headshot produces a complete, natural prompt without requiring user-written text.

Use the current UI option names exactly:

| Selection Area | Actual UI Option |
| --- | --- |
| Gender | Female |
| Age | Adult (40-49) |
| Ethnicity | Southeast Asian |
| Beauty | Raw natural look (minimal makeup), or leave empty if testing pure anatomy |
| Face Shape | Oval face |
| Eyes | Almond-shaped eyes |
| Nose | Natural nose |
| Lips | Natural lips |
| Smile | Neutral expression or Gentle smile, depending on desired baseline |
| Expression | Soft Friendly Smile or Subtle Micro-Expression |
| Hair Length | Long hair |
| Hair Cut / Style | Long loose wavy hair or side-swept hair |
| Hair Texture | Silky Smooth Hair |
| Hair Color | Jet Black |
| Hair Finish | Glossy healthy hair |
| Skin Tone | Any selected tone, or leave empty for no tone lock |
| Skin Texture | Natural Skin Texture or Healthy Complexion |
| Makeup | Natural Look (No Makeup) |
| Freckles | No Freckles |
| Camera / Quality | Use current headshot defaults |

Baseline prompt note:

- For the cleanest TC-001 prompt, leave `Beauty` empty when `Makeup = Natural Look (No Makeup)` is selected. Selecting both is allowed, but it intentionally repeats natural/no-makeup intent across Character and Skin.
- If `Smile = Neutral expression` and `Expression = Soft Friendly Smile` are both selected, the prompt should read as a neutral-friendly micro smile. If the image smiles too much, rerun with `Expression = Subtle Micro-Expression`.

Expected prompt checks:

- Reads as a front-facing professional headshot.
- Contains the selected face shape, eye, nose, lip, expression, hair and skin controls.
- `Oval face` must appear when Face Shape is selected.
- Natural/no-makeup wording should not dominate the prompt more than the selected anatomy and hair controls.
- Does not over-beautify beyond the selected options.
- Does not mention unselected makeup or fashion styling.

Result log:

| Item | User Notes |
| --- | --- |
| Compiled prompt |  |
| First output notes |  |
| Decision |  |
| Second output notes |  |

### TC-002 - Male Presentation and Hair Filter

Goal: Verify male selection only uses male hair options and produces a realistic adult male headshot.

| Selection Area | Actual UI Option |
| --- | --- |
| Gender | Male |
| Age | Adult (40-49), Thirties (30-39), or Young Adult (24-27) |
| Ethnicity | Thai or Southeast Asian |
| Beauty | Raw natural look (minimal makeup), or leave empty |
| Face Shape | Rectangular face or Square face |
| Eyes | Hooded eyes or Almond-shaped eyes |
| Eyebrows | Natural thick brows or Defined eyebrows |
| Nose | Straight nose or Natural nose |
| Lips | Thin lips or Natural lips |
| Expression | Subtle Confidence or Quiet Focus |
| Hair Length | Short hair |
| Hair Cut / Style | Crew cut hairstyle, side part hairstyle, undercut hairstyle, pompadour hairstyle, quiff hairstyle, textured crop hairstyle, Caesar cut hairstyle, or short curly crop hairstyle |
| Hair Texture | Coarse & Thick or Silky Smooth Hair |
| Hair Color | Jet Black or Dark Brown |
| Skin Texture | Natural Skin Texture or Healthy Complexion |
| Makeup | Natural Look (No Makeup), or leave empty |

Expected prompt checks:

- No female-only hairstyle wording appears.
- At least one male-only cut/style appears if Hair Cut / Style is selected.
- Hair description is concise and internally consistent.
- Prompt preserves headshot framing and professional mood.

Result log:

| Item | User Notes |
| --- | --- |
| Compiled prompt |  |
| First output notes |  |
| Decision |  |
| Second output notes |  |

### TC-003 - Female Fashion Hair and Color

Goal: Verify richer hair choices compile clearly without confusing hairstyle, texture, parting and color.

| Selection Area | Fixed UI Option |
| --- | --- |
| Gender | Female |
| Age | Early Twenties (20-23) |
| Ethnicity | Korean |
| Beauty | Delicate and elegant features |
| Face Shape | Diamond face |
| Eyes | Doe eyes |
| Eyebrows | Soft arched eyebrows |
| Nose | Small button nose |
| Lips | Cupid's bow lips |
| Smile | Soft smile |
| Expression | Soft Friendly Smile |
| Hair Length | Long hair |
| Hair Cut / Style | Layered hush cut hairstyle |
| Hair Texture | Soft Glossy Waves |
| Hair Parting / Fringe | Curtain bangs |
| Hair Color | Burgundy |
| Hair Finish | Glossy healthy hair |
| Skin Texture | Dewy Complexion |
| Makeup | Soft K-Beauty Makeup |

Expected prompt phrases:

| Selected Option | Expected Prompt Phrase |
| --- | --- |
| Female | `female` |
| Early Twenties (20-23) | `young adult in early twenties` |
| Korean | `korean person` |
| Diamond face | `diamond face` |
| Doe eyes | `doe eyes` |
| Soft arched eyebrows | `soft arched eyebrows` |
| Small button nose | `small button nose` |
| Cupid's bow lips | `cupid's bow lips` |
| Soft Friendly Smile | `subtle friendly expression` |
| Layered hush cut hairstyle | `layered hush cut hairstyle` |
| Burgundy | `burgundy hair` |
| Soft K-Beauty Makeup | `soft peach makeup style` |

Expected prompt checks:

- Hair color is explicit and does not conflict with base hair color.
- Parting/fringe does not contradict the selected cut/style.
- Makeup remains subtle unless a stronger makeup option is selected.

Result log:

| Item | User Notes |
| --- | --- |
| Compiled prompt |  |
| First output notes |  |
| Decision |  |
| Second output notes |  |

### TC-004 - Skin Texture, Freckles and Natural Detail

Goal: Verify skin appearance controls survive prompt compilation without becoming defects or medical language.

| Selection Area | Fixed UI Option |
| --- | --- |
| Gender | Female |
| Age | Thirties (30-39) |
| Ethnicity | Thai |
| Beauty | Leave empty |
| Face Shape | Round face |
| Eyes | Almond-shaped eyes |
| Nose | Natural nose |
| Lips | Natural lips |
| Expression | Mellow Serenity |
| Hair Length | Long hair |
| Hair Cut / Style | Side-swept Hair |
| Hair Color | Dark Brown |
| Skin Tone | Warm Olive skin |
| Skin Texture | Natural Skin Texture |
| Freckles | Subtle Light Freckles |
| Makeup | Natural Look (No Makeup) |

Expected prompt phrases:

| Selected Option | Expected Prompt Phrase |
| --- | --- |
| Thai | `thai person` |
| Round face | `round face` |
| Mellow Serenity | `serene and calm expression` |
| Side-swept Hair | `side-swept hair` |
| Dark Brown | `dark brown hair` |
| Warm Olive skin | `warm olive skin` |
| Natural Skin Texture + Natural Look (No Makeup) | `natural bare-face look with realistic skin texture and visible fine pores` |
| Subtle Light Freckles | `subtle light freckles` |

Expected prompt checks:

- Freckles are described as natural facial detail.
- Skin texture is realistic and not plastic/synthetic.
- Prompt avoids negative defect wording unless part of a negative prompt system.

Result log:

| Item | User Notes |
| --- | --- |
| Compiled prompt |  |
| First output notes |  |
| Decision |  |
| Second output notes |  |

### TC-005 - Expression Contrast

Goal: Verify expression changes are visible in prompt while all other anatomy remains stable.

Run the same character twice:

Base fixed options:

| Selection Area | Fixed UI Option |
| --- | --- |
| Gender | Female |
| Age | Young Adult (24-27) |
| Ethnicity | Japanese |
| Face Shape | Oval face |
| Eyes | Almond-shaped eyes |
| Nose | Natural nose |
| Lips | Natural lips |
| Hair Length | Long hair |
| Hair Cut / Style | Long Loose Waves |
| Hair Color | Jet Black |
| Skin Texture | Healthy Complexion |
| Makeup | Natural Look (No Makeup) |

Expression variants:

| Run | Fixed UI Option | Expected Prompt Phrase |
| --- | --- | --- |
| A | Subtle Micro-Expression | `subtle relaxed micro-expression` |
| B | Soft Friendly Smile | `subtle friendly expression` |

Expected prompt checks:

- Only expression-related wording changes between A and B.
- Camera, lens, background, hair and facial structure remain the same.
- Smile wording does not become exaggerated or cartoonish.

Result log:

| Item | Run A Notes | Run B Notes |
| --- | --- | --- |
| Compiled prompt |  |  |
| First output notes |  |  |
| Decision |  |  |
| Second output notes |  |  |

### TC-006 - Child-Safe Neutral Portrait

Goal: Verify child character output is age-safe, neutral and not mixed with adult beauty/fashion language.

| Selection Area | Fixed UI Option |
| --- | --- |
| Gender | Child |
| Age | Leave empty |
| Ethnicity | Thai |
| Beauty | Leave empty |
| Face Shape | Round face |
| Eyes | Round eyes |
| Nose | Natural nose |
| Lips | Natural lips |
| Smile | Closed-mouth smile |
| Expression | Cozy Contentment |
| Hair Length | Short hair |
| Hair Cut / Style | Textured crop hairstyle |
| Hair Color | Dark Brown |
| Skin Texture | Natural Skin Texture |
| Makeup | Leave empty; do not select adult makeup options |
| Freckles | Subtle Light Freckles |

Expected prompt phrases:

| Selected Option | Expected Prompt Phrase |
| --- | --- |
| Child | `child` |
| Thai | `thai person` |
| Round face | `round face` |
| Round eyes | `round eyes` |
| Closed-mouth smile + Cozy Contentment | `peaceful relaxed expression` |
| Short hair + Textured crop hairstyle | `short textured crop hairstyle` |
| Natural Skin Texture | `realistic skin texture` |
| Subtle Light Freckles | `subtle light freckles` |

Expected prompt checks:

- Uses child-safe, non-sexualized language.
- Does not include adult beauty, glamour, seductive, fashion model or commercial beauty terms.
- Makeup is omitted even if legacy state contains makeup-like values.

Result log:

| Item | User Notes |
| --- | --- |
| Compiled prompt |  |
| First output notes |  |
| Decision |  |
| Second output notes |  |

### TC-007 - Provider Capability and Resolution Fallback

Goal: Verify provider/model settings do not break prompt compilation and unsupported output settings receive safe fallback.

Run the same character and recipe across available providers:

| Provider / Model | Requested Output | Expected Behavior | User Notes |
| --- | --- | --- | --- |
| OpenAI / GPT-Image | Pixel width/height | Uses supported pixel dimensions |  |
| Grok | Resolution preset | Uses supported preset only |  |
| BytePlus Seedream 4.x | Resolution preset | Does not send unsupported `output_format` |  |
| BytePlus Seedream 5.x | Resolution preset | Sends output format only if model supports it |  |

Expected prompt checks:

- Compiled character prompt is equivalent across providers.
- Provider payload differs only in provider-specific options.
- History snapshot records actual provider/model/output settings.

Result log:

| Item | User Notes |
| --- | --- |
| Compiled prompt comparison |  |
| Payload notes |  |
| First output notes |  |
| Decision |  |

### TC-008 - Legacy or Missing Visual Asset Recovery

Goal: Verify saved configs with missing/deprecated IDs remain recoverable and do not block generation.

| Scenario | Expected Behavior | User Notes |
| --- | --- | --- |
| Existing saved dropdown value maps to visual option | Restores matching visual card |  |
| Deprecated value has migration mapping | Shows migrated option and warning if needed |  |
| Unknown value has no asset | Keeps semantic value visible, uses text fallback, allows generation if valid |  |
| Non-binary legacy value exists | Removes or maps according to migration rule, never appears as selectable option |  |

Expected prompt checks:

- Prompt uses valid current IDs after migration.
- Unknown recoverable values do not crash preview or generation.
- Missing asset does not remove the semantic selection.

Result log:

| Item | User Notes |
| --- | --- |
| Restored configuration |  |
| Compiled prompt |  |
| Decision |  |

## Acceptance Criteria

- A user can complete generation without typing prompt text.
- Technical defaults produce a complete prompt pattern.
- Unsupported provider resolution receives a valid model-specific fallback or clear correction.
- History can reconstruct the visible selections used for the result.

