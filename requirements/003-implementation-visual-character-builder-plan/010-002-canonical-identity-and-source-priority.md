# 010-002 Canonical Identity and Source Priority

**Status:** Draft  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001

## Objective

Define which source owns each part of the character so uploaded references, presets and manual controls do not fight each other.

## Source Priority

| Source | Priority | Owns |
| --- | ---: | --- |
| Saved Headshot configuration | 1 | Semantic identity selections |
| Canonical headshot image | 2 | Recognizable face identity |
| Character reference image | 3 | Full character identity if explicitly enabled |
| Uploaded clothing reference | 4 | Clothing style, garment detail and outfit color |
| Clothing preset | 5 | Outfit when no upload owns clothing |
| Color/pattern override | 6 | Supported editable regions only |
| Admin prompt override | 7 | Final manual text, fully audited |

## Ownership Rules

- Canonical identity must not be silently replaced by clothing upload.
- Uploaded clothing reference owns outfit only, not face identity.
- Clothing preset is disabled or demoted when uploaded clothing reference is active.
- Color overrides are active only when their target garment source supports edits.
- Admin override may edit final prompt but must record the override.

## UI Ownership Labels

The interface should show clear ownership state:

```text
Identity source: Saved Headshot
Face reference: Active
Clothing source: Uploaded Reference
Preset clothing: Disabled by clothing reference
```

## Conflict Examples

| Conflict | Resolution |
| --- | --- |
| User selects blazer preset and uploads dress image | Uploaded clothing reference wins |
| User selects red shirt override while upload owns clothing | Disable override unless advanced reference edit is enabled |
| User changes face shape after selecting canonical headshot | Treat as advanced identity override |
| Provider cannot send references | Keep upload stored, do not send to provider, show warning |

## Acceptance Criteria

- Source priority is deterministic.
- The prompt builder can derive one owner for identity and one owner for clothing.
- Disabled controls explain why they are disabled.
- History records which source won each ownership area.
