# Task attr-001: Character Profiles & Facial Features

## 1. Goal
Configure general character metadata and exact facial options. This contains the identity references that lock face details 100% to avoid AI distortion.

## 2. Attribute Specifications

### A. Character (Target: 001-character.json)
*   **Gender**: Female, Male, Non-binary.
*   **Age**: Young adult, Adult, Mid-twenties.
*   **Ethnicity**: Thai (default), Korean, Japanese, Chinese, Vietnamese (deprioritizing Western/European ethnicities).
*   **Beauty**: Beautiful young Asian woman, attractive, stunning, doll-like face.
*   **Identity Reference**: 100% facial structure match text to prevent distortion.

### B. Face, Eyes, Eyebrows, Nose, Lips (Targets: 002-face.json to 006-lips.json)
*   **Face Shape**: Doll-like face shape, V-line face, Oval face, Round baby face, Heart-shaped, Soft jawline.
*   **Eyes**: Doe eyes (big round doll-like), Almond-shaped eyes, Monolid eyes, Double eyelid, Phoenix eyes, Puppy eyes.
*   **Eyebrows**: Straight eyebrows (Korean style), Soft arched eyebrows, Natural thick brows.
*   **Nose**: Small button nose, High nose bridge, Delicate narrow nose, Soft rounded tip.
*   **Lips**: Cherry lips, Cupid's bow lips, Plump lips, Thin natural lips.
*   **Smile / Expression**: Cute doll-like expression, gentle smile, neutral expression.

---

## 3. Implementation Steps
1.  Read existing `/attributes/001-character.json` through `006-lips.json` values.
2.  Update these files with the clean schemas.
3.  Include a specific entry in `002-face.json` for "Locked Facial Match":
    *   `prompt`: `"facial structure, eyes, eyebrows, nose, and mouth matching reference image 100% without any distortion"`
