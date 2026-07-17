# 010-003 Body Proportion and Sheet Layout Controls

**Status:** Draft - Revised  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001, 010-002

## Objective

Define visual body/proportion attributes and sheet layout controls for generating a reusable multi-angle character model.

## MVP Body Fields

| Field | Control | Purpose |
| --- | --- | --- |
| Height Impression | Visual card / simple selector | petite, average, tall impression |
| Body Silhouette | Visual card picker | broad full-body silhouette |
| Build | Visual card picker | slim, average, athletic, plus-size; respectful wording |
| Shoulder/Waist/Hip Balance | Deferred or advanced | only if needed after first sheet tests |

## Body Wording Rules

- Use neutral, descriptive language.
- Avoid sexualized body descriptors.
- Avoid medical or judgmental labels.
- For minors, use only age-safe neutral body wording.

## MVP Layout Fields

| Layout | Use |
| --- | --- |
| Front / Side / Back | default character sheet |
| Front / Back | simpler outfit reference sheet |
| Front Only Full Body | fallback/test mode |

Default:

```text
front view, side view, and back view of the same character
```

## Prompt Phrase Examples

```text
balanced natural adult body silhouette
average height impression
standing straight in a neutral pose
front view, side view, and back view of the same character
```

## Visual Asset Requirements

- generic body diagrams
- no detailed face
- no distracting clothing detail
- consistent scale across cards
- readable on mobile

## Acceptance Criteria

- User can choose body/proportion without anatomy expertise.
- Sheet layout is explicit in prompt.
- Body controls support Story Mode consistency.
