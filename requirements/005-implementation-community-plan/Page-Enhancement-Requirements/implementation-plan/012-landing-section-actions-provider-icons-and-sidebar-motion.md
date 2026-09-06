# LVI-05 Section Actions, Provider Marks And Sidebar Motion

Status: Implemented and verified in scope (2026-09-06)

Depends on: LVI-01 through LVI-04. Owner: Community for Landing sections;
AppShell for sidebar decoration. This step changes presentation only.

## Tasks

1. Add a shared presentation-only `ProviderMark` component. Map known canonical
   provider IDs (`gemini`, `openai`, `xai`, `modelark`, `meta-muse`) to distinct
   Lucide symbols, retain a generic fallback, and keep adjacent catalog names as
   the textual identity. Do not imply that symbols are official provider logos.
2. Change the Provider section signature to the theme warning/yellow family.
   Add a bounded linear color wash from the upper-left; no radial orb, pointer
   target, animated content or provider status implication.
3. Add `Explore models` to Provider heading and route to the existing Playground
   provider/model selector. It does not preselect or mutate a model.
4. Render Featured Public Work as a dark media band with white heading/eyebrow
   in every theme. Add `See all public work` linking to the existing Community
   feed anchor without issuing another query.
5. Rename Home's existing bottom pagination action to `See more Community work`.
   Reuse `DiscoveryLoadMore`; do not add a second fetch path or show an action
   when the canonical query has no next page.
6. Add a subtle animated linear color wash at the top-right of the shared
   sidebar. Keep it behind navigation, non-interactive, theme-token based and
   static when `prefers-reduced-motion: reduce` is active.
7. Add EN/TH copy, component tests, Home navigation/pagination regressions and
   browser checks for provider marks, section actions, no overflow and reduced
   motion. Inspect 390px, 820px and 1440px in all three themes.

## Protected Behavior

- Provider/model data and availability remain server catalog authority.
- Search still suppresses all editorial Landing sections and the catalog query.
- Community filtering, public visibility, featured deduplication, pagination,
  retry, cards and route behavior are unchanged.
- Sidebar scrolling, collapse, mobile drawer, focus order and click targets are
  unchanged. Decoration must never overlay scrollbar or navigation interaction.
- Other discovery page heroes and section styling remain unchanged.

## Verification Gate

Run ProviderMark/ProviderDirectory/Home/Sidebar focused tests separately, i18n
validation, scoped lint, production build and Home layout screenshots. Use the
existing Home browser script rather than a full-system test. Record evidence in
the LVI master before marking this step passed.

## Gradient Refinement (2026-09-06)

Scope: CSS-only correction owned by AppShell and Community Home. Preserve all
layout, navigation, card imagery, actions, scrollbars and provider behavior.

1. Replace the cropped sidebar wash with a full-width, violet-accent wash in
   Momelo Neon. Fade slightly diagonally from top to bottom, reaching complete
   transparency before the decoration ends. Animate opacity only so movement
   cannot expose a rectangular edge; preserve reduced-motion handling.
2. Add a theme-token gradient from the Home hero's upper-left toward its lower
   right. Keep it above the backdrop photo but below floating images and copy.
   Do not change other discovery heroes or replace the media background.
3. Verify Home at 390px, 820px and 1440px in all themes, inspect screenshots,
   and retain reduced-motion, overflow and interaction checks. No provider calls.

Validation: Production build and Home browser checks passed at all nine
viewport/theme combinations, including reduced motion and layout bounds.
Screenshots: `C:/Users/punya/AppData/Local/Temp/community-page-layout-7NgM0G`.
Visual inspection covered desktop Neon, mobile Neon and tablet Pearl: sidebar
wash fades without the previous rectangular cutoff; hero wash stays below
floating images and readable copy. Mobile drawer-open visual state was not
separately captured. No new unit tests for this CSS-only change.

### Sidebar Gutter Follow-up

The initial refinement left the reserved scrollbar gutter unpainted. Paint the
wash as the sidebar's own background with border-box positioning, including
the gutter, instead of a child pseudo-element. Preserve the stable gutter,
hover scrollbar, navigation and hero. Replace opacity animation with a bounded
18px upward background drift (no repeat, no exposed top edge); reduced motion
remains static. Verify edge coverage in a desktop screenshot and rerun the
focused Home layout checks.

Validation: Build and nine Home viewport/theme checks passed, including reduced
motion. Desktop Neon screenshot confirms the upper-right gutter now shares the
gradient with no unpainted strip. Evidence:
`C:/Users/punya/AppData/Local/Temp/community-page-layout-DqpKQ3`.

### Sidebar Gutter Follow-up

The initial refinement left the reserved scrollbar gutter unpainted. Paint the
wash as the sidebar's own background with border-box positioning, including
the gutter, instead of a child pseudo-element. Preserve the stable gutter,
hover scrollbar, navigation and hero. Replace opacity animation with a bounded
18px upward background drift (no repeat, no exposed top edge); reduced motion
remains static. Verify edge coverage in a desktop screenshot and rerun the
focused Home layout checks. Validation pending.
