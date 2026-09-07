# Momelo Character Generation — Identity Portrait & Character Look Sheet

เอกสารนี้ใช้สำหรับสร้างตัวละคร AI แบบ photorealistic โดยแยกเป็น 2 ขั้นตอน:

1. **Front Identity Portrait** — สร้าง “หน้าหลัก” ของตัวละครก่อน
2. **Character Look Sheet** — ใช้ภาพหน้าหลักที่เลือกแล้วเป็น identity reference เพื่อสร้างหลายมุมและ full-body โดยคงคนเดิม

แนวคิดสำคัญคือให้แยก **Identity DNA** ออกจาก **Shot / Styling** เพื่อให้แก้ผม เสื้อผ้า มุมกล้อง หรือฉากภายหลังได้ โดยไม่ทำให้ใบหน้าค่อย ๆ เปลี่ยน

---

## 1. Character DNA — Fields ที่ควรเปิดให้แก้

ค่าที่อยู่ใน `{{...}}` คือส่วนที่ควรทำเป็น configurable field ในระบบ Momelo

| Field | ใช้ควบคุม | Example |
|---|---|---|
| `{{AGE}}` | อายุ | `22-year-old adult woman` |
| `{{APPEARANCE_DIRECTION}}` | ภาพรวม appearance | `young adult Korean woman, contemporary natural beauty` |
| `{{FACE_SHAPE}}` | รูปหน้า | `slim oval face with a subtle heart-shaped influence` |
| `{{FACE_WIDTH}}` | ความกว้างหน้า | `slightly narrow` |
| `{{CHEEKBONES}}` | โหนกแก้ม | `moderately high, softly projected` |
| `{{JAW_SHAPE}}` | กราม | `softly tapered jawline` |
| `{{CHIN_SHAPE}}` | คาง | `small rounded-tapered chin` |
| `{{SKIN_TONE}}` | สีผิวหลัก | `light beige to light-medium beige` |
| `{{SKIN_UNDERTONE}}` | undertone | `neutral-warm golden with subtle peach influence` |
| `{{SKIN_TEXTURE}}` | texture ผิว | `fine pores, subtle tonal variation, fine vellus hair` |
| `{{EYE_SHAPE}}` | ทรงตา | `medium almond-shaped, softly elongated` |
| `{{EYE_COLOR}}` | สีตา | `very dark brown` |
| `{{EYEBROW_SHAPE}}` | ทรงคิ้ว | `natural straight brows with a very soft outer arch` |
| `{{NOSE_BRIDGE}}` | สันจมูก | `slender straight bridge` |
| `{{NOSE_TIP}}` | ปลายจมูก | `softly defined rounded tip` |
| `{{NOSE_WIDTH}}` | ความกว้างจมูก | `narrow-to-medium` |
| `{{LIP_SHAPE}}` | ทรงปาก | `medium-full lips with a soft cupid's bow` |
| `{{LIP_COLOR}}` | สีริมฝีปาก | `natural muted rose` |
| `{{HAIR_COLOR}}` | สีผม | `near-black dark brown` |
| `{{HAIR_STYLE}}` | ทรงผม | `center-parted relaxed low bun` |
| `{{HAIR_TEXTURE}}` | texture ผม | `straight fine-to-medium hair` |
| `{{BODY_TYPE}}` | รูปร่าง | `slender lean physique` |
| `{{HEIGHT_IMPRESSION}}` | impression ความสูง | `medium-tall appearance with long balanced proportions` |
| `{{SHOULDER_WIDTH}}` | ไหล่ | `narrow-to-medium shoulders` |
| `{{BUST_SIZE}}` | ขนาดหน้าอก | `small-to-medium natural bust proportional to frame` |
| `{{WAIST_HIP}}` | สัดส่วนเอว/สะโพก | `slim waist, subtle natural hip curve` |
| `{{EXPRESSION}}` | expression กลาง | `calm neutral expression` |

> แนะนำให้คำเกี่ยวกับสัดส่วนเป็นเชิง **proportional / visual description** แทนตัวเลข bra size เพราะโมเดลมักตีความได้เสถียรกว่า เช่น `small-to-medium natural bust proportional to a slender frame`

---

# 2. Prompt A — Front Identity Portrait

## Purpose

ใช้สร้างภาพ canonical identity ของตัวละครก่อนสร้างมุมอื่น

ภาพนี้ควรเน้น:
- front-facing จริง
- geometry ใบหน้าชัด
- skin tone / undertone / texture ชัด
- expression กลาง
- ไม่มี pose หรือ styling ที่รบกวน identity
- ใช้แสงกลาง ๆ เพื่อให้เป็น reference ที่นำไปใช้ต่อได้ง่าย

## Prompt Template

```text
Create a highly photorealistic studio identity portrait of an original adult female character, front-facing only.

IDENTITY

Age and appearance:
{{AGE}}.
{{APPEARANCE_DIRECTION}}.

Face structure:
{{FACE_SHAPE}},
{{FACE_WIDTH}} facial width,
{{CHEEKBONES}} cheekbones,
{{JAW_SHAPE}},
{{CHIN_SHAPE}},
balanced natural facial proportions,
subtle believable human facial asymmetry.

Skin:
{{SKIN_TONE}} skin
with {{SKIN_UNDERTONE}} undertone.

The skin must look like real photographed human skin:
{{SKIN_TEXTURE}},
visible fine pores around the nose and inner cheeks,
subtle natural tonal variation,
slightly different coloration around the cheeks, nose and under-eye area,
fine facial vellus hair visible under close studio lighting,
natural skin thickness and translucency,
subtle natural oil and moisture,
no artificial smoothing.

Eyebrows:
{{EYEBROW_SHAPE}},
natural density,
visible individual eyebrow hairs.

Eyes:
{{EYE_SHAPE}},
{{EYE_COLOR}} irises,
realistic iris detail,
natural catchlights,
realistic moist eyes,
natural sclera tone,
individual eyelashes.

Nose:
{{NOSE_BRIDGE}},
{{NOSE_WIDTH}} overall width,
{{NOSE_TIP}},
natural nostril shape,
realistic transition between nasal bridge, tip and alar structure.

Lips:
{{LIP_SHAPE}},
{{LIP_COLOR}} natural lip color,
realistic vertical lip texture,
lower lip subtly fuller than upper lip,
soft natural lip-to-skin transition.

Hair:
{{HAIR_COLOR}} hair,
{{HAIR_STYLE}},
{{HAIR_TEXTURE}},
realistic hair density,
natural hairline,
fine baby hairs,
a few believable loose flyaway strands.

Expression:
{{EXPRESSION}},
relaxed closed lips,
eyes looking directly into the camera,
no smile,
no exaggerated emotion.


FRONTAL IDENTITY GEOMETRY

The face is oriented exactly toward the camera.
Camera centered on the facial midline.
Both eyes at approximately equal distance from the lens.
Both ears approximately equally visible.
Nose aligned with facial center.
No head tilt.
No face rotation.
No three-quarter angle.
No profile angle.
Shoulders facing forward.

Show the full head, neck, clavicles and upper shoulders.
Do not crop the hairline or chin.


STYLING

Minimal natural makeup only.
No heavy eyeliner.
No dramatic contour.
No glossy beauty-editorial styling.
Simple neutral thin-strap top.
No distracting jewelry.
Neutral seamless light-gray studio background.


CAMERA

Professional full-frame photographic look.
85mm portrait-lens equivalent.
Camera exactly at eye level.
Natural perspective and facial proportions.
Sharp focus on both eyes and facial skin.
High micro-detail without artificial oversharpening.


LIGHTING

Large diffused frontal studio source,
slightly above eye level,
soft neutral fill,
very subtle dimensional shadowing.

Neutral white balance.
Accurate skin-color reproduction.
No dramatic rim lighting.
No strong colored light.
No beauty-filter lighting.


PHOTOREALISM

The result must look like a real unretouched studio photograph of a real adult human.

Preserve:
natural facial asymmetry,
fine pores,
fine facial hairs,
subtle skin discoloration,
tiny natural imperfections,
realistic lip lines,
individual eyelashes,
individual eyebrow hairs,
individual hair strands,
natural moisture in the eyes,
realistic skin response to light.


AVOID

beauty filter,
AI beauty face,
perfectly symmetrical face,
plastic skin,
waxy skin,
porcelain skin,
airbrushed skin,
excessive skin smoothing,
excessive facial sharpening,
CGI,
3D render,
anime,
doll-like face,
oversized eyes,
extremely tiny nose,
exaggerated lips,
extreme V-shaped jaw,
dramatic makeup,
fashion pose,
head tilt,
three-quarter view,
profile view.
```

---

## Example A — ตัวอย่างค่าตาม direction ภาพที่เลือก

```text
Create a highly photorealistic studio identity portrait of an original adult female character, front-facing only.

Subject: a 22-year-old adult Korean woman with a youthful contemporary natural-beauty appearance.

She has a slim oval face with a subtle soft heart-shaped influence, slightly narrow facial width, softly tapered lower face, moderately high but gently projected cheekbones, a refined soft jawline, and a small rounded-tapered chin. Facial proportions are balanced and believable, with subtle natural human asymmetry rather than mathematical symmetry.

Her complexion is light beige to light-medium beige with a neutral-warm undertone, subtle golden warmth and a faint peach influence. Skin must look genuinely photographed rather than cosmetically perfected: visible fine pores around the nose and inner cheeks, fine skin texture across the forehead and cheeks, subtle under-eye tonal variation, faint natural redness around the nose, delicate tonal variation across the face, tiny natural imperfections and fine facial vellus hairs visible under studio light. Preserve realistic skin thickness, translucency, moisture and subtle natural sheen.

Her eyebrows are dark brown to near-black, medium-fine in thickness, mostly straight with a very gentle outer arch, naturally spaced with clearly visible individual hairs.

Her eyes are medium-sized almond-shaped eyes with a softly elongated horizontal shape and a very subtle upward outer-corner tilt. The eyelid crease is delicate and natural. Irises are very dark brown with realistic iris detail, natural catchlights, realistic eye moisture and natural off-white sclera.

Her nose has a slender straight bridge with narrow-to-medium width, moderate natural projection, a softly defined rounded tip and small proportional nostrils. Avoid an extremely sharp, tiny or surgically sculpted nose.

Her lips are medium-full with a softly defined cupid's bow, a slightly fuller lower lip, naturally rounded corners and muted natural rose-pink coloration. Preserve fine vertical lip texture and slight natural asymmetry.

Hair is near-black dark brown, straight and fine-to-medium in texture, center-parted and loosely pulled into a relaxed low bun. Include a natural irregular hairline, fine baby hairs around the forehead and temples, and several delicate loose strands framing the face.

Expression is calm, relaxed and neutral. Closed relaxed lips. Direct eye contact with the lens.

The face is oriented exactly toward the camera. Camera centered precisely on the facial midline. Both ears approximately equally visible. No head tilt, no rotation, no three-quarter view. Shoulders face directly forward.

Frame from the top of the head through the clavicles and upper shoulders. Do not crop the hairline or chin.

Minimal natural makeup only. Neutral beige thin-strap top. No prominent accessories. Neutral seamless light-gray studio background.

Professional full-frame photographic look, 85mm portrait-lens equivalent, camera exactly at eye level, natural facial perspective, sharp focus on both eyes and skin texture.

Use a large diffused frontal studio source slightly above eye level with soft neutral fill. Accurate neutral white balance and realistic skin-color reproduction.

Extremely photorealistic unretouched human skin and anatomy. Preserve pores, tiny imperfections, fine hairs, subtle skin-color variation, individual eyelashes, eyebrow hairs, realistic lip texture and individual hair strands.

Avoid beauty-filter appearance, plastic or porcelain skin, excessive smoothing, CGI, 3D-render appearance, doll-like perfection, oversized eyes, exaggerated lips, extreme V-shaped jaw, heavy makeup, head tilt, three-quarter view and profile view.
```

---

# 3. Prompt B — Character Look Sheet

## Recommended Workflow

สำหรับ look sheet ที่ต้องการ **“คนเดิมจริง ๆ”** ไม่ควร generate จาก text description ใหม่อย่างเดียว

Workflow ที่แนะนำ:

```text
Character DNA
      ↓
Generate Front Identity Portrait
      ↓
User selects / approves canonical face
      ↓
Approved Front Portrait = PRIMARY IDENTITY REFERENCE
      ↓
Generate Character Look Sheet
```

ภาพ Front Portrait ที่ approve แล้วควรเป็น **Identity Authority**

Look sheet ต้องเปลี่ยนเพียง:
- camera angle
- crop
- body framing

สิ่งที่ควรคง:
- facial geometry
- eye spacing / eye shape
- nose geometry
- mouth geometry
- jaw / chin
- skin tone
- skin undertone
- hairline
- age appearance
- body proportions

---

## Recommended Look Sheet Layout

ใช้ 5 panel:

```text
┌──────────────────┬──────────────────┬──────────────────┐
│ FRONT CLOSE-UP   │ LEFT PROFILE     │ 3/4 VIEW         │
│ Identity anchor  │ Nose / jaw       │ Depth / geometry │
├──────────────────┼──────────────────┴──────────────────┤
│ FULL BODY FRONT  │ MID / HALF BODY FRONT              │
│ Body proportion │ Face + body relationship            │
└──────────────────┴─────────────────────────────────────┘
```

หรือ production version ที่ละเอียดขึ้น:

```text
1. Front close-up
2. Left profile
3. Right profile
4. Left 3/4
5. Right 3/4
6. Full-body front
7. Full-body side
8. Full-body back
```

สำหรับ MVP ของ Momelo แนะนำ **5 panels** ก่อน เพราะควบคุม identity ง่ายกว่า sheet ที่มี panel จำนวนมาก

---

## Prompt Template — Look Sheet with Image Reference

```text
Use the provided approved FRONT IDENTITY PORTRAIT as the PRIMARY AND AUTHORITATIVE CHARACTER IDENTITY REFERENCE.

Create a professional photorealistic CHARACTER LOOK SHEET of exactly the same original adult female character.

CRITICAL IDENTITY RULE

This is NOT a redesign and NOT a similar-looking woman.

Every panel must depict the same individual represented in the identity reference.

Preserve the reference character's exact overall identity and recognizable facial structure:
face shape,
facial width,
forehead proportions,
hairline,
eyebrow placement,
eye shape,
eye spacing,
eyelid structure,
nose bridge,
nose width,
nose tip,
nostril structure,
cheekbone placement,
lip shape,
lip volume,
jawline,
chin shape,
skin tone,
skin undertone,
age appearance,
and overall facial proportions.

Do not beautify, reinterpret, idealize, westernize, stylize, or independently redesign the face between panels.

Minor natural changes caused by perspective are expected.
Identity changes are not.


CHARACTER BODY

Body type:
{{BODY_TYPE}}.

Height impression:
{{HEIGHT_IMPRESSION}}.

Shoulders:
{{SHOULDER_WIDTH}}.

Bust:
{{BUST_SIZE}}, anatomically natural and proportional to the body.

Waist and hips:
{{WAIST_HIP}}.

Maintain realistic adult anatomy and believable proportions.
No exaggerated fashion-model anatomy unless explicitly specified.


HAIR

Preserve the same:
{{HAIR_COLOR}},
{{HAIR_STYLE}},
{{HAIR_TEXTURE}},
hairline,
parting position,
overall hair volume.

Small physically natural strand movement between views is acceptable.
Do not change haircut or hairstyle between panels.


WARDROBE

Simple neutral fitted beige camisole.
Simple light denim shorts for full-body views.
Bare feet in full-body panel.
No fashion styling.
No distracting jewelry or accessories.

The clothing exists only to clearly show body proportions.


LOOK SHEET LAYOUT

Create ONE clean studio character reference sheet containing exactly five clearly separated photographic panels.

PANEL 1 — FRONT CLOSE-UP
Exact frontal head-and-shoulders portrait.
Camera at eye level.
Direct eye contact.
Neutral expression.
No head tilt.
This panel is the main facial identity anchor.

PANEL 2 — LEFT PROFILE
Exact 90-degree left-side facial profile.
Head level.
Neutral expression.
Clearly show forehead slope, nose projection, lips, chin, jawline, ear placement and skull silhouette.

PANEL 3 — THREE-QUARTER VIEW
Natural approximately 45-degree three-quarter facial angle.
Neutral expression.
Clearly reveal facial depth while preserving the exact identity.

PANEL 4 — FULL-BODY FRONT
Full body from head to feet.
Standing naturally upright.
Arms relaxed beside the body.
Feet naturally close together.
Camera approximately waist-to-chest height and far enough away to minimize body perspective distortion.
Clearly show real body proportions.

PANEL 5 — HALF-BODY / MID-LENGTH FRONT
Front-facing from approximately upper thighs or waist upward.
Relaxed natural posture.
Neutral expression.
Clearly show the relationship between head size, neck, shoulders, torso and body frame.


CONSISTENCY

All five panels must show exactly one recurring character.

Use the same:
identity,
age,
skin color,
skin undertone,
facial geometry,
body proportions,
hairstyle,
hair color,
and neutral makeup.

Do not create five different women.
Do not vary facial attractiveness or facial geometry between panels.
Do not modify the nose or eye size by viewing angle beyond real perspective.
Do not change chin length.
Do not change jaw width.
Do not change lip volume.
Do not change apparent ethnicity or age.
Do not change skin lightness between panels.


PHOTOGRAPHY

Neutral light-gray seamless studio background in every panel.

Large diffused studio lighting.
Neutral white balance.
Accurate skin-color reproduction.

Professional full-frame photographic appearance.

For facial panels:
approximately 85mm portrait-lens perspective.

For full-body panel:
approximately 70–85mm equivalent perspective from sufficient distance,
avoiding wide-angle limb or body distortion.

Maintain similar lighting direction, contrast and exposure in every panel.


SKIN REALISM

Preserve real photographic skin:
fine pores,
natural microtexture,
fine facial and body hairs,
subtle tonal variation,
minor natural imperfections,
realistic under-eye coloration,
natural skin translucency.

No airbrushed beauty retouching.


SHEET DESIGN

Clean professional casting / character-development reference sheet.

Consistent neutral background.
Thin simple dividers between panels.
No decorative graphics.
No magazine styling.
No dramatic typography.
No logos.

Optional small simple labels only:
FRONT
PROFILE
3/4 VIEW
FULL BODY
HALF BODY


AVOID

different person in each panel,
identity drift,
different nose shapes,
different eye spacing,
different jawlines,
different face widths,
different skin tones,
different ages,
different hairstyles,
fashion posing,
dramatic expression,
wide-angle distortion,
oversized head,
extremely long legs,
extreme hourglass proportions,
beauty filter,
plastic skin,
waxy skin,
CGI,
3D render,
anime appearance.
```

---

## Example B — Look Sheet สำหรับ Character ตัวอย่าง

> ใช้หลังจากสร้างและเลือกภาพ Front Identity Portrait แล้ว และแนบภาพนั้นเป็น reference

```text
Use the provided approved front-facing identity portrait as the primary and authoritative identity reference.

Create a professional highly photorealistic character look sheet of exactly the same original 22-year-old adult Korean female character.

This is not a redesign and not a new similar-looking model. Every panel must depict the same individual.

Preserve her recognizable facial geometry exactly across every view: slim oval face with a subtle soft heart-shaped influence, slightly narrow facial width, softly tapered jawline, small rounded-tapered chin, moderately high gently projected cheekbones, medium almond-shaped softly elongated dark-brown eyes, natural straight dark brows with a very soft outer arch, slender straight narrow-to-medium nose bridge with a softly rounded defined tip, medium-full natural rose lips with a soft cupid's bow and subtly fuller lower lip.

Preserve her light beige to light-medium beige complexion, neutral-warm undertone with subtle golden warmth and faint peach influence, natural fine pores, small tonal variations, subtle under-eye coloration, fine facial hairs and realistic unretouched skin texture.

Preserve her near-black dark-brown center-parted hair, relaxed low bun, natural hairline, baby hairs and loose fine face-framing strands.

Her body is slender and lean with natural adult proportions, narrow-to-medium shoulders, medium-tall visual proportions, a small-to-medium natural bust proportional to her slender frame, slim waist and subtle natural hip curve. Do not exaggerate any body feature.

Dress her consistently in a simple fitted neutral-beige thin-strap camisole and light denim shorts. Bare feet in the full-body image. Keep styling minimal and neutral.

Create one clean studio reference sheet with exactly five panels:

1. FRONT CLOSE-UP — exact frontal head-and-shoulders portrait, eye-level camera, direct eye contact, calm neutral expression, no head tilt.

2. LEFT PROFILE — exact 90-degree left profile, neutral expression, showing accurate forehead slope, nasal projection, lips, chin, jawline, ear and skull silhouette.

3. THREE-QUARTER VIEW — approximately 45-degree three-quarter view, same neutral expression, accurately revealing facial depth while retaining identical facial geometry.

4. FULL-BODY FRONT — full body head-to-feet, naturally upright posture, arms relaxed beside the body, feet naturally close, no fashion pose, anatomically realistic proportions.

5. HALF-BODY FRONT — approximately waist-to-head framing, directly facing camera, relaxed posture, clearly showing head-to-neck-to-shoulder-to-torso proportions.

The same individual must appear in every panel.

Do not alter her eye size, eye spacing, nose shape, nose length, lip volume, chin length, jaw width, cheekbone position, facial width, apparent age, skin tone or hairstyle between panels. Perspective may change naturally with camera angle, but identity must not.

Use the same neutral seamless light-gray studio background, large soft diffused studio lighting, neutral white balance and exposure in all panels.

Use an approximately 85mm portrait-lens perspective for close facial views. For the full-body image, use a 70–85mm equivalent perspective from sufficient camera distance to avoid wide-angle body distortion.

Skin must remain realistically photographed and unretouched with visible pores, fine hairs, subtle imperfections, fine lip texture, individual eyelashes and natural tonal variation.

Clean professional casting and character-development sheet layout, simple thin panel dividers, no decorative elements, no fashion-magazine styling and no logos.

Optional minimal labels:
FRONT
PROFILE
3/4 VIEW
FULL BODY
HALF BODY

Avoid identity drift, different-looking women between panels, facial beautification, different nose shapes, different eye spacing, different jawlines, changes in skin brightness, changes in body proportions, exaggerated fashion-model anatomy, fashion poses, dramatic expressions, beauty filters, plastic skin, CGI, 3D-render or anime appearance.
```

---

# 4. Production Guideline สำหรับ Momelo

## Identity DNA — LOCK

ค่ากลุ่มนี้ควรถูก lock หลัง user approve ภาพ canonical portrait:

```json
{
  "identity": {
    "age": "{{AGE}}",
    "faceShape": "{{FACE_SHAPE}}",
    "faceWidth": "{{FACE_WIDTH}}",
    "cheekbones": "{{CHEEKBONES}}",
    "jaw": "{{JAW_SHAPE}}",
    "chin": "{{CHIN_SHAPE}}",
    "eyes": "{{EYE_SHAPE}}",
    "eyeColor": "{{EYE_COLOR}}",
    "eyebrows": "{{EYEBROW_SHAPE}}",
    "noseBridge": "{{NOSE_BRIDGE}}",
    "noseTip": "{{NOSE_TIP}}",
    "noseWidth": "{{NOSE_WIDTH}}",
    "lips": "{{LIP_SHAPE}}",
    "skinTone": "{{SKIN_TONE}}",
    "skinUndertone": "{{SKIN_UNDERTONE}}"
  },
  "body": {
    "type": "{{BODY_TYPE}}",
    "heightImpression": "{{HEIGHT_IMPRESSION}}",
    "shoulders": "{{SHOULDER_WIDTH}}",
    "bust": "{{BUST_SIZE}}",
    "waistHip": "{{WAIST_HIP}}"
  }
}
```

---

## Style DNA — EDITABLE

```json
{
  "style": {
    "hairColor": "{{HAIR_COLOR}}",
    "hairStyle": "{{HAIR_STYLE}}",
    "hairTexture": "{{HAIR_TEXTURE}}",
    "makeup": "minimal natural",
    "wardrobe": "neutral reference outfit"
  }
}
```

---

## Shot DNA — NEVER use as identity

```json
{
  "shot": {
    "cameraAngle": "front",
    "framing": "head and shoulders",
    "expression": "neutral",
    "pose": "front-facing",
    "lighting": "soft neutral studio",
    "background": "light gray"
  }
}
```

---

# 5. Identity Consistency Rule

สำหรับการ generate ภาพต่อ ๆ ไป ให้เรียง authority แบบนี้:

```text
1. Approved Character Reference Image
2. Locked Identity DNA
3. Body DNA
4. Requested hairstyle / wardrobe
5. Pose / expression
6. Camera
7. Environment
```

หากข้อ 4–7 ขัดกับข้อ 1–3 ให้ **Identity มี priority สูงกว่าเสมอ**

ตัวอย่าง instruction ที่ใส่เป็น prefix สำหรับ generation ต่อจาก look sheet:

```text
IDENTITY AUTHORITY:
Preserve the approved character identity exactly.
The requested scene, pose, expression, hairstyle, wardrobe, camera and lighting may change, but they must not redefine the character's facial anatomy, age, skin identity or body proportions.
```

---

# 6. Testing Guideline

เพื่อดูว่า Character DNA ใช้งานได้จริง ไม่ได้อาศัย conversation context:

### Test A — Text-only reproducibility

เปิด session ใหม่และใช้ Prompt A โดยไม่มีภาพ reference

เช็ก:
- face shape
- eye family
- nose family
- lips
- skin tone
- undertone
- apparent age
- overall visual direction

ไม่จำเป็นต้องเป็น “คนเดียวกัน 100%” เพราะ text-to-image มี stochastic variation

### Test B — Reference consistency

เลือก Front Portrait 1 ภาพเป็น canonical identity แล้วใช้ Prompt B + ภาพ reference

เช็ก:
- Front vs profile ยังดูเป็นคนเดียวกันหรือไม่
- จมูก profile สอดคล้องกับ front หรือไม่
- eye spacing ไม่เปลี่ยน
- jaw/chin ไม่เปลี่ยน
- สีผิวไม่ drift
- อายุไม่ drift
- body proportions ไม่เปลี่ยนระหว่าง panels

### Test C — Scene transfer

หลัง approve look sheet ให้ลองเปลี่ยน:
- เสื้อผ้า
- hairstyle
- expression
- location
- camera angle

แต่ใช้ Identity Authority เดิม

ถ้าใบหน้ายัง stable แปลว่า Character DNA สามารถนำไปต่อยอดเป็น reusable Momelo Character ได้

---

# 7. Prompt Design Notes

หลักที่ใช้ใน template นี้คือ:
- ระบุ **subject / purpose / framing / lighting / constraints** ชัดเจน
- บอกสิ่งที่ต้อง **preserve** และสิ่งที่อนุญาตให้เปลี่ยนแยกกัน
- ใช้ reference image ที่ approve แล้วเป็น authority เมื่อต้องการรักษา likeness/identity
- แก้ทีละ attribute เมื่อต้อง refine เพื่อช่วยลด character drift
- สำหรับ look sheet ให้กำหนด panel และ camera angle อย่างชัดเจน แทนคำกว้าง ๆ เช่น “show many angles”

---

# References

1. OpenAI Academy — *Creating images with ChatGPT*  
   https://openai.com/academy/image-generation/

2. OpenAI Help Center — *Images in ChatGPT*  
   https://help.openai.com/en/articles/11084440-images-in-chatgpt

3. OpenAI — *The new ChatGPT Images is here*  
   https://openai.com/index/new-chatgpt-images-is-here/

4. OpenAI Help Center — *Best practices for prompt engineering with the OpenAI API*  
   https://help.openai.com/en/articles/6654000-examples-of-advanced-prompts
