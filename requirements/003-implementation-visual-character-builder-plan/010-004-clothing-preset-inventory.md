# 010-004 Clothing Option System and Outfit Preset Inventory

**Status:** Scope Revision - Modular Clothing MVP  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001, 010-002

## Objective

Define a modular clothing option system for Character Sheet Builder when the user does not upload front/back outfit references.

The clothing MVP should let users choose:

- clothing form / outfit type
- pattern
- color
- optional material surface

The goal is to provide enough imagination for character design without becoming a full fashion product configurator in the first release.

## Sub Requirements

| File | Purpose |
| --- | --- |
| `010-004-001-outfit-base-mvp-options.md` | first Outfit Base option set |
| `010-004-002-pattern-and-material-options.md` | pattern and material MVP |
| `010-004-003-clothing-color-system.md` | primary/secondary color system |
| `010-004-004-modest-default-fallback.md` | safe fallback when no clothing is selected |
| `010-004-005-clothing-source-priority-and-cleanup.md` | prompt source priority and cleanup rules |

## Product Intent

Clothing in Character Sheet mode is not a scene styling system. It is a reusable character identity layer for:

- multi-angle character sheet generation
- later Story Mode continuity
- commercial/fashion iteration
- clear model reference output

Clothing choices must remain brand-free, easy to understand visually, and stable enough to reproduce across front/side/back views.

## MVP Scope

### Included

| Area | Control | Purpose |
| --- | --- | --- |
| Outfit Base | Visual card picker | choose the main clothing form |
| Pattern | Visual card picker or swatch pattern | add personality without complex editing |
| Primary Color | Color picker | main garment color |
| Secondary Color | Color picker | trim/accent/pattern color |
| Material / Surface | Small visual picker | cotton, denim, satin, knit, leather-like, etc. |
| Modest Default Underwear | Hidden fallback / visible baseline option | safe fallback when no outfit is selected |

### Deferred

| Area | Reason |
| --- | --- |
| Full garment layering editor | too complex for MVP |
| Detailed accessory system | can become its own module |
| Brand/logo placement | copyright and safety risk |
| Exact pattern placement controls | requires advanced garment mapping |
| Per-garment sleeve/neckline/hem controls | useful later, but too granular now |
| AI clothing parsing from text | keep AI scope out for now |

## Default Clothing Rule

If the user does not choose any clothing option and does not upload outfit references, Character Sheet mode must use a modest, non-revealing baseline.

Preferred fallback wording:

```text
wearing modest neutral character reference undergarments, a simple opaque light gray sports-bra style top and matching mid-thigh fitted shorts, non-revealing, clean and practical for character sheet visibility
```

Rules:

- must not look erotic
- must not use transparent, lace, lingerie, bikini, or revealing wording
- must be practical and neutral
- should allow body silhouette visibility without being provocative
- should work for adult male/female silhouettes using provider-safe wording

Provider-safe shorter wording:

```text
wearing modest neutral fitted reference clothing, opaque light gray top and mid-thigh shorts, non-revealing
```

## MVP Presets

Outfit Base starts small and clear.

| Preset ID Draft | Label | Purpose |
| --- | --- | --- |
| `outfit.base.modest_reference` | Modest Reference Wear | safe fallback / baseline |
| `outfit.base.tshirt_jeans` | T-shirt and Jeans | casual story baseline |
| `outfit.base.simple_dress` | Simple Dress | simple fashion/story baseline |
| `outfit.base.blazer_trousers` | Blazer and Trousers | commercial/professional |
| `outfit.base.hoodie_pants` | Hoodie and Pants | street/casual |
| `outfit.base.shirt_skirt` | Shirt and Skirt | fashion/commercial baseline |
| `outfit.base.activewear_set` | Activewear Set | sporty baseline without sexualized language |

## Character Sheet Baseline

Replace hidden fallback wording with a visible preset.

Preferred wording:

```text
wearing a plain white tank top and simple white shorts for clear character sheet visibility
```

Avoid:

```text
tight
to clearly show body shape and physique
```

This older wording remains acceptable only as a migration phrase. New prompt output should use the more modest fallback wording above.

## Clothing Fields

| Field | Control | Notes |
| --- | --- | --- |
| Outfit Base | Visual card picker | main selector |
| Pattern | Visual card picker | none, solid, stripes, plaid, floral, geometric |
| Primary Color | Native color picker | main garment color |
| Secondary Color | Native color picker | trim/accent/pattern color |
| Material / Surface | Visual card or swatch pattern | cotton, denim, knit, satin, leather-like, wool |

## Pattern MVP

| Pattern ID Draft | Label | Prompt Phrase |
| --- | --- | --- |
| `outfit.pattern.solid` | Solid | solid color fabric |
| `outfit.pattern.subtle_stripe` | Subtle Stripe | subtle vertical stripe pattern |
| `outfit.pattern.plaid` | Plaid | clean plaid fabric pattern |
| `outfit.pattern.floral` | Floral | small tasteful floral pattern |
| `outfit.pattern.geometric` | Geometric | simple geometric fabric pattern |
| `outfit.pattern.color_block` | Color Block | clean two-tone color block design |

Pattern rules:

- Pattern must describe garment fabric, not background.
- Pattern prompt must be short.
- Pattern should not introduce brand, logo, or text.
- If pattern is not selected, use solid or no pattern language.

## Color MVP

Use native color picker controls, not generated image files and not preset swatch cards.

Suggested initial palette:

| Color | Purpose |
| --- | --- |
| white / light gray | reference baseline |
| black | commercial neutral |
| navy | professional neutral |
| beige / camel | fashion neutral |
| denim blue | casual |
| soft pink | feminine fashion |
| red | bold commercial |
| forest green | lifestyle |
| lavender | soft fashion |
| warm brown | natural/commercial |

Suggested starter tones may be used as default picker values or documentation references only, not as fixed MVP UI options.

Color rules:

- Primary color applies to the dominant garment.
- Secondary color applies to pattern/trim/accent only.
- If no secondary color is selected, do not add secondary color language.
- Color prompts must avoid duplicating outfit base phrases.
- Pattern and Material swatches should use grayscale preview tones so they do not compete with the selected garment color.

## Material MVP

| Material ID Draft | Label | Prompt Phrase |
| --- | --- | --- |
| `outfit.material.cotton` | Cotton | matte cotton fabric |
| `outfit.material.denim` | Denim | structured denim fabric |
| `outfit.material.knit` | Knit | soft knit fabric texture |
| `outfit.material.satin` | Satin | subtle satin sheen |
| `outfit.material.wool` | Wool | soft wool blend texture |
| `outfit.material.leather_like` | Leather-like | smooth leather-like material, brand-free |

Material rules:

- Material is optional.
- Avoid intense shine unless explicitly chosen.
- Material must not conflict with outfit base. Example: denim material can apply to jeans, but should not force a denim blazer unless the user selected it.

## Prompt Assembly Order

Clothing prompt should compile in this order:

```text
Outfit Base + Primary Color + Secondary Color if selected + Pattern if selected + Material if selected
```

Example:

```text
wearing a simple fitted T-shirt and straight-leg jeans, navy primary color, white trim accents, subtle vertical stripe pattern on the top, matte cotton fabric
```

Cleanup rules:

- Remove duplicate color phrases.
- Do not mention pattern if `solid` or empty.
- Do not mention secondary color if no secondary role exists.
- Do not include uploaded outfit reference text when using preset options.

## Rules

- Presets must be brand-free.
- Presets should be simple enough for multi-angle sheet consistency.
- Color overrides should not duplicate prompt phrases.
- Uploaded outfit references disable or override preset outfit text.
- Default fallback clothing must be modest and non-revealing.
- Clothing module must be reusable by Story Mode as semantic metadata.

## Code Optimization Requirement

Do not grow `app.js` or `formRenderer.js` with clothing-specific conditionals unless unavoidable.

Preferred module plan:

| Module | Responsibility |
| --- | --- |
| `client/clothing/clothingOptionRules.js` | field visibility and dependency rules |
| `client/clothing/clothingPromptParts.js` | client preview assembly helpers |
| `server/clothing/clothingPromptParts.js` | server canonical compiler helpers |
| shared data JSON | outfit base, pattern, material, color definitions |

Rules:

- UI visual controls should consume manifests/config data.
- Prompt compiler should consume semantic selections.
- Clothing dependency rules should be data-driven where practical.
- Avoid one-off branching per outfit base in the renderer.
- Runtime assets should be thumb-only unless a shipped UI needs larger previews.

## Acceptance Criteria

- First preset set is small and practical.
- Every preset supports clean sheet generation.
- Presets support later Story Mode reuse.
- User can create visible variety through outfit base, color, pattern and material.
- No outfit selection falls back to modest reference clothing.
- Clothing code is modular enough to extend without bloating core files.

## Implementation Log

### 2026-07-18 - Outfit Preset Baseline

- Added `Outfit Preset` as the first field in the Clothing section.
- Added five brand-free MVP outfit presets:
  - `outfit.preset.sheet_baseline`
  - `outfit.preset.casual_tshirt_jeans`
  - `outfit.preset.simple_dress`
  - `outfit.preset.blazer_trousers`
  - `outfit.preset.hoodie_pants`
- Preset wording is neutral and sheet-friendly.
- Preserved the existing Character Sheet fallback phrase when no clothing selection exists, so older/sparse configs still generate usable sheets.
- Added `Outfit Preset` to client and server field-category maps.

Deferred:

- Outfit visual-card images/icons are not generated in this step.
- Color visibility per preset remains future UI work; existing clothing color overrides are left unchanged.
