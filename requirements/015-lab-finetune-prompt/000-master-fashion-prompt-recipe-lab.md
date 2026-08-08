# Fashion Prompt Recipe Lab

**ID:** `015-lab-finetune-prompt`  
**Status:** Design approved; five-style manual pilot processed; automated runners pending
**Owner:** Prompt Research Lab  
**Lab root:** `lab/prompt-finetune/`

## 1. Purpose

Build a controlled research workflow that learns reusable Fashion prompt
recipes from qualified reference images. The Lab must help Momelo produce
natural, professional images from simple user choices without coupling
experimental code or datasets to the production Generation pipeline.

The first phase is **recipe discovery and evaluation**, not model-weight
fine-tuning. Prompt prose is not averaged directly. The Lab extracts observable
evidence, groups compatible examples, derives deterministic rules, and promotes
only qualified versioned configuration.

## 2. Product Outcome

Momelo users should be able to select a small number of understandable controls
and receive coherent Fashion direction comparable to expert-written prompts.

Initial Simple Mode controls:

- Style preset
- Pose energy
- Camera intimacy
- Lighting drama

Advanced Mode may expose validated recipe variables. It must not expose raw Lab
schema or conflicting low-level controls by default.

## 3. Research Workflow

```text
Licensed reference images
  -> Stage 1 visual prompt extraction
  -> Stage 2 structured evidence extraction
  -> Coverage and contradiction audit
  -> Style clustering
  -> Candidate recipe synthesis
  -> Deterministic prompt compilation
  -> Optional AI language refinement
  -> Fixed-fixture image evaluation
  -> Qualified recipe promotion
```

### 3.1 Stage 1: Prompt-Only Observation

Generate concise provider-neutral prose from the original image. Capture only
visible or strongly supported information:

- commercial or editorial intent
- framing and subject placement
- body action, balance, gesture and gaze
- camera height, angle, distance and lens character
- key, fill, direction, hardness and contrast of light
- physical environment and believable depth cues
- capture texture and realism cues
- uncertainty where evidence is incomplete

Do not infer identity, protected traits, brand, location, camera model or other
metadata that is not visibly supported.

### 3.2 Stage 2: Structured Extraction

Stage 2 must inspect the **original image again as its primary authority**. The
Stage 1 prose is only a candidate description and must not become evidence.

The extractor produces structured JSON and a `promptCoverage` audit:

- correctly represented observations
- missing observations
- invented claims
- contradictory instructions
- low-confidence observations

This separation prevents an early hallucination from becoming accepted truth.

### 3.3 Direct Baseline

For every calibration set, also run direct image-to-JSON extraction without
Stage 1. Compare quality, repeatability, cost and latency. If the direct path is
equivalent or better, prefer it and retain Stage 1 only for human review.

## 4. Canonical Extraction Schema

The initial schema must be versioned and machine-validated. It should contain:

```json
{
  "schemaVersion": "fashion-observation-v1",
  "sampleId": "sample_stable_id",
  "styleFamily": "window-shadow-lookbook",
  "fashionIntent": {},
  "subject": {},
  "pose": {
    "bodyAction": "",
    "weightDistribution": "",
    "torsoDirection": "",
    "headDirection": "",
    "gaze": "",
    "leftHand": "",
    "rightHand": ""
  },
  "camera": {
    "shotSize": "",
    "height": "",
    "angle": "",
    "subjectDistance": "",
    "lensCharacter": ""
  },
  "composition": {},
  "lighting": {
    "source": "",
    "direction": "",
    "quality": "",
    "subjectIllumination": "",
    "shadowPattern": ""
  },
  "environment": {},
  "capture": {},
  "qualityFlags": [],
  "confidence": {},
  "evidenceNotes": [],
  "promptCoverage": {
    "correct": [],
    "missing": [],
    "invented": [],
    "contradictory": [],
    "lowConfidence": []
  }
}
```

Enumerations and evidence rules belong in versioned schema/configuration files,
not hard-coded across scripts.

## 5. Recipe Synthesis

A recipe contains:

1. **Invariants** required for the style to remain recognizable.
2. **Controlled variations** that can change without breaking the style.
3. **Conflict rules** that resolve incompatible pose, camera, crop, lighting and
   environment choices.
4. **Negative constraints** used only when they prevent observed failure modes.
5. **Provider adaptations** separated from the provider-neutral recipe.

Do not calculate a numeric average of categorical creative choices. Cluster
compatible observations, identify recurring relationships, then author explicit
rules. For example, hard window shadows require direct light to reach both the
subject and the background; they cannot coexist with a fully shaded subject.

## 6. Lab Folder Contract

```text
lab/prompt-finetune/
  README.md
  config/
  schemas/
  src/
  datasets/
    manifests/
    source-images/          local/private; ignored by Git
    raw-responses/          local/private; ignored by Git
    stage-1-prompts/
    stage-2-extractions/
    coverage/
  recipes/
    candidates/
    qualified/
  evaluations/
    fixtures/
    runs/
    generated-images/      local/generated; ignored by Git
  reports/
  outputs/                  local/generated; ignored by Git
```

Production runtime code must never import from `lab/`. Promotion copies an
immutable, reviewed recipe artifact into the canonical production owner under
`server/config/`, with schema validation, provenance, tests and a rollback
version.

## 7. Dataset Governance

Every sample manifest must include:

- stable sample ID and content hash
- source and license/provenance
- allowed research and product use
- style-family label and reviewer
- extraction versions and timestamps
- excluded or redacted sensitive data

Do not build the dataset from unlicensed scraped images. Do not infer protected
or sensitive personal traits. Raw private images, provider responses and
generated evaluation images remain local and outside Git.

## 8. Evaluation

Evaluate candidate recipes against fixed Character, Outfit and environment
fixtures. Record at minimum:

- professional Fashion read
- identity and body fidelity when references are present
- garment fidelity
- pose, balance, hands and gaze
- camera and crop correctness
- lighting direction and subject exposure
- environment realism and prop discipline
- anatomical and photographic realism
- repeatability across at least three runs
- provider/model, credits, duration, resolution, reference count and errors

Keep human ratings separate from automatically collected telemetry. A recipe
must beat or match the current baseline before promotion.

## 9. Implementation Sequence

1. Create the Lab scaffold, schemas and manifest validator.
2. Select one style family and 20-30 licensed representative images.
3. Implement Stage 1, Stage 2 and direct-baseline runners.
4. Produce coverage reports and manually review extraction quality.
5. Build clustering and recipe-authoring inputs from structured observations.
6. Compile deterministic prompts from one candidate recipe.
7. Evaluate against fixed fixtures and record repeatability.
8. Add optional Luna refinement only after the deterministic baseline is known.
9. Define the promotion command and immutable production artifact contract.
10. Expand to other style families only after the first recipe passes.

Do not start with a large bulk dataset. The first small calibration set exists
to correct the schema and evidence rules before costs multiply.

## 10. Acceptance Criteria

- Lab code and data follow the folder contract and remain isolated from runtime.
- Both extraction stages are reproducible and schema-validated.
- Stage 2 independently verifies the original image.
- Direct image-to-JSON baseline is measured against the two-stage path.
- Reports expose missing, invented and contradictory prompt content.
- Candidate recipes separate invariants, variation and conflict policy.
- At least one recipe is evaluated across fixed fixtures and repeated runs.
- Production promotion is explicit, versioned, tested and reversible.
- Large/private assets and generated evaluation output are excluded from Git.

## 11. Related Requirements

- `requirements/013-implementation-fashion-blueprint/010-professional-scene-builder-guided-experience.md`
- `requirements/009-migration-to-react/016-capability-ownership-and-single-workflow-entry-points.md`
- `requirements/009-migration-to-react/017-performance-ownership-observability-and-tuning.md`
- `requirements/099-technical-dept/000-master.md`

## 12. Pilot Checkpoint (2026-08-07)

The first manual calibration pass processed 51 user-supplied images across
Architectural Lean, Color Light Editorial, Low-angle Campaign Hero, Soft
Character Portrait, and Sunlit Storefront.

Artifacts are under `lab/prompt-finetune/`:

- stable manifests with original filenames and SHA-256 hashes
- local ignored source images and contact sheets
- five Stage 1 provider-neutral prompt observations
- five independent Stage 2 style-family extractions
- five prompt coverage audits
- `reports/pilot-5-style-analysis.md`

This checkpoint does not satisfy the automated runner, direct-baseline,
generation evaluation, or promotion acceptance criteria. All source licenses
remain review-required. Architectural Lean is the recommended first fixed-fixture
generation candidate; no recipe has been promoted to production.

## 13. Street Walk Editorial Calibration Checkpoint (2026-08-07)

Eight additional user-supplied vertical references were analyzed as the
`Street Walk Editorial` family. Requirement
`001-street-walk-editorial-calibration-and-promotion.md` records hashes,
invariants, controlled variations, conflict rules, the promoted candidate v2
configuration and its pending manual qualification gate.

The production candidate uses the existing Scene Recipe and Generation
contracts. It introduces no Lab runtime dependency and no parallel prompt
compiler. Source licensing remains review-required.

## 14. Visual Qualification and Recipe Correction Checkpoint (2026-08-08)

Owner review accepted `Street Walk Editorial` version 2 for lighting and pose,
and accepted `Soft Character Portrait` version 2 for its intended identity-led
portrait result. The broader provider matrix remains a separate qualification
task.

The same review rejected or constrained three remaining candidates:

- `Sunlit Storefront` must keep the face and garment front readable, with the
  facial plane no more than 30 degrees from the camera axis;
- `Low-angle Campaign Hero` must move materially closer, use a pronounced
  upward camera angle, and show real glass/commercial high-rises plus visible
  sky instead of isolated concrete forms; and
- `Color-light Editorial` must place visible colored light across the subject's
  face, skin and garment, not color only the background.

Requirement
`002-scene-recipe-visual-qualification-and-v9-corrections.md` owns the v9
promotion contract and the next fixed-fixture review gate.

`Sunlit Storefront` version 3 and `Low-angle Campaign Hero` version 2 passed
owner visual review on 2026-08-08. Low-angle retains a weaker-run consistency
note for later optimization. `Color-light Editorial` version 2 composed
successfully but lacked decisive color contrast, so catalog v10 replaces its
cyan/magenta family with the scarlet-red versus cobalt-blue contract in version
3. The visual gate remains open for Color-light v3.
