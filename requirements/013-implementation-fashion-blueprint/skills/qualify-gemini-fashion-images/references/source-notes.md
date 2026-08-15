# Gemini Nano Banana Source Notes

**Verified:** 2026-07-31

## Primary Sources

- Gemini API image generation documentation:
  https://ai.google.dev/gemini-api/docs/image-generation#best-practices
- Google Cloud Nano Banana prompting guide:
  https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana

## Applicable Guidance

- Gemini describes Nano Banana 2 Lite as optimized for speed/cost and not for
  multiple reference inputs or multi-turn sequential editing.
- Gemini describes Nano Banana 2 as the general workhorse that excels at
  multiple reference processing and consistency.
- Current Gemini 3 documentation distinguishes model limits for object and
  character references; full Nano Banana 2 supports character-consistency
  references while Lite does not advertise that category.
- Best practices emphasize specificity, context/intent, step-by-step
  instructions, positive/semantic negatives and camera language.
- Google's multimodal formula is reference images + relationship instruction +
  new scenario.
- Editing guidance says to explicitly identify what changes and what stays the
  same.

## Momelo Interpretation

These capabilities explain the observed Lite failure but do not automatically
qualify Nano Banana 2. Momelo still requires repeated identity, garment,
composition, single-image and quote-parity evidence.

