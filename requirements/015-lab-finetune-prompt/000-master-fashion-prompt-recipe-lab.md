# Fashion Prompt Recipe Lab

**ID:** `015-lab-finetune-prompt`  
**Status:** Design approved; implementation pending  
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

