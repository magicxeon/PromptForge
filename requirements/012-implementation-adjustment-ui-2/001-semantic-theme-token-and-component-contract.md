# Semantic Theme Token And Component Contract

**Parent:** `000-master-finalize-ux-ui-roadmap.md`

## 1. Token Layers

Use three layers:

```text
theme values      --theme-*
compatibility     --mpf-* -> var(--theme-*)
component tokens  component CSS references semantic/compatibility values
```

Required semantic families:

```text
canvas/background/raised surface
surface/surface strong/input
text/muted/inverse
border/border strong
primary/secondary/accent/action
success/warning/danger/info/focus
hover/selected/backdrop/shadow
primary gradient
```

Layout tokens such as radius, spacing, header height and content width are not
theme colors and remain under `--mpf-*`.

## 2. Component Rules

- Shared components must not assume Cyan means Primary.
- Use semantic Primary for selected/focus emphasis and Action for high-value
  commands.
- Keep status meaning stable across themes.
- Fashion light surfaces require dark readable form controls and menus.
- Media inspection backgrounds remain neutral enough to judge generated images.
- Do not create theme-specific component markup.
- Do not add route CSS overrides when a semantic token can express the intent.

## 3. Migration Scope

Initial implementation must cover:

- document/page canvas;
- AppShell header, navigation, account menu and footer;
- Community Hero and Discovery surfaces;
- Studio viewport, configurator, visual options and generation controls;
- shared `Button`;
- shared `Surface`;
- global form controls, focus and section surfaces.

Feature CSS may migrate incrementally, but any new component must use semantic
tokens from its first implementation.

## 4. Responsive And Accessibility

- Validate contrast in all three resolved themes.
- Focus indication must remain visible on light and dark surfaces.
- Status must include text/icon, not color alone.
- Theme menu must use accessible radio semantics.
- Theme changes should not animate every page property.
- Respect `prefers-reduced-motion`.

## 5. Software Design

```text
web/src/styles/tokens.css
  owns semantic defaults and compatibility aliases

web/src/styles/themes.css
  owns data-theme palette overrides only

web/src/styles/globals.css
  imports token, theme and component styles in deterministic order

web/src/components/ui/Button.tsx
web/src/components/ui/Surface.tsx
web/src/components/ui/AsyncState.tsx
web/src/components/ui/ConfirmDialog.tsx
  consume semantic tokens without theme-specific markup

web/src/styles/shell.css
  projects semantic tokens into shared application chrome
```

Do not put domain state in CSS. `data-theme` is the only theme selector exposed
by the runtime.

## 6. Implementation Plan

1. Define complete Default semantic values in `tokens.css`.
2. Map existing `--mpf-*` color variables to semantic tokens so feature
   migration can be incremental.
3. Add Fashion and Creative overrides in `themes.css`.
4. Import `themes.css` after `tokens.css` and before component style sheets.
5. Migrate shared primitives, shell chrome and Fashion Blueprint controls.
6. Keep media inspection surfaces neutral through
   `--theme-media-backdrop`.
7. Scan shared code for remaining hard-coded brand/status colors.

## 7. Impact

- No API, generation, credit or persistence payload changes.
- Existing feature CSS inherits themes through compatibility aliases.
- Feature-specific hard-coded colors remain technical debt and must be migrated
  when that feature is next owned.
