# OpenAI Image Prompting Source Notes

**Verified:** 2026-07-31

## Primary Source

- OpenAI Cookbook, GPT Image Generation Models Prompting Guide:
  https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide

## Applicable Guidance

- Current guidance recommends `gpt-image-2` for new production image workflows,
  while `gpt-image-1.5` remains appropriate for already validated workflows.
  This is research input, not permission to add or route a model that is absent
  from Momelo's provider catalog and pricing policy.
- Identity-sensitive edits should explicitly lock face, skin tone, body shape,
  pose, hair, expression and proportions, and state that only garments change.
- Virtual clothing transfer should request realistic fit, drape, folds,
  occlusion, lighting, shadows and color temperature.
- Multi-image compositing works best when the prompt identifies what to
  transplant, where it belongs and what must remain unchanged.
- Strong production prompts separate the requested change from invariants and
  repeat important invariants during iterative edits.
- `gpt-image-1` and `gpt-image-1.5` expose low/high input fidelity. The current
  guide states that `gpt-image-2` does not use that parameter.

## Momelo Interpretation

The cookbook demonstrates useful primitives, but not Momelo's exact
Template + Character + Outfit authority problem. Every strategy remains a
benchmark hypothesis until it passes Requirement 009 across repeated private
fixtures.

