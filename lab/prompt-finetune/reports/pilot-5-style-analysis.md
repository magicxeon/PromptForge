# Five-style Prompt Recipe Pilot

**Date:** 2026-08-07  
**Dataset:** 51 user-supplied images across five folders  
**Status:** Extraction complete; generation evaluation and licensing review pending

## What Was Processed

| Style family | Images | Primary recipe role | Pilot finding |
|---|---:|---|---|
| Architectural Lean | 10 | Pose + architectural composition | Strongest complete preset candidate |
| Color Light Editorial | 7 | Lighting modifier | Coherent, but must not own pose or crop |
| Low-angle Campaign Hero | 7 | Camera + campaign composition | Strong camera rule; split full-body and portrait variants |
| Soft Character Portrait | 14 | Beauty portrait | Mislabeled for the current environmental Character preset |
| Sunlit Storefront | 13 | Environment + daylight + relaxed stance | Promising after removing logo/text-heavy outliers |

The pilot produced one ordinary provider-neutral prompt and one independent
structured extraction per family. Every source image also has a stable sample
ID, original filename, SHA-256 hash, provenance placeholder, and manual sample
disposition.

## Main Findings

### 1. Do not average prompt prose

The five folders contain different kinds of controls. Architectural Lean is a
pose-environment relationship, Color Light Editorial is a light treatment, and
Low-angle Campaign Hero is a camera treatment. Treating them all as complete
prompts would create conflicts. The production model should compose compatible
recipe layers instead:

```text
pose relationship
  + camera treatment
  + environment treatment
  + lighting treatment
  + identity and garment authority
```

### 2. Architectural Lean is the best first calibration recipe

Eight of ten images support the same visible relationship: real contact with an
architectural plane, asymmetric weight, a relaxed bend or cross in the legs, and
restrained hands. It has enough variation to test without losing a recognizable
center. Samples 008 and 009 should not define the recipe.

### 3. Color Light Editorial must be a modifier

The crop ranges from full-body to beauty close-up and the poses do not form one
cluster. The stable feature is colored-light separation. It also conflicts with
color-critical garment output, so the future compiler needs a rule such as:

```text
if garmentColorFidelity == strict:
  limit colored spill on the garment or disable the treatment
```

### 4. Low-angle Campaign Hero needs two crop variants

The low camera and upward view are stable, but full-body hero images and close
portraits have different anatomy, lens, and safe-margin risks. Sample 002 has
visible stock watermarks and is blocked from synthesis until replaced or its
license is verified.

### 5. Soft Character Portrait is currently a beauty dataset

Most images are close beauty portraits with direct gaze, shallow depth, and
soft skin treatment. They do not represent the environmental medium-close
Character portrait currently expected by Scene Builder. Recommended choices:

1. Rename this set to `soft-beauty-portrait` and keep it as a new recipe.
2. Add 12-20 licensed environmental portraits for the existing
   `soft-character-portrait` preset.

Do not merge both concepts; doing so would reintroduce the crop and environment
conflicts already seen in generated results.

### 6. Sunlit Storefront has useful structure but noisy sources

The strongest images combine a real facade, relaxed asymmetric stance, and
sunlight that visibly reaches both the person and architecture. Several samples
contain readable signs, brand marks, bags, drinks, or publication watermarks.
Those details are evidence of the source image, not recipe invariants. Sample
005 is blocked; samples 001, 003, 008, and 013 are outliers for the central
storefront recipe.

## Governance Result

All 51 files remain `review-required`. The images are local and excluded from
Git. Visible watermark or logo findings are recorded in the structured files.
No image in this pilot is approved for production training, public distribution,
or recipe promotion solely because it was processed successfully.

## Qualification Decision

No recipe is production-qualified yet. Extraction quality is sufficient to
begin a fixed-fixture generation test for **Architectural Lean** first, followed
by **Sunlit Storefront**. Color Light Editorial should be tested later as a
modifier. Low-angle Campaign Hero needs two variants. Soft Character Portrait
needs dataset correction before generation evaluation.

## Recommended Next Experiment

1. Confirm provenance/license status and replace blocked samples.
2. Approve or revise the sample dispositions in the Stage 2 files.
3. Use one fixed Character, one fixed Outfit, and one provider/model.
4. Generate the Architectural Lean candidate three times against the existing
   Scene Builder baseline.
5. Score pose contact, balance, hands, crop, garment fidelity, environment
   realism, identity fidelity, latency, credits, and failures.
6. Only then author a versioned candidate recipe under `recipes/candidates/`.

## Current Limitations

- This was a human-reviewed pilot, not an automated provider extraction run.
- Direct image-to-JSON and two-stage provider latency/cost have not yet been
  measured.
- No generated output has been scored for repeatability.
- Source-license metadata still requires the owner's review.
