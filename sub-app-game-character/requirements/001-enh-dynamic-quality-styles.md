# Enhancement: Dynamic Quality Tags and Photorealistic Prompt Guide Adaptation
**ID**: 001-enh-dynamic-quality-styles
**Target App**: `sub-app-game-character`

## 1. Background & Problem
Currently, the `data/quality.json` file contains a static, flat array of quality modifier tags (e.g., `"masterpiece", "best quality", "AAA game splash art", "semi realistic", "8k"`). These tags are appended to every generated prompt regardless of the selected visual style.

**The Issue**: When a user selects a style like **Realistic**, the forced inclusion of words like "AAA game splash art" and "masterpiece" causes modern AI image generators to produce overly polished, plastic, and 3D-rendered outcomes. This directly destroys the intended photorealism (like skin pores and camera imperfections).

Moreover, the "Realistic" style needs to be aligned with the core principles of photorealism (behavior of lenses, lights, natural flaws, environment layers, and camera behavior).

---

## 2. Proposed Solution
Restructure `quality.json` to act as a dictionary/map where quality tags are strictly categorized by their respective Style Theme. The generator will then look up the appropriate quality tags for the currently selected style.

Additionally, when the **Realistic** style is selected, the generator must apply a strict photographic prompt architecture and filter out any "AI Buzzwords" or "Unreal Beauty" terms that lock geometry or make the image look fake.

---

### 2.1 Proposed Style-to-Quality Mappings

#### 1. 3D Game
- **Concept**: Highly detailed game render style.
- **Quality Tags**: `masterpiece, best quality, AAA game splash art, high-end 3D render, sharp focus, highly detailed, PBR materials, 8k, Unreal Engine 5 render, Octane render`

#### 2. Realistic (Adapted from Photorealistic Guide)
- **Concept**: Looks like a real photograph taken by a photographer, not an AI prompt.
- **Core Quality Tags**: `RAW photo, highres, 8k uhd, shot on DSLR, realistic lens rendering, natural HDR photography`
- **Photographic Context**: `candid snapshot moment, documentary street photography, casual handheld moment, unposed snapshot, everyday lifestyle moment`
- **Lens Behavior & Camera Position**: `shallow depth of field, creamy bokeh, natural optical falloff, edge softness, eye level, slightly below eye level, seated perspective`
- **Lighting Physics**: `practical café lighting, street lamps and storefront lighting, golden hour with open shade, window light with indoor tungsten` (Avoid generic "cinematic lighting" without sources)
- **Foreground Layer**: `foreground elements softly out of focus, foreground objects bokeh`
- **Background Activity**: `background activity naturally blurred, passing pedestrians softly blurred`
- **Subject Behavior**: `relaxed facial muscles, subtle micro-expressions, gentle eye contact, natural asymmetry, slightly imperfect smile`
- **Skin Textures**: `natural highly detailed skin texture with visible pores, fine baby hairs, subtle blemishes, natural makeup`
- **Camera Imperfections**: `subtle digital sensor noise, natural lens imperfections, slight chromatic aberration, soft cinematic depth of field, fine film grain, gentle halation, corner softness, slight handheld movement`
- **Strictly Banned (AI Buzzwords & Unreal Beauty)**:
  - *Geometry Lock*: `100%`, `exact`, `identical`, `must match`, `pixel perfect`, `without distortion`
  - *Unreal Beauty*: `flawless`, `perfect face`, `perfect skin`, `perfect anatomy`, `perfect symmetry`
  - *AI Buzzwords*: `masterpiece`, `best quality`, `ultra quality`, `insane detail`, `hyper realistic`, `16K`, `32K`, `AAA game splash art`, `illustration`, `painting`, `drawing`

#### 3. Premium Hero Illustration
- **Concept**: High-end hand-drawn and digital illustration style.
- **Quality Tags**: `masterpiece, best quality, ultra polished illustration, game promotional artwork, highly detailed, 8k, pristine, luxury character design`

#### 4. Anime-Inspired Realism
- **Concept**: Stylized anime features combined with realistic lighting and rendering.
- **Quality Tags**: `masterpiece, best quality, highly detailed, beautiful lighting, key visual, semi realistic, 2.5D style, doll-like beauty, idol-like beauty`

#### 5. Cinematic 2D Animation
- **Concept**: High-budget theatrical anime style (Ghibli, Shinkai).
- **Quality Tags**: `masterpiece, best quality, beautiful animation, detailed background, key animation frame, highres, cinematic composition, vivid colors, beautiful cel shading`

#### 6. Cyberpunk Concept Art
- **Concept**: Gritty, neon-drenched sci-fi illustration.
- **Quality Tags**: `masterpiece, best quality, trending on artstation, highly detailed concept art, 8k, neon lighting, gritty sci-fi illustration`

#### 7. Dark Fantasy Oil Painting
- **Concept**: Moody, traditional fine-art painting.
- **Quality Tags**: `masterpiece, traditional media, highly detailed brush strokes, museum quality, award-winning painting, moody chiaroscuro lighting, grimdark aesthetic`

#### 8. Retro Pixel Art
- **Concept**: Arcade style crisp pixel art.
- **Quality Tags**: `high quality pixel art, 16-bit masterpiece, crisp pixels, perfectly aligned, no anti-aliasing, sharp, retro gaming aesthetic`

#### 9. Chibi Cute Style
- **Concept**: Cute, simplified proportions.
- **Quality Tags**: `masterpiece, best quality, cute illustration, bright and colorful, flawless, chibi anime style, kawaii aesthetic`

#### 10. Comic Book Art
- **Concept**: Western graphic novel aesthetic.
- **Quality Tags**: `masterpiece, professional comic book coloring, high quality ink, sharp lines, highres, comic book illustration, dynamic shading`

#### 11. Watercolor Illustration
- **Concept**: Soft washes with traditional pigments.
- **Quality Tags**: `masterpiece, high quality watercolor paper, professional illustration, wet on wet technique, soft watercolor washes, ink and watercolor`

#### 12. Gothic Horror Art
- **Concept**: Eerie, dark academia drawing.
- **Quality Tags**: `masterpiece, best quality, highly detailed horror illustration, 8k, gothic horror art, dark academia aesthetic, macabre illustration, desaturated colors`

#### 13. Pop Art Retro
- **Concept**: High contrast poster style.
- **Quality Tags**: `masterpiece, high resolution, crisp graphic lines, vibrant pop art aesthetic, flat shading, vintage comic poster style, high contrast color blocking`

#### 14. Steampunk Vintage
- **Concept**: Sepia-toned Victorian clockwork.
- **Quality Tags**: `high quality vintage photograph, crisp details, authentic steampunk aesthetic, vintage sepia tone, brass and copper tones, clockwork mechanisms`

---

## 3. Implementation Steps

### 3.1 Refactor `data/quality.json`
Convert `quality.json` from a flat array into a mapped object where the key is the Style Theme and the value is the array of quality tags.
```json
{
  "themes": {
    "Realistic": [
      "RAW photo", "highres", "8k uhd", "shot on DSLR", "realistic lens rendering", "natural HDR photography",
      "candid snapshot moment", "documentary street photography", "casual handheld moment", "unposed snapshot", "everyday lifestyle moment",
      "shallow depth of field", "creamy bokeh", "natural optical falloff", "edge softness", "eye level", "slightly below eye level", "seated perspective",
      "practical café lighting", "street lamps and storefront lighting", "golden hour with open shade", "window light with indoor tungsten",
      "foreground elements softly out of focus", "foreground objects bokeh",
      "background activity naturally blurred", "passing pedestrians softly blurred",
      "relaxed facial muscles", "subtle micro-expressions", "gentle eye contact", "natural asymmetry", "slightly imperfect smile",
      "natural highly detailed skin texture with visible pores", "fine baby hairs", "subtle blemishes", "natural makeup",
      "subtle digital sensor noise", "natural lens imperfections", "slight chromatic aberration", "soft cinematic depth of field", "fine film grain", "gentle halation", "corner softness", "slight handheld movement"
    ],
    "3D Game": [
      "masterpiece", "best quality", "AAA game splash art", "high-end 3D render", "sharp focus", "highly detailed", "PBR materials", "8k", "Unreal Engine 5 render", "Octane render"
    ],
    ...
  }
}
```

### 3.2 Update `js/generator.js`
1. Update `generateCharacter` to extract quality tags based on the selected style theme.
2. In `generateCharacter` and `updateCharacterStyle`, if the selected style is `Realistic`, we must run a sanitization check:
   - Identify if other randomized properties (like hair, face, outfit, scene) contain banned words (e.g. `flawless skin`, `perfect anatomy`, `masterpiece`).
   - If they do, replace them with realistic/natural equivalents (e.g. `natural skin texture`, `natural anatomy`).

### 3.3 Update `js/promptBuilder.js`
Add a **Sanitization Filter** and **Context-Aware Rule Engine** in `buildPrompt`:
- **Strict Banned Word Filter for Realistic**: Inspect the compiled tags array when the style is "Realistic". Remove or replace any banned words list (e.g., stripping `masterpiece`, `best quality`, `flawless`, etc.).
- **Gender-Aware Modification**: 
  - Currently, `promptBuilder.js` hardcodes female-centric beauty tags: `doll-like beauty`, `idol-like beauty`, `small waist`, `long elegant legs`.
  - **Enhancement**: If `character.gender` is `male`, replace these with masculine equivalents: `handsome masculine features`, `broad shoulders`, `strong jawline`, `athletic muscular proportions`.
- **Style-Aware Proportion & Detail Adjustments**:
  - **Chibi Cute Style**: Remove `fashion model proportions` and `long elegant legs`. Replace with `chibi proportions`, `cute big head and tiny body`.
  - **Retro Pixel Art**: Remove high-fidelity anatomy tags like `long elegant legs` and `model proportions`. Replace with `simplified pixel art anatomy`, `low resolution details`.
- **Style-Aware Lighting & Composition Adaptations**:
  - Remove hardcoded `cinematic lighting` and `volumetric lighting` from `promptBuilder.js`. Move them into the style theme configurations in `style.json`.
  - Custom lights per style:
    - *Watercolor*: `soft diffused lighting`, `natural white background shadow`
    - *Pop Art*: `flat high-contrast lighting`, `bold pop art shading`
    - *Pixel Art*: `flat shading`, `classic game sprite lighting`
    - *3D Game / Realistic*: Retain `cinematic lighting`, `volumetric lighting`, etc.
  - Move composition flags like `center composition` and `no crop` to style-specific maps (e.g. Pixel Art uses `sprite portrait alignment`, Watercolor uses `vignette composition`).

## 4. Verification Plan
- **Test cases**:
  1. Generate a **Male** character in **3D Game** style: Verify it includes `handsome masculine features` and `broad shoulders` instead of `doll-like beauty`.
  2. Generate any character in **Realistic** style: Verify it does NOT contain `masterpiece`, `best quality`, `flawless`, or `AAA game splash art`.
  3. Generate a character in **Chibi Cute Style**: Verify it contains `chibi proportions` and does NOT contain `fashion model proportions`.
  4. Generate a character in **Retro Pixel Art**: Verify it has flat shading and pixel-art specific keywords instead of `cinematic lighting` or `PBR materials`.
