# 010-002 Canonical Identity and Source Priority

**Status:** Implemented - Baseline  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001

## Objective

Define source ownership for Character Sheet Builder so identity, body and outfit inputs do not conflict.

## Source Priority

| Source | Priority | Owns |
| --- | ---: | --- |
| Saved Headshot / visual character config | 1 | identity selections and canonical face |
| Canonical headshot image | 2 | recognizable facial identity |
| Body visual attributes | 3 | body silhouette/proportion |
| Outfit front/back references | 4 | clothing shape, details and colors |
| Outfit preset | 5 | outfit when no upload owns clothing |
| Clothing color override | 6 | supported preset garment colors only |
| Admin prompt override | 7 | final audited manual prompt |

## Identity Rules

- Headshot identity is the base.
- Character sheet generation should not randomize face, age, heritage or hair unless user changes those fields.
- Outfit uploads must not replace facial identity.
- Body controls must not rewrite face or clothing identity.

## Outfit Rules

- Uploaded outfit front/back references own clothing when active.
- Preset outfit is used only when no outfit reference owns clothing.
- If both front and back outfit images exist, prompt should reference both views.
- If only front image exists, back view is inferred and must not promise exact reconstruction.

## UI Ownership Labels

Show clear state:

```text
Identity source: Saved Headshot
Body source: Visual Attributes
Outfit source: Front/Back Upload
Sheet layout: Front / Side / Back
```

## Acceptance Criteria

- Identity source is deterministic.
- Outfit source is deterministic.
- Prompt builder knows which source owns each segment.
- History records source ownership for Story Mode reuse.

## Implementation Log

### 2026-07-17 - Source Ownership Baseline

- Added derived Character Sheet source ownership state on the client.
- Added a Character Sheet Builder source summary under the mode selector:
  - Identity source
  - Body source
  - Outfit source
  - Sheet layout
- Sent `sourceOwnership` in generation payload for `character-sheet` mode.
- Normalized and preserved `sourceOwnership` on the server generation context.
- Stored `mode` and `sourceOwnership` in generated history entries.
- Included `sourceOwnership` in comparison configuration snapshots.
- Deferred real saved-headshot selection and outfit front/back upload ownership to later 010 sub-requirements.
