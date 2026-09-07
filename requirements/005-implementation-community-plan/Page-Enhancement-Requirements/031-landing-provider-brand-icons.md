# Landing Provider Brand Icons

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Owner: shared provider-mark presentation; Community Landing is the consumer.
Execution: [plan 032](implementation-plan/032-landing-provider-icons.md).

## Scope

Replace generic Lucide provider substitutes in Landing's provider directory
with the silhouettes/outline shapes in the supplied PNGs. Keep the current
section accent, mark background/border, size, model lists, actions and provider
availability. All other Landing design remains paused.

## Verified Asset Mapping

Source directory: `../Page-Enhancement-resources/provider-icon/`.

| Catalog provider ID | Source file | Read dimensions |
|---|---|---|
| `gemini` | `Gemini-Ai-Logo--Streamline-Logos.png` | 24x24 |
| `openai` | `Openai--Streamline-Simple-Icons.png` | 24x24 |
| `xai` | `Grok-Ai-Logo--Streamline-Ultimate.png` | 48x48 |
| `modelark` | `BytePlus-Openai--Streamline-Simple-Icons.png` | 408x408 |
| `meta-muse` | `Meta-Logo--Streamline-Ultimate.png` | 24x24 |

All five have transparent corner pixels. BytePlus's transparent pixel RGB data
is not an opaque green background; alpha must be honored. These are user-supplied
references, not a claim that their third-party distribution rights were audited.
Record asset provenance/any supplied attribution; obtain required license terms
before distribution if their provenance is insufficient.

## Rendering Contract

1. Reuse `web/src/components/generation/ProviderMark.tsx`; current only runtime
   consumer is CommunityProviderDirectory. Keep normalized provider ID/fallback.
2. Prefer same-origin CSS alpha masks over recolored bitmap variants: transparent
   background, logo shape painted with `currentColor`, `mask-mode: alpha`,
   contain/no-repeat/center and browser-compatible mask properties.
   "Outline" means supplied monochrome logo geometry, not hand-redrawn logos
   or an invented thin stroke that destroys recognizable shapes.
3. Preserve `.community-provider .provider-mark` current color inheritance from
   `--section-accent`. Do not introduce each provider's corporate color palette.
4. Target existing 18px visible artwork in 34px mark frame. Equal optical scale
   and padding; no stretching or enlarged blurry 24px sources. If larger assets
   become necessary, request vector/higher-resolution originals as Pending.
5. Copy approved source assets into `client/assets/providers/` only during
   implementation; do not serve the requirements folder or depend on an external
   logo CDN. Keep authoring originals untouched. Do not edit images this doc pass.
6. Logos are decorative next to the visible provider name (`aria-hidden`). Unknown
   provider has existing neutral Boxes fallback, never another provider's logo.
7. Account for missing asset/mask failure with a tested fallback. Updating the
   container must not let the broad `summary > span` flex rule stretch the mark.

## Acceptance

- `PBI-01`: All five catalog IDs map to their supplied shape, not generic AI icons.
- `PBI-02`: Shapes inherit the existing section color in all three themes.
- `PBI-03`: Transparency and padding render correctly; no colored PNG background,
  stretching, blank marks or card alignment change.
- `PBI-04`: Unknown/missing asset fallback and provider names remain readable.
- `PBI-05`: Catalog filters/expand/collapse/availability and other Landing sections
  are unchanged; no provider configuration file is edited.

Test with component mappings and actual browser mask/pixel inspection, not DOM
presence alone. Rollback the asset mapping/render variant only; no data migration.
