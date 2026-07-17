# 010-007 Prompt Builder and Provider Contract

**Status:** Draft  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001 through 010-005

## Objective

Define prompt assembly rules for Character Reference and ensure provider-specific options do not change semantic intent.

## Prompt Segments

Character Reference prompt should compile in this order:

1. layout intent
2. canonical identity
3. body silhouette
4. clothing source
5. clothing colors/material
6. pose/layout views
7. background
8. camera/style
9. quality

## Example Prompt

```text
character model sheet, same recognizable female character identity from the saved canonical headshot, full-body view, balanced natural adult body silhouette, wearing a plain fitted white t-shirt and straight-leg dark denim jeans, front view, side view, and back view, standing straight in a neutral pose, on a solid pure white background, photorealistic commercial character reference, consistent lighting, crisp details
```

## Uploaded Clothing Reference Prompt

When upload owns clothing:

```text
matching the clothing outfit, garment silhouette, colors, and styling from the uploaded clothing reference
```

Do not also include preset outfit text unless advanced override is enabled.

## Provider Contract

Provider adapters may change payload fields but not semantic source ownership.

| Concern | Rule |
| --- | --- |
| Reference support | only send images when model supports references |
| Reference count | canonical face and clothing upload count separately |
| Resolution | use provider-supported output controls |
| Output format | use only supported model parameters |
| Prompt text | same semantic prompt before provider adapter |

## Cleanup Rules

- no duplicate clothing phrases
- no conflicting outfit sources
- no off-camera or pose language that contradicts chosen layout
- no adult glamour wording for minor-safe cases
- no hidden clothing fallback once visible clothing preset exists

## Acceptance Criteria

- Admin prompt preview matches submitted prompt unless manually edited.
- Provider payload differences are adapter-only.
- Prompt tests cover preset clothing, uploaded clothing and provider limitations.
