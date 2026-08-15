# BytePlus Seedream Source Notes

**Verified:** 2026-07-31

## User-Supplied Source

- ModelArk image generation documentation:
  https://console.byteplus.com/ark/region:ap-southeast-1/docs/ModelArk/2582774

The console route returned an internal page error to the crawler. The public
documentation below provides the technical baseline.

## Primary Sources Added

- Seedream 4.0-4.5 prompt guide:
  https://docs.byteplus.com/en/docs/modelark/1829186
- ModelArk image generation API:
  https://docs.byteplus.com/en/docs/ModelArk/1824121

## Applicable Guidance

- Use coherent natural language for subject, action and environment; include
  style, color, lighting or composition only when needed.
- State the application scenario and keep edit goals concise and unambiguous.
- For references, explicitly describe the reference target to retain and the
  desired generated scene.
- For multiple inputs, say what to reference or edit from each image. Official
  examples use explicit Image 1/Image 2 replacement and clothing transfer.
- The API recommends keeping prompts below 600 English words because long
  prompts can scatter attention.
- Current Seedream 4.x/5.x endpoints support multi-image input, while supported
  resolution and streaming parameters differ by model.
- Use `sequential_image_generation: disabled` for one final image where the
  model/API supports that switch. Automatic sequential generation is for image
  sets and must not leak into a single Fashion operation.
- Current 4.x/5.x models do not use the legacy `guidance_scale` parameter.

## Momelo Interpretation

The strong three-view Character input can cause a model to create a set or
contact sheet. Single-image parameters and explicit one-photo wording are both
release requirements, but still require repeated benchmark evidence.

