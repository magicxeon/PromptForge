# Street Walk Editorial Calibration and Promotion

**ID:** `015-001-street-walk-editorial-calibration`  
**Status:** Candidate v2 implemented; fixed-fixture generation review pending  
**Owner:** Prompt Research Lab, promoted through Generation configuration  
**Production artifact:** `server/config/scene-pose-recipes.json`

## 1. Purpose

Calibrate `Street Walk Editorial` from the eight user-supplied visual samples
under `requirements/015-lab-finetune-prompt/street-walk-editorial/`. The result
must read as a professional Fashion photograph while keeping the entire moving
subject, especially both pieces of footwear, safely inside a vertical frame.

This requirement does not add a new prompt compiler or Generation workflow.
It promotes reviewed, versioned Attribute configuration through the existing
Scene Recipe catalog and canonical Generation prompt compiler.

## 2. Evidence Set

All source licensing remains review-required. These images are visual research
evidence and are not runtime assets or output references.

| File | Size | SHA-256 |
|---|---:|---|
| `01452442ab95376ed7f970bf29e80823.jpg` | 529x792 | `ca333b7e1a674a185b3568e295ab0f3442f99a270f0c82e381f9cd3167cce9b9` |
| `1a523f4366e1fe69b0dc41c9a01d125e.jpg` | 736x1349 | `8e7e2d160f0cc4f709e64c6afd39bcdcff0ac95a614fe27394eaf70f75541553` |
| `280bedd50795131b9dfbd53247e49ab3.jpg` | 736x1104 | `6e7c6e83a53fb55f526d1d9f2b9b2079fb53349d2f948a493cb7967cb1f05df1` |
| `4835f1265220a7e2e4650ac7d0904e44.jpg` | 1080x1619 | `af76c4766a5d7d26fc7a713df354b948f151a5b22857684ea867db954a4bb01c` |
| `93db1e6b05671f4e55907ba39e089969.jpg` | 736x920 | `db965a7bb8380d237bdbcd38e40bedab05e0e795488d5d091d9c446147892aa3` |
| `ae8fa835c21ab7463987a48bf0f7b71c.jpg` | 960x1200 | `1eeaea08601a26a6069af71a46f7605ffab3bbf7b6197775098b2a652a7d1dad` |
| `d9979504ecbc75d3f12b13b94fa776ab.jpg` | 736x1313 | `0da8dfd701024723b0f77783667613976959ef44682d290f99cb45e38fdacce6` |
| `e18276ec81f9738624bcb6a1cca339ea.jpg` | 735x985 | `64aa59dbdca87962051e21fb04276464228d008ffd031c8abdd5fd5898366d79` |

## 3. Visual Analysis

### 3.1 Invariants

- One subject is shown once in one decisive, readable mid-stride instant.
- Front and rear legs remain separated with credible weight transfer.
- Pelvis and shoulders counter-rotate subtly; the torso stays long and relaxed.
- The complete head-to-foot silhouette remains visible.
- The subject stays inside the central horizontal corridor. Street depth comes
  from pavement, crossings, curbs and architecture rather than placing the
  subject near an outer frame edge.
- Both pieces of footwear remain completely visible with clear ground below.
- The city is a real photographic place with coherent planes, leading lines and
  restrained layered activity rather than an abstract or empty backdrop.
- Directional daylight gives the subject shape while preserving the face,
  garment color, construction and texture.

### 3.2 Controlled Variations

- Walking direction may be toward camera, across frame or on a shallow diagonal.
- A hand may use a real garment pocket; otherwise both arms use a restrained
  natural walking swing.
- Gaze may connect near camera or follow the walking direction when the face
  remains readable and the neck remains relaxed.
- The street may contain subdued distant pedestrians or vehicles when they
  remain secondary and do not become additional subjects.
- Lighting may resolve as open shade, restrained direct daylight or warm
  backlight only when the visible environment supports that light path.

### 3.3 Rejected Behaviors

- Rule-of-thirds placement that pushes the moving subject toward a side edge.
- Shoes touching or nearly touching the bottom edge, or any cropped body part.
- Invented pockets, bags, phones, drinks, accessories or unrelated props.
- A rigid catalog walk, merged legs, impossible ankle alignment or exaggerated
  runway motion.
- Empty abstract streets, impossible road geometry, dominant signage, readable
  advertising text or a competing background figure.
- Flat beauty light, unexplained spotlights, clipped skin or an unreadable face.

## 4. Candidate v2 Contract

`scene-pose.street-walk-editorial` version 2 resolves:

- `pose.fashion.street-walk-editorial`
- `pose.hand.street-pocket`
- `pose.gaze.movement`
- `environment.fashion.street-editorial`
- `lighting.fashion.street-editorial-daylight`
- `camera.framing_10`
- `camera.composition_03`
- existing natural 50mm, eye-level, aperture, background-motion and camera
  imperfection settings

The dedicated framing targets approximately 78-86 percent subject height,
roughly 4-7 percent visible ground below both shoes, safe hair and side margins,
and a visual center near 50 percent frame width with at most 5 percent lateral
variation. Numeric targets are composition guidance, not post-generation crops.

## 5. Conflict Policy

1. Recipe framing overrides generic environmental-portrait framing.
2. Central movement composition overrides generic rule-of-thirds placement.
3. Complete-body and footwear safety override optional movement space.
4. Character Reference owns identity and body proportions.
5. Outfit Reference owns garment construction and product details.
6. Street Recipe owns pose, framing, environment and light but cannot invent
   clothing features or accessories.
7. Pose Style may adjust energy and asymmetry but cannot replace the stride,
   central corridor, crop safety or physical environment.

## 6. Implementation

- Production Recipe catalog advances to `2026-08-professional-8`.
- `Street Walk Editorial` advances from version 1 to version 2.
- Fashion attributes own the revised movement, hand, gaze, city and daylight
  directions.
- Camera attributes own the dedicated central movement composition and
  full-body footwear-safe framing.
- Prompt compilation continues through the existing Generation owner.

## 7. Manual Qualification

Generate at least three images using the same Character, Outfit, provider,
model, aspect ratio and resolution. Record:

- subject horizontal center and frame occupancy
- clear margin above hair, below both shoes and beside the silhouette
- complete footwear and limb visibility
- stride balance, leg separation, hands and gaze
- identity and garment fidelity
- street geometry, leading lines and background competition
- physical lighting direction and face readability
- professional Fashion read, duration, credits and provider errors

Candidate v2 is qualified only when all three runs keep the complete subject in
frame, at least two runs place the visual center within the target corridor, no
run invents a dominant prop or competing person, and the average professional
Fashion score is at least 4/5.

## 8. Acceptance Criteria

- Every Recipe selection resolves to a canonical enabled Attribute ID.
- Compiled prompt contains the decisive stride, central corridor, footwear-safe
  frame, real layered city context and motivated street daylight.
- Compiled prompt no longer contains generic rule-of-thirds, generic
  environmental portrait or open-shade-only direction for this Recipe.
- JSON catalogs parse and Recipe regression tests cover the v2 contract.
- Manual qualification results are appended before declaring the Recipe final.

