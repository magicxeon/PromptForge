# 010-005 Outfit Reference Front/Back Upload

**Status:** Implemented - Front/Back Flow Complete, Awaiting Browser Verification
**Parent:** `010-character-reference-clothing-concept.md`
**Depends on:** 010-002, provider capability contracts

## Sub Requirements

| File | Purpose |
| --- | --- |
| `010-005-001-outfit-reference-ui-and-customization-flow.md` | Move the Front/Back reference UI to the top of Clothing, guarantee payload attachment, and expose only explicit reference-safe overrides |

## Objective

Define outfit reference upload support for Character Sheet Builder, especially front and back clothing views.

## MVP Upload Slots

| Slot | Required | Purpose |
| --- | --- | --- |
| Outfit Front | Optional | main clothing shape, color and styling |
| Outfit Back | Optional | back-view garment details |

Side view upload is deferred.

## Upload Rules

- Uploads describe outfit only.
- Uploads do not own face identity.
- If front and back are present, both should be sent as outfit references when provider supports references.
- If only front exists, prompt may infer back view but must not promise exact back reconstruction.
- Uploaded outfit references override outfit preset text.

## Prompt Segment

Front only:

```text
matching the clothing outfit, garment silhouette, colors, and styling from the uploaded front outfit reference, inferring unseen back details naturally
```

Front and back:

```text
matching the clothing outfit from the uploaded front and back outfit references, preserving garment silhouette, colors, and visible details across all sheet views
```

## Provider Capability

If provider supports references:

- send canonical face reference if available
- send outfit front/back references within max image count

If provider does not support references:

- store uploads
- show warning
- do not silently claim reference matching

## Acceptance Criteria

- Front/back upload ownership is clear.
- Outfit uploads can support multi-angle sheet generation.
- Story Mode can later reuse the generated sheet, not the raw outfit uploads alone.

## Implementation Log

### 2026-07-18 - Outfit Front/Back Upload Baseline

- Added Character Sheet-only outfit reference upload slots:
  - Outfit Front
  - Outfit Back
- Placed the outfit reference upload control inside the Clothing section because the upload owns clothing, not the global mode.
- Added slot previews and clear controls for front/back outfit references.
- Added `outfitReference` ownership state separate from Face Match, Style Match, Pose Match and Story Character Reference.
- Updated Character Sheet source ownership summary:
  - front-only upload reports `Front Upload`
  - front/back upload reports `Front/Back Upload`
  - upload ownership overrides outfit preset ownership
- Updated prompt compiler behavior:
  - front-only upload uses the front reference phrase and explicitly allows natural inferred back details
  - front/back upload uses the front/back reference phrase and preserves visible garment details across sheet views
  - uploaded outfit references override outfit preset text
- Added outfit references to generation payload, server context normalization, queue options, comparison snapshots and history reference ids.
- Added outfit reference images to provider reference image arrays for providers that already support image references.

Deferred:

- Provider-specific UX warnings beyond existing max-reference/capability validation.
- Side outfit reference upload.
- Story Mode reuse of raw outfit uploads; MVP still expects Story Mode to reuse the generated character sheet.
