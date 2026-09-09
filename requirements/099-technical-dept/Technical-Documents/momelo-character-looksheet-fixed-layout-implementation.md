# Momelo Character Look Sheet — Fixed Layout Implementation Specification

Version: 1.0  
Status: Proposed implementation baseline  
Scope: Character Look Sheet generation, rendering, validation, storage, and downstream story/video reuse

> Delivery reconciliation, 2026-09-08: the current
> [form and export requirements](../../016-cinematic-studio/character-look-sheet-generation/form-and-export/000-master.md)
> own implementation sequencing. This document remains the full fixed-layout
> proposal, not evidence that it is implemented. The lower-cost single-image
> approach discussed later is a different strategy awaiting explicit selection.
> Branding is applied only on Download; original media and Seedance rules stay
> unchanged. Full per-slot generation, expressions/details, first-scene generation
> and downstream reference orchestration are gated/deferred as recorded in CLSFE.

---

## 1. Goal

สร้างระบบ Character Look Sheet ที่มี **layout เหมือนกันทุกครั้ง** ไม่ว่าตัวละครจะเป็นใคร เพศใด อายุเท่าใด หรือถูกนำไปใช้กับเนื้อเรื่องแบบใด

แนวทางหลักคือ:

> AI มีหน้าที่สร้าง "content assets" ของตัวละคร  
> Momelo มีหน้าที่จัดวาง asset เหล่านั้นลงบน "Fixed Look Sheet Layout"

ห้ามพึ่ง AI ให้สร้าง Look Sheet ทั้งแผ่นแล้วหวังให้ตำแหน่ง ช่อง ขนาด label และสัดส่วนออกมาเหมือนกันทุก generation

---

## 2. Core Principles

### 2.1 Fixed Layout, Variable Content

สิ่งที่ **คงที่**

- Canvas size / aspect ratio
- Grid structure
- Panel positions
- Panel size
- Labels
- Typography
- Padding / margin
- Section order
- Export naming
- Metadata placement

สิ่งที่ **เปลี่ยนได้**

- Character identity
- Face
- Hair
- Body appearance
- Wardrobe
- Accessories
- Expressions
- Props
- Character notes
- Color palette

---

## 3. Recommended Architecture

```text
Character Definition
        |
        v
Prompt Builder
        |
        v
Image Generation Provider
        |
        v
Generated Asset Set
        |
        v
Asset Validation
        |
        v
Fixed Look Sheet Renderer
        |
        +--------------------+
        |                    |
        v                    v
Rendered Look Sheet      Structured Assets
        |                    |
        +---------+----------+
                  |
                  v
          Character Package
                  |
        +---------+----------+
        |                    |
        v                    v
Storyboard / Keyframe    Video Generation
                             |
                             v
                          Seedance
```

---

## 4. Why Renderer-Based Layout

การ render layout ภายใน Momelo ให้ผลที่ deterministic กว่า image generation เพราะ image model แม้จะ instruction-following ได้ดี แต่ structured composition, precise placement, text rendering และ recurring-character consistency ยังมีโอกาสคลาดเคลื่อนได้

ดังนั้น Look Sheet ควรถูกแบ่งเป็นสองชั้น:

```text
Layer A — AI Generated Character Assets
Layer B — Deterministic Layout Renderer
```

Renderer สามารถ implement ด้วย:

- HTML/CSS + screenshot renderer
- SVG
- Canvas
- React component + server-side capture
- Headless Chromium / Playwright

แนะนำสำหรับ Momelo:

```text
React / HTML / CSS
        +
Fixed CSS Grid
        +
Playwright screenshot/export
```

เหตุผล:

- implement ง่าย
- preview ใน UI ได้ตรงกับ export
- responsive preview ได้
- version layout ได้ง่าย
- export PNG / JPEG / PDF ในอนาคตได้
- reuse component กับ Character Profile ได้

---

# 5. Fixed Layout Contract

## 5.1 Template ID

```text
character-looksheet-v1
```

ทุก Look Sheet ต้องเก็บ `templateVersion`

ตัวอย่าง:

```json
{
  "templateId": "character-looksheet",
  "templateVersion": "1.0"
}
```

ห้ามเปลี่ยน layout เดิมโดยแก้ component ตรง ๆ

ถ้าต้องเปลี่ยน structure:

```text
v1.0
v1.1
v2.0
```

เพื่อให้ character เก่าถูก render ซ้ำได้เหมือนเดิม

---

# 6. Master Layout

Recommended portrait canvas:

```text
Aspect ratio: 3:4
Working canvas: 1536 x 2048 px
Export: PNG / JPEG
```

สามารถ render ใหญ่กว่านี้ได้ แต่ logical grid ต้องเหมือนเดิม

---

## 6.1 Layout Structure

```text
┌─────────────────────────────────────────────┐
│ CHARACTER HEADER                            │
├────────┬────────┬────────┬────────┬─────────┤
│ FRONT  │  3/4   │ SIDE   │ BACK   │ PORTRAIT│
│        │ VIEW   │        │        │         │
├────────┴────────┴────────┴────────┴─────────┤
│ EXPRESSIONS                                 │
├────────┬────────┬────────┬────────┬─────────┤
│Neutral │ Happy  │ Sad    │ Angry  │Thinking │
├────────┴────────┴────────┴────────┴─────────┤
│ CHARACTER DETAILS                           │
├────────┬────────┬────────┬────────┬─────────┤
│ Face   │Hair F. │Hair B. │ Body   │ Detail  │
├────────┴────────┴────────┴────────┴─────────┤
│ WARDROBE & PROPS                            │
├────────┬────────┬────────┬────────┬─────────┤
│ Top    │ Bottom │ Shoes  │ Access.│ Prop    │
├────────┴────────┴────────┴────────┴─────────┤
│ COLOR PALETTE     │ CHARACTER NOTES         │
└─────────────────────────────────────────────┘
```

---

# 7. Required Asset Slots

## Identity

```text
identity.front
identity.threeQuarter
identity.side
identity.back
identity.portrait
```

## Expressions

```text
expressions.neutral
expressions.happy
expressions.sad
expressions.angry
expressions.thinking
```

## Details

```text
details.face
details.hairFront
details.hairBack
details.body
details.distinctive
```

## Wardrobe

```text
wardrobe.top
wardrobe.bottom
wardrobe.shoes
wardrobe.accessories
wardrobe.primaryProp
```

---

# 8. Character Data Schema

```json
{
  "id": "char_xxxxx",
  "name": "Character Name",
  "status": "draft",
  "template": {
    "id": "character-looksheet",
    "version": "1.0"
  },
  "identity": {
    "age": 24,
    "genderPresentation": "female",
    "appearanceDescription": "",
    "faceDescription": "",
    "skinDescription": "",
    "hairDescription": "",
    "bodyDescription": "",
    "distinctiveFeatures": []
  },
  "personality": {
    "summary": "",
    "traits": []
  },
  "wardrobe": {
    "defaultSetId": "wardrobe_default",
    "top": "",
    "bottom": "",
    "shoes": "",
    "accessories": [],
    "primaryProp": ""
  },
  "assets": {
    "identity": {},
    "expressions": {},
    "details": {},
    "wardrobe": {}
  },
  "colorPalette": [],
  "continuityRules": [],
  "createdAt": "",
  "updatedAt": ""
}
```

---

# 9. Asset Object

ทุก asset ต้องเป็น object ไม่ควรเก็บแค่ URL

```json
{
  "assetId": "asset_xxxxx",
  "slot": "identity.front",
  "type": "image",
  "url": "https://...",
  "width": 1024,
  "height": 1536,
  "mimeType": "image/png",
  "generation": {
    "provider": "openai",
    "model": "gpt-image",
    "promptVersion": "character-slot-v1",
    "requestId": "",
    "seed": null
  },
  "validation": {
    "status": "passed",
    "identityScore": null,
    "manualApproved": false
  }
}
```

---

# 10. Master Character Prompt

Prompt นี้คือ identity layer และควรถูก reuse ทุก asset

```text
Create a photorealistic visual of one original adult character.

CHARACTER IDENTITY

Name: {{character.name}}
Age: {{character.identity.age}}

Core appearance:
{{character.identity.appearanceDescription}}

Face:
{{character.identity.faceDescription}}

Skin:
{{character.identity.skinDescription}}

Hair:
{{character.identity.hairDescription}}

Body:
{{character.identity.bodyDescription}}

Distinctive features:
{{character.identity.distinctiveFeatures}}

IDENTITY LOCK

This is the same recurring fictional character across an entire character reference package.

Maintain the same:
- facial structure
- facial proportions
- apparent age
- skin tone
- eye appearance
- nose shape
- mouth shape
- hairstyle
- hair color
- body proportions
- distinctive physical features

Do not redesign the person between views.

Keep realistic human anatomy, natural skin texture,
realistic hair behavior, natural body proportions,
and a neutral photorealistic visual treatment.
```

---

# 11. Slot Prompt Pattern

Master prompt จะถูกต่อด้วย Slot Prompt

ตัวอย่าง Front:

```text
REFERENCE VIEW

Generate a full-body FRONT VIEW of the character.

Pose:
- standing naturally
- body facing directly toward camera
- head facing forward
- arms relaxed naturally
- feet visible
- neutral posture

Expression:
neutral

Camera:
eye-level
full-body framing
minimal perspective distortion

Background:
plain neutral studio background

This image is intended as an identity reference,
not a fashion editorial or dramatic story scene.
```

Three-quarter:

```text
REFERENCE VIEW

Generate a full-body THREE-QUARTER VIEW.

The character turns approximately 45 degrees from the camera.

Keep:
- same face
- same hair
- same body
- same wardrobe
- same apparent age

Neutral studio pose.
```

Side:

```text
REFERENCE VIEW

Generate a true full-body SIDE PROFILE.

Body and face approximately 90 degrees from camera.

Avoid three-quarter pose.
```

Back:

```text
REFERENCE VIEW

Generate a true full-body BACK VIEW.

The character faces directly away from camera.

Hair length, body proportions and wardrobe
must remain consistent with the other reference views.
```

Portrait:

```text
REFERENCE PORTRAIT

Generate a head-and-shoulders portrait of the same character.

Neutral expression.
Front-facing.
Natural skin texture.
Clear facial identity.
Minimal beauty retouching.
```

---

# 12. Expression Prompt

Expressions ต้องเปลี่ยนเฉพาะ performance

ห้ามเปลี่ยน identity

ตัวอย่าง:

```text
EXPRESSION REFERENCE

Use the same recurring character identity.

Expression:
{{expression}}

Only change facial performance.

Do not change:
- facial structure
- age
- hairstyle
- makeup
- wardrobe
- lighting direction
- camera position

Head-and-shoulders portrait.
Neutral studio background.
```

Allowed initial expression set:

```text
neutral
happy
sad
angry
thinking
```

ภายหลังสามารถเพิ่ม:

```text
surprised
worried
confident
tired
hopeful
fearful
```

โดยไม่ต้องเปลี่ยน layout v1 ถ้าใช้ secondary asset collection

---

# 13. Wardrobe Asset Generation

แนะนำให้ wardrobe asset เป็น product-style isolated visual

ตัวอย่าง:

```text
WARDROBE REFERENCE

Generate an isolated reference image of:

{{wardrobe.description}}

Show the item clearly.
No person.
Neutral background.
No decorative environment.
No unrelated objects.
Photorealistic material and construction.
```

ข้อดีคือ wardrobe object สามารถ reuse ใน:

- keyframe generation
- story wardrobe selection
- scene planning
- character continuity checking
- future virtual try-on workflow

---

# 14. Rendering Contract

Renderer ต้องไม่ infer layout จาก content

ใช้ slot mapping โดยตรง

ตัวอย่าง:

```ts
const LOOKSHEET_V1 = {
  identity: [
    "identity.front",
    "identity.threeQuarter",
    "identity.side",
    "identity.back",
    "identity.portrait"
  ],
  expressions: [
    "expressions.neutral",
    "expressions.happy",
    "expressions.sad",
    "expressions.angry",
    "expressions.thinking"
  ],
  details: [
    "details.face",
    "details.hairFront",
    "details.hairBack",
    "details.body",
    "details.distinctive"
  ],
  wardrobe: [
    "wardrobe.top",
    "wardrobe.bottom",
    "wardrobe.shoes",
    "wardrobe.accessories",
    "wardrobe.primaryProp"
  ]
};
```

---

# 15. CSS Grid Concept

```css
.looksheet {
  width: 1536px;
  height: 2048px;
  display: grid;
  grid-template-rows:
    160px
    620px
    380px
    330px
    350px
    208px;
}

.identity-grid,
.expression-grid,
.detail-grid,
.wardrobe-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}
```

Production implementation ควรใช้ design tokens แทน hard-code

```text
--looksheet-margin
--looksheet-gap
--panel-radius
--label-font-size
--section-title-size
--background
--border
```

---

# 16. Empty / Failed Slot Handling

ห้ามยุบ layout หาก generation บางภาพ fail

ตัวอย่าง:

```text
identity.front      PASS
identity.3quarter   PASS
identity.side       FAIL
identity.back       PASS
identity.portrait   PASS
```

Renderer ยังต้องแสดง side panel ในตำแหน่งเดิม

แสดง placeholder:

```text
Generation failed
Retry
```

ไม่ควร reorder panel เพื่อเติมพื้นที่

---

# 17. Generation Flow

```text
STEP 1
Create Character Definition

STEP 2
Generate Identity Anchor
portrait / front

STEP 3
User or system approves Identity Anchor

STEP 4
Generate remaining identity views

STEP 5
Generate expression set

STEP 6
Generate detail assets

STEP 7
Generate wardrobe assets

STEP 8
Validate

STEP 9
Render Fixed Look Sheet

STEP 10
User approves Character Package
```

---

# 18. Identity Anchor Strategy

ไม่ควร generate 20 assets พร้อมกันตั้งแต่ต้น

แนะนำ:

```text
Character Prompt
      |
      v
Portrait Anchor
      |
User/System Approve
      |
      v
Front Full Body
      |
Approve
      |
      v
Remaining Views
```

เหตุผลคือถ้า identity ตั้งต้นผิด จะทำให้ regeneration ทั้งชุดมีต้นทุนสูงโดยไม่จำเป็น

---

# 19. Character Package

เมื่อ approved แล้วให้สร้าง object ระดับ package

```json
{
  "characterPackageId": "cp_xxxxx",
  "characterId": "char_xxxxx",
  "version": "1.0",
  "status": "approved",
  "lookSheet": {
    "template": "character-looksheet-v1",
    "renderedImageUrl": "https://..."
  },
  "referenceAssets": [
    "identity.portrait",
    "identity.front",
    "identity.threeQuarter",
    "identity.side",
    "identity.back"
  ],
  "defaultWardrobe": "wardrobe_default",
  "continuityProfile": {},
  "createdAt": ""
}
```

---

# 20. Story Integration

Look Sheet ไม่ควรผูกกับเนื้อเรื่องใดเรื่องหนึ่ง

Story engine ต้องสร้าง scene state แยกออกมา

```json
{
  "sceneId": "scene_03",
  "characterPackageId": "cp_xxxxx",
  "story": {
    "location": "train station",
    "timeOfDay": "night",
    "emotion": "worried",
    "action": "waiting beside a platform",
    "wardrobeId": "wardrobe_default"
  },
  "camera": {
    "shot": "medium",
    "angle": "eye-level"
  }
}
```

จากนั้น Prompt Builder:

```text
Character Package
        +
Scene State
        +
Camera State
        +
Story Beat
        =
Keyframe Prompt
```

---

# 21. Story Keyframe Prompt

```text
Use the supplied character reference images as identity references.

The subject is the same recurring fictional character defined by the
character package.

Preserve core facial identity, age appearance, hairstyle,
body proportions and distinctive features.

SCENE

Location:
{{scene.location}}

Time:
{{scene.timeOfDay}}

Narrative moment:
{{scene.storyBeat}}

ACTION

{{scene.action}}

PERFORMANCE

Emotion:
{{scene.emotion}}

Expression:
{{scene.expression}}

Body language:
{{scene.bodyLanguage}}

WARDROBE

{{wardrobe.description}}

CAMERA

Shot:
{{camera.shot}}

Angle:
{{camera.angle}}

Composition:
{{camera.composition}}

LIGHTING

{{scene.lighting}}

VISUAL GOAL

Photorealistic cinematic story frame.
Natural anatomy.
Believable physical interaction.
Realistic fabric and hair.
Grounded environment.

CONTINUITY

The story environment may change,
but the core character identity must remain recognizable.
```

---

# 22. Video / Seedance Integration

Look Sheet ไม่ควรถูกส่งทั้งแผ่นเป็น video input โดย default

ควรเลือก asset ที่เกี่ยวข้องกับ shot

ตัวอย่าง:

```text
Shot = face close-up

Use:
identity.portrait
expression.thinking
keyframe
```

```text
Shot = full-body walking

Use:
identity.front
identity.threeQuarter
wardrobe
keyframe
```

```text
Shot = character turning around

Use:
identity.front
identity.side
identity.back
keyframe
```

Reference selection layer:

```text
Story Shot
    |
    v
Reference Selector
    |
    +-- identity reference
    +-- wardrobe reference
    +-- expression reference
    +-- keyframe
    |
    v
Seedance Request
```

---

# 23. Reference Selection Rules

Example:

```ts
if (shot.type === "closeup") {
  refs = [
    character.identity.portrait,
    keyframe
  ];
}

if (shot.motion === "turn-around") {
  refs = [
    character.identity.front,
    character.identity.threeQuarter,
    character.identity.back,
    keyframe
  ];
}

if (shot.requiresWardrobeAccuracy) {
  refs.push(character.wardrobe.default);
}
```

อย่าส่ง reference ทุกภาพโดยอัตโนมัติ

เพราะ:

- token/input cost อาจสูงขึ้น
- reference อาจขัดกัน
- prompt reasoning ซับซ้อนขึ้น
- debugging ยากขึ้น

---

# 24. API Design

## Create Character

```http
POST /api/characters
```

```json
{
  "name": "",
  "identity": {},
  "wardrobe": {}
}
```

---

## Generate Slot

```http
POST /api/characters/{characterId}/assets/generate
```

```json
{
  "slot": "identity.front",
  "promptVersion": "character-slot-v1"
}
```

---

## Regenerate Slot

```http
POST /api/characters/{characterId}/assets/{assetId}/regenerate
```

---

## Approve Slot

```http
POST /api/characters/{characterId}/assets/{assetId}/approve
```

---

## Render Look Sheet

```http
POST /api/characters/{characterId}/looksheet/render
```

Response:

```json
{
  "templateVersion": "1.0",
  "renderedUrl": "https://..."
}
```

---

## Approve Character

```http
POST /api/characters/{characterId}/approve
```

---

# 25. Storage Structure

Recommended logical path:

```text
characters/
  {characterId}/
    definition/
      character.json

    identity/
      portrait/
      front/
      three-quarter/
      side/
      back/

    expressions/
      neutral/
      happy/
      sad/
      angry/
      thinking/

    details/

    wardrobe/

    looksheet/
      v1/
        preview.jpg
        full.png

    packages/
      v1.json
```

---

# 26. Asset Versioning

อย่า overwrite ภาพเดิมเมื่อ regenerate

ตัวอย่าง:

```text
identity/front/v001.png
identity/front/v002.png
identity/front/v003.png
```

Database:

```json
{
  "slot": "identity.front",
  "activeVersion": 3,
  "versions": [
    {"version": 1},
    {"version": 2},
    {"version": 3}
  ]
}
```

ทำให้ user สามารถ:

- compare
- revert
- audit
- reuse previous generation

---

# 27. Validation

Validation แบ่งเป็น 3 ชั้น

## Layer 1 — Technical

ตรวจ:

- image exists
- valid MIME
- correct dimensions
- generation completed
- no corrupt file

## Layer 2 — Composition

ตรวจตาม slot

Front:

```text
full body visible
face toward camera
feet visible
single subject
```

Side:

```text
true side profile
not 3/4
```

Back:

```text
body facing away
```

## Layer 3 — Identity

ตรวจ:

- face similarity
- hair consistency
- skin tone consistency
- body consistency
- wardrobe consistency

Initial MVP สามารถใช้ manual approval ก่อน

ภายหลังเพิ่ม vision evaluator

---

# 28. Required User Controls

แต่ละ panel ควรมี:

```text
Preview
Approve
Regenerate
Compare
Set Active
```

Character-level controls:

```text
Approve Character
Render Look Sheet
Create Story
Create Wardrobe
Archive
```

---

# 29. UI Recommendation

Character Creation wizard:

```text
1. Identity
2. Appearance
3. Generate Character
4. Review Identity
5. Generate Look Sheet
6. Review Assets
7. Approve Character
```

หน้า Review:

```text
[Fixed Look Sheet Preview]

Front       ✓
3/4         ✓
Side        Retry
Back        ✓
Portrait    ✓

Expressions 4 / 5 ready
Wardrobe    5 / 5 ready

[Render Final]
```

---

# 30. Prompt Versioning

Prompt ต้องมี version

```text
character-core-v1
identity-front-v1
identity-side-v1
expression-v1
wardrobe-isolated-v1
story-keyframe-v1
```

เก็บ prompt version กับ asset ทุกครั้ง

เพื่อ debug ว่า:

```text
model changed?
prompt changed?
reference changed?
provider changed?
```

---

# 31. Observability

เก็บ metadata:

```json
{
  "provider": "",
  "model": "",
  "requestId": "",
  "latencyMs": 0,
  "attempt": 1,
  "inputTokenEstimate": null,
  "costEstimate": null,
  "status": "",
  "failureReason": ""
}
```

Dashboard ที่ควรมี:

```text
generation success rate
regeneration rate
average attempts per slot
cost per approved character
average generation time
identity rejection rate
```

---

# 32. MVP Scope

MVP ไม่จำเป็นต้อง automate ทุกอย่าง

ควรมี:

- Fixed layout v1
- Character definition
- Portrait anchor
- 5 identity views
- 5 expressions
- wardrobe set
- deterministic renderer
- manual approve/retry
- prompt versioning
- asset history
- export final PNG
- character package JSON

ไม่จำเป็นใน MVP:

- automatic face similarity scoring
- automatic QA agents
- multiple look sheet designs
- automatic outfit segmentation
- complex body measurements
- automatic video generation

---

# 33. Phase 2

เพิ่ม:

- AI identity consistency evaluator
- outfit packs
- expression packs
- hairstyle packs
- multiple character packages
- scene-aware reference selector
- storyboard integration
- automatic keyframe generation
- Seedance reference orchestration
- character consistency scoring per video shot

---

# 34. Acceptance Criteria

ระบบถือว่า implementation ผ่านเมื่อ:

### Layout

- ทุก character ใช้ panel position เดียวกัน
- panel size ไม่เปลี่ยนตาม asset
- label ไม่ถูก AI generate
- missing slot ไม่ทำให้ grid collapse

### Character

- user สามารถ approve/regenerate asset รายช่อง
- asset เก่าถูกเก็บเป็น version
- character มี approved identity anchor

### Rendering

- renderer สามารถ regenerate Look Sheet จาก structured data ได้
- output เดิม + data เดิม + template version เดิม ต้องได้ layout เดิม

### Story

- Look Sheet ไม่มี story-specific environment
- character package สามารถ reuse ในหลาย story
- story prompt ถูกสร้างจาก character + scene state แยกกัน

### Video

- downstream service สามารถเลือก reference asset โดย slot
- ไม่ต้องส่ง full Look Sheet เข้า video model ทุกครั้ง

---

# 35. Recommended Final Architecture

```text
                   MOMELO CHARACTER SYSTEM

                     Character Definition
                            |
                            v
                     Identity Generator
                            |
                    +-------+-------+
                    |               |
                    v               v
             Portrait Anchor    Full Body Anchor
                    |               |
                    +-------+-------+
                            |
                            v
                   Reference Asset Set
                            |
          +-----------------+-----------------+
          |                 |                 |
          v                 v                 v
      Expressions        Details          Wardrobe
          |                 |                 |
          +-----------------+-----------------+
                            |
                            v
                    Validation / Review
                            |
                            v
                 Fixed Look Sheet Renderer
                            |
                  Character Package v1
                            |
        +-------------------+--------------------+
        |                   |                    |
        v                   v                    v
     Gallery           Story Planner         Wardrobe UI
                            |
                            v
                       Story Scene
                            |
                            v
                    Keyframe Generator
                            |
                            v
                   Reference Selector
                            |
                            v
                         Seedance
                            |
                            v
                      Video Output
```

---

# 36. Key Implementation Decision

สิ่งสำคัญที่สุดของ architecture นี้คือ:

```text
CHARACTER ≠ LOOK SHEET IMAGE
```

Character คือ structured data + approved asset collection

ส่วน Look Sheet เป็นเพียงหนึ่งใน renderer/output ของ Character Package

ดังนั้นในอนาคตสามารถ render character เดิมเป็น:

```text
Look Sheet
Character Profile
Casting Card
Storyboard Reference
Video Reference Package
Wardrobe Sheet
Expression Sheet
```

โดยไม่ต้อง regenerate character ใหม่ทั้งหมด

---

# 37. References

Official references used for this implementation direction:

1. OpenAI — Image Generation Guide  
   https://developers.openai.com/api/docs/guides/image-generation

   Relevant points:
   - image generation supports image references / image edits
   - multiple image inputs can be used as references
   - image models may still have limitations around recurring-character consistency
   - precise layout-sensitive composition and exact text placement should not be assumed deterministic

2. OpenAI — Prompt Engineering Guide  
   https://developers.openai.com/api/docs/guides/prompt-engineering

   Relevant point:
   - reusable prompt content is best kept stable and separated from variable request content

3. BytePlus ModelArk — Dreamina Seedance 2.0 Series Tutorial  
   https://docs.byteplus.com/en/docs/ModelArk/2291680

4. BytePlus ModelArk — Dreamina Seedance 2.0 Series Prompt Guide  
   https://docs.byteplus.com/en/docs/ModelArk/2222480

5. BytePlus ModelArk — Dreamina Seedance 2.5 Tutorial / Prompt Guide  
   https://docs.byteplus.com/en/docs/ModelArk/2607688  
   https://docs.byteplus.com/en/docs/ModelArk/2607689

6. BytePlus ModelArk — Seedance 1.0 Pro  
   https://docs.byteplus.com/en/docs/ModelArk/1587798

---

# 38. Implementation Recommendation for Momelo

สำหรับ Momelo แนะนำให้เริ่มจากลำดับนี้:

```text
1. Finalize character-looksheet-v1 JSON schema
2. Build React Fixed Look Sheet component
3. Implement slot generation service
4. Implement approve / regenerate / version flow
5. Implement renderer/export
6. Create Character Package
7. Connect Character Package to Story Planner
8. Implement reference selector
9. Connect selected assets + keyframe to Seedance
10. Add automated identity QA หลัง MVP
```

ด้วยโครงนี้ Look Sheet จะเป็น reusable infrastructure สำหรับ Character System ทั้งหมด ไม่ใช่ feature ที่ผูกกับหนังสั้นหรือเนื้อเรื่องหนึ่งเรื่อง
