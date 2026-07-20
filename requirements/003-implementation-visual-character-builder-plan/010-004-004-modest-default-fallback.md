# 010-004-004 Modest Default Clothing Fallback

**Status:** Draft  
**Parent:** 010-004  
**Depends on:** 010-009

## Objective

Define the safe fallback clothing used when the user does not select clothing and does not upload outfit references.

## Canonical Fallback

Use this by default:

```text
wearing modest neutral fitted reference clothing, opaque light gray top and mid-thigh shorts, non-revealing
```

Expanded provider-friendly wording:

```text
wearing modest neutral character reference clothing, an opaque light gray fitted top and matching mid-thigh shorts, non-revealing, clean and practical for character sheet visibility
```

## UI Label

Use:

```text
Modest Reference Wear
```

Do not label it as:

- underwear
- lingerie
- bikini
- body suit for showing body

## Safety Rules

The fallback must not include:

- sexy
- revealing
- transparent
- lace
- lingerie
- bikini
- sensual
- erotic
- tight to show body
- exposed

## Behavior Rules

- Used only when no outfit upload and no modular clothing selection exists.
- Outfit upload overrides fallback.
- Any selected Outfit Base overrides fallback.
- If only color/pattern/material is selected without Outfit Base, use fallback base and apply only safe compatible color text if needed.

## Acceptance Criteria

- No-clothing prompt is non-revealing.
- Prompt works for adult female and adult male character sheets.
- Prompt does not accidentally sexualize the body silhouette.
- Automated prompt test blocks banned fallback words.
