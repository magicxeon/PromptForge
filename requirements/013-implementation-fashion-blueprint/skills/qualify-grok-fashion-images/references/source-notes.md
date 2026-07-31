# Grok Imagine Source Notes

**Verified:** 2026-07-31

## User-Supplied Source

- X Creators article:
  https://x.com/XCreators/article/2040196196388762028?lang=en

The article body was not accessible to the documentation crawler during this
review. Treat it as supplemental reading, not the technical source of truth.

## Primary Technical Sources Added

- xAI Imagine overview:
  https://docs.x.ai/developers/model-capabilities/imagine
- xAI Multi-Image Editing:
  https://docs.x.ai/developers/model-capabilities/images/multi-image-editing

## Applicable Guidance

- Grok Imagine image editing supports up to three source images.
- Multi-image edits preserve the order supplied in the request.
- The output ratio follows the first source image by default unless
  `aspect_ratio` is explicitly supplied.
- Sources may use public URLs, data URIs or Files API IDs; Momelo's private asset
  and transport policy remains authoritative.
- Image generation and image editing have different endpoint and billing
  behavior. Fashion with references must be evaluated as editing/compositing.

## Momelo Interpretation

Three source images map neatly to Template, Character and Outfit-front. Plans
that require another independent role need an approved derivative or must be
rejected for Grok. This limitation must be reflected in both quote and
generation request fingerprints.

