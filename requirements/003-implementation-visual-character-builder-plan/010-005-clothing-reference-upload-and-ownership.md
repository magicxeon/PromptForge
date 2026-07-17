# 010-005 Outfit Reference Front/Back Upload

**Status:** Draft - Revised  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-002, provider capability contracts

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
