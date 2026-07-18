# 010-004-002 Pattern and Material Options

**Status:** Draft  
**Parent:** 010-004  
**Depends on:** 010-004-001, 010-006

## Objective

Define simple pattern and material controls for Character Sheet clothing without creating a full garment editor.

## Pattern MVP

| Attribute ID | Label | Prompt Phrase |
| --- | --- | --- |
| `outfit.pattern.solid` | Solid | solid color fabric |
| `outfit.pattern.subtle_stripe` | Subtle Stripe | subtle vertical stripe pattern |
| `outfit.pattern.plaid` | Plaid | clean plaid fabric pattern |
| `outfit.pattern.floral` | Floral | small tasteful floral pattern |
| `outfit.pattern.geometric` | Geometric | simple geometric fabric pattern |
| `outfit.pattern.color_block` | Color Block | clean two-tone color block design |

## Pattern Rules

- Pattern describes clothing only, not background.
- `solid` should usually be omitted from final prompt to avoid noisy text.
- Pattern must not introduce brand, logo, text, mascot, copyrighted marks, or slogans.
- Pattern must stay tasteful and not become costume-specific unless the outfit base already implies it.

## Material MVP

| Attribute ID | Label | Prompt Phrase |
| --- | --- | --- |
| `outfit.material.cotton` | Cotton | matte cotton fabric |
| `outfit.material.denim` | Denim | structured denim fabric |
| `outfit.material.knit` | Knit | soft knit fabric texture |
| `outfit.material.satin` | Satin | subtle satin sheen |
| `outfit.material.wool` | Wool | soft wool blend texture |
| `outfit.material.leather_like` | Leather-like | smooth leather-like material, brand-free |

## Material Rules

- Material is optional.
- Avoid intense shine unless `satin` is explicitly selected.
- `leather_like` must remain brand-free and non-fetishized.
- Material must not conflict with Outfit Base. If it conflicts, compiler should use softer wording or omit material.

## UI Recommendation

Use CSS swatch cards first:

- cheaper than image assets
- easy to theme
- no runtime PNG cost
- easier to adjust before the category is stable

Use image thumbs later only if CSS swatches are not readable enough.

## Acceptance Criteria

- Pattern and material options compile deterministically.
- Pattern/material do not duplicate outfit base wording.
- `solid` or empty pattern does not add unnecessary text.
- CSS swatches are readable in compact visual cards.
