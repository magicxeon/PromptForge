# ModelPromptForge Master Attribute Database Implementation Plan

This master plan details the population and curation of photorealistic, policy-compliant (NSFW-safe) attribute JSON files in the `/attributes/` folder. The attributes have been hand-picked to maximize prompt realism (fine textures, light play, styling, physical alignment) focusing on Asian beauty standards (doll-like faces, cute expressions, and multiple fair/white skin presets) without violating content filters.

## Attribute Subtasks & Execution Order

1. **[attr-001-character-face.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/attr-001-character-face.md) - Character Profiles & Facial Features**
   * *Goal*: Update ethnicity, age, beauty, and highly detailed facial elements (V-line face, eyes, lips, nose, brows) mapping to a 100% distortion-free face template.
2. **[attr-002-skin-texture.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/attr-002-skin-texture.md) - Realistic Skin Textures**
   * *Goal*: Populate skin attributes focusing on realism (glass skin, dewy, porcelain, skin pores, natural imperfections, soft specular sheen).
3. **[attr-003-hair-details.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/attr-003-hair-details.md) - Hairstyles & Highlights**
   * *Goal*: Add everyday and alluring hairstyles (hush cut, beach waves, messy bun, wolf cut), bangs, reddish-orange coloring, and realistic rendering keywords (individual strands, flyaways).
4. **[attr-004-body-curves.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/attr-004-body-curves.md) - Body Shape & Policy-Safe Bust Definitions**
   * *Goal*: Fill `/attributes/009-body.json` with hourglass silhouettes, curvy shapes, and safety-compliant bust vocabulary (ample bust, well-endowed, heavy chest, chest definition).
5. **[attr-005-clothing-fabrics.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/attr-005-clothing-fabrics.md) - Clothing, Fits & Fabric Textures**
   * *Goal*: Populate `/attributes/010-clothing.json` with body-con fits, textures (latex, patent leather, silk, wet-look), tops (corsets, deep V-necks), bottoms, and layered fashion items.
6. **[attr-006-pose-composition.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/attr-006-pose-composition.md) - Gestures, Poses & Eye Contact**
   * *Goal*: Create `/attributes/011-pose.json` containing body alignments (leaning forward, cross legs, low back view) and subtle hands/head gestures (hand near cheek/ear, resting chin).
7. **[attr-007-lighting-camera.md](file:///d:/development/ModelPromptForge/requirements/implementation-plan/attr-007-lighting-camera.md) - Camera Settings, Lighting & Environment Presets**
   * *Goal*: Configure mirrorless camera settings (50mm lens, aperture values), dramatic neon/flash lighting presets, and vibrant night-bar environment details.

---

## Directory Target Mapping
```
ModelPromptForge/attributes/
├── 001-character.json       # Character details (Story 001)
├── 002-face.json            # Face shapes & expressions (Story 001)
├── 003-eyes.json            # Eye types (Story 001)
├── 004-eyebrows.json        # Brow details (Story 001)
├── 005-nose.json            # Nose structures (Story 001)
├── 006-lips.json            # Lips & smiles (Story 001)
├── 007-skin.json            # Skin texture, complexion (Story 002)
├── 008-hair.json            # Hairstyles, colors, bangs (Story 003)
├── 009-body.json            # Curves, safe bust definitions (Story 004)
├── 010-clothing.json        # Tops, bottoms, fit, fabrics (Story 005)
└── 011-pose.json            # [NEW] Gestures, eye contact, body poses (Story 006)
```
*(Lighting, camera, and environment elements are integrated into the master library schema under Story 007)*
