# Multiple Named Start Images

Status: implemented; automated and responsive browser validation passed.
Owner: Playground Video / Generation.
Plan: [018](018-fallback-and-named-images-plan.md).

## Scope And Behavior

1. Extend Start from image with ordered add/remove/replace and optional image name
   fields. Reuse generated/upload pickers and actor-owned drafts. Single image
   retains image_to_video / first_frame. Two or more use multimodal_reference;
   every image is reference_image, never several first frames.
2. Models must expose multimodal_reference, ordered-reference support and sufficient
   referenceImageLimit. Cap arrays at 12 and active catalog limit. Preserve all
   selected images on model/mode changes; block unsupported plans without truncation.
3. Image names use the existing bounded characterName contract as neutral labels
   (80 chars, no control characters, distinct nonempty names ignoring case). Empty
   names receive Image N. Server appends neutral image mapping, not Character
   identity instructions. Ordered labels contribute to fingerprints and quotes.
4. Add image_reference purpose to canonical reference plan contracts. All-general
   reference arrays cannot be mixed with Character/Look authority implicitly.
   Seedance selections remain owned eligible Seedream Generation IDs, no uploads
   or arbitrary URLs. Only actual Look Sheets selected in Look mode receive 016
   fallback; ordinary Start from image is not an expiry bypass.
5. Image arrays and names persist in actor-scoped versioned draft with legacy
   single-image migration. No base64/signature persistence. Preserve Character
   Look Sheet mode, prompt, result, task status, model controls and billing UI.
6. Localized EN/TH, theme tokens, existing buttons/icons/spinner and accessible
   inputs. Verify 390/820/1440px, add/cancel/remove/replace and loading/error states.
   No new POC notice or decorative redesign.

## Acceptance

Single legacy frame; two/three named images; add/remove back to one; duplicate
source/name; count cap/model switch; rename/order changes quote fingerprint;
Character mode remains isolated; real provider payload roles/order/count; actor
draft reload; no public/private media bypass and no silent lost selections.
