# Fashion Prompt Recipe Lab

This directory contains isolated research artifacts for discovering reusable
Fashion prompt recipes. Production runtime code must not import from this Lab.

## Pilot Layout

```text
datasets/
  manifests/              source inventory, hash and provenance status
  source-images/          local reference images; ignored by Git
  stage-1-prompts/        provider-neutral visual prompt observations
  stage-2-extractions/    structured observations from the original images
  coverage/               Stage 1 versus Stage 2 coverage audits
evaluations/
  contact-sheets/         local review sheets; ignored by Git
reports/                  human-readable pilot findings
```

The first pilot contains five user-supplied style folders and 51 images. Files
were renamed to stable IDs while each manifest retains the original filename
and SHA-256 content hash.

## Interpretation Rules

- Stage 1 describes visible recurring visual direction in ordinary prompt prose.
- Stage 2 re-inspects the original images and does not treat Stage 1 as evidence.
- A `core` sample supports the central style recipe.
- A `variation` sample supports a controlled alternative.
- An `outlier` sample does not define the central recipe.
- A `blocked` sample has a visible provenance or content issue and must not be
  used for recipe synthesis until reviewed.
- All current license states remain `review-required`; nothing in this pilot is
  approved for production training or publication.

Start with `reports/pilot-5-style-analysis.md` for the findings and recommended
next experiment.
