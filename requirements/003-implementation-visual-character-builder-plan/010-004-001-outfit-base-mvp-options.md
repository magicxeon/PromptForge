# 010-004-001 Outfit Base MVP Options

**Status:** Draft  
**Parent:** 010-004  
**Depends on:** 010-001, 010-002, 010-005

## Objective

Define the first Outfit Base options for Character Sheet modular clothing.

Outfit Base is the main garment form. It should be easy to understand from a visual card and stable enough for front/side/back character sheet generation.

## MVP Options

| Attribute ID | Label | Prompt Phrase | Notes |
| --- | --- | --- | --- |
| `outfit.base.modest_reference` | Modest Reference Wear | wearing modest neutral fitted reference clothing, opaque light gray top and mid-thigh shorts, non-revealing | safe fallback and visible baseline |
| `outfit.base.tshirt_jeans` | T-shirt and Jeans | wearing a simple fitted T-shirt and straight-leg jeans | casual baseline |
| `outfit.base.simple_dress` | Simple Dress | wearing a simple knee-length day dress with clean lines | simple fashion/story baseline |
| `outfit.base.blazer_trousers` | Blazer and Trousers | wearing a clean tailored blazer with straight trousers | commercial/professional |
| `outfit.base.hoodie_pants` | Hoodie and Pants | wearing a simple hoodie with relaxed pants | street/casual |
| `outfit.base.shirt_skirt` | Shirt and Skirt | wearing a neat shirt with a simple knee-length skirt | fashion/commercial |
| `outfit.base.activewear_set` | Activewear Set | wearing a modest athletic top with full-length activewear pants | sporty, non-sexualized |

## Visual Asset Scope

Start with one 2x3 source sheet if using six options.

If keeping all seven options, split into:

- first runtime set with six options
- second revision or non-visual dropdown for the seventh option

Recommended first visual set:

1. Modest Reference Wear
2. T-shirt and Jeans
3. Simple Dress
4. Blazer and Trousers
5. Hoodie and Pants
6. Shirt and Skirt

Activewear can remain dropdown-only until the second asset set.

## Rules

- Brand-free.
- No logos, text prints, or recognizable copyrighted outfit designs.
- No transparent clothing.
- No lingerie/bikini wording.
- Silhouette must be readable at 128x128 thumb size.
- Prompt phrase must not include color, pattern or material unless intrinsic to the garment.

## Acceptance Criteria

- Outfit Base attribute entries exist.
- Visual cards map to stable attribute IDs.
- No selected outfit base produces sexualized language.
- Uploaded outfit reference overrides outfit base prompt.
- If no outfit base is selected, fallback still uses Modest Reference Wear.
